import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLiability, calculateExpectedProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet } from '@/lib/calculations'
import { getCurrentUser } from '@/lib/supabase/server'

// GET: Obtener todas las operaciones
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('personId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { userId: user.id }
    if (personId) where.personId = personId
    if (status) where.status = status

    const operations = await prisma.operation.findMany({
      where,
      include: {
        person: true,
        bookmaker: true,
        deposits: true,
        bets: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular totales por operación
    const operationsWithTotals = operations.map(op => {
      const totalProfit = op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0)
      // Solo contar liability de apuestas PENDIENTES (sin resultado)
      const totalLiability = op.bets
        .filter(bet => bet.result === null)
        .reduce((sum, bet) => sum + bet.liability, 0)
      const pendingBets = op.bets.filter(bet => bet.result === null).length
      const totalDeposited = op.deposits.reduce((sum, dep) => sum + dep.amount, 0)

      return {
        ...op,
        totalProfit,
        totalLiability,
        pendingBets,
        totalDeposited
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { personId, bookmakerId, bizumSent, moneyReturned, commissionPaid, deposits, bets, notes } = body

    if (!personId || !bookmakerId) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verificar si ya existe una operación con esta persona y casa de apuestas
    const existingOperation = await prisma.operation.findFirst({
      where: {
        userId: user.id,
        personId,
        bookmakerId
      },
      include: {
        person: true,
        bookmaker: true
      }
    })

    if (existingOperation) {
      return NextResponse.json({
        error: `${existingOperation.person.name} ya tiene una operación con ${existingOperation.bookmaker.name}`
      }, { status: 400 })
    }

    // Verificar que la casa de apuestas existe
    const bookmaker = await prisma.bookmaker.findUnique({
      where: { id: bookmakerId }
    })

    if (!bookmaker) {
      return NextResponse.json({ error: 'Casa de apuestas no encontrada' }, { status: 404 })
    }

    // Crear operación con depósitos y apuestas
    const operation = await prisma.operation.create({
      data: {
        userId: user.id,
        personId,
        bookmakerId,
        bizumSent: bizumSent || 0,
        moneyReturned: moneyReturned || 0,
        commissionPaid: commissionPaid || 0,
        notes,
        status: 'pending',
        deposits: {
          create: deposits?.map((dep: { amount: number; depositNum: number }) => ({
            amount: dep.amount,
            depositNum: dep.depositNum,
            completed: false
          })) || []
        },
        bets: {
          create: bets?.map((bet: {
            betType: string;
            betNumber?: number;
            stake: number;
            oddsBack: number;
            oddsLay: number;
            eventName?: string;
            eventDate?: string
          }) => {
            const layStake = bet.betType === 'qualifying'
              ? calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
              : calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)
            const liability = calculateLiability(layStake, bet.oddsLay)
            const expectedProfit = calculateExpectedProfit(bet.stake, bet.oddsBack, bet.oddsLay, bet.betType as 'qualifying' | 'freebet')

            return {
              betType: bet.betType,
              betNumber: bet.betNumber || 1,
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
        bookmaker: true,
        deposits: true,
        bets: true
      }
    })

    return NextResponse.json(operation, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating operation:', error)

    // Manejar error de constraint único de Prisma
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({
        error: 'Esta persona ya tiene una operación con esta casa de apuestas'
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Error al crear operación' }, { status: 500 })
  }
}
