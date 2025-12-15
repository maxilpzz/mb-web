import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLiability, calculateExpectedProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet } from '@/lib/calculations'

// GET: Obtener todas las operaciones
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('personId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (personId) where.personId = personId
    if (status) where.status = status

    const operations = await prisma.operation.findMany({
      where,
      include: {
        person: true,
        bets: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular totales por operación
    const operationsWithTotals = operations.map(op => {
      const totalProfit = op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0)
      const totalLiability = op.bets.reduce((sum, bet) => sum + bet.liability, 0)
      const pendingBets = op.bets.filter(bet => bet.result === null).length

      return {
        ...op,
        totalProfit,
        totalLiability,
        pendingBets
      }
    })

    return NextResponse.json(operationsWithTotals)
  } catch (error) {
    console.error('Error fetching operations:', error)
    return NextResponse.json({ error: 'Error al obtener operaciones' }, { status: 500 })
  }
}

// POST: Crear una nueva operación con apuestas
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { personId, bookmaker, bonusType, bizumReceived, bets, notes } = body

    if (!personId || !bookmaker || !bonusType) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Crear operación con apuestas
    const operation = await prisma.operation.create({
      data: {
        personId,
        bookmaker,
        bonusType,
        bizumReceived: bizumReceived || 0,
        notes,
        status: 'in_progress',
        bets: {
          create: bets?.map((bet: { betType: string; stake: number; oddsBack: number; oddsLay: number; eventName?: string; eventDate?: string }) => {
            const layStake = bet.betType === 'qualifying'
              ? calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
              : calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)
            const liability = calculateLiability(layStake, bet.oddsLay)
            const expectedProfit = calculateExpectedProfit(bet.stake, bet.oddsBack, bet.oddsLay, bet.betType as 'qualifying' | 'freebet')

            return {
              betType: bet.betType,
              stake: bet.stake,
              oddsBack: bet.oddsBack,
              oddsLay: bet.oddsLay,
              liability,
              expectedProfit,
              eventName: bet.eventName,
              eventDate: bet.eventDate ? new Date(bet.eventDate) : null
            }
          }) || []
        }
      },
      include: {
        person: true,
        bets: true
      }
    })

    return NextResponse.json(operation, { status: 201 })
  } catch (error) {
    console.error('Error creating operation:', error)
    return NextResponse.json({ error: 'Error al crear operación' }, { status: 500 })
  }
}
