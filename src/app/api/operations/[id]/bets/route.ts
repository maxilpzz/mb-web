import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLiability, calculateExpectedProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet } from '@/lib/calculations'

// POST: Añadir una apuesta a una operación existente
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { betType, betNumber, stake, oddsBack, oddsLay, eventName, eventDate } = body

    if (!betType || !stake || !oddsBack || !oddsLay) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verificar que la operación existe
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: { bets: true }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    // Calcular el número de apuesta si no se proporciona
    const existingBetsOfType = operation.bets.filter(b => b.betType === betType)
    const newBetNumber = betNumber || existingBetsOfType.length + 1

    // Calcular liability y beneficio esperado
    const layStake = betType === 'qualifying'
      ? calculateLayStakeQualifying(stake, oddsBack, oddsLay)
      : calculateLayStakeFreeBet(stake, oddsBack, oddsLay)
    const liability = calculateLiability(layStake, oddsLay)
    const expectedProfit = calculateExpectedProfit(stake, oddsBack, oddsLay, betType as 'qualifying' | 'freebet')

    // Crear la apuesta
    const bet = await prisma.bet.create({
      data: {
        operationId: id,
        betType,
        betNumber: newBetNumber,
        stake,
        oddsBack,
        oddsLay,
        liability,
        expectedProfit,
        eventName,
        eventDate: eventDate ? new Date(eventDate) : null
      }
    })

    // Actualizar el estado de la operación si es necesario
    if (operation.status === 'completed' && betType === 'freebet') {
      await prisma.operation.update({
        where: { id },
        data: { status: 'freebet' }
      })
    }

    return NextResponse.json(bet, { status: 201 })
  } catch (error) {
    console.error('Error adding bet:', error)
    return NextResponse.json({ error: 'Error al añadir apuesta' }, { status: 500 })
  }
}
