import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateLiability, calculateExpectedProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet } from '@/lib/calculations'
import { getCurrentUser } from '@/lib/supabase/server'

// POST: Añadir una apuesta a una operación existente
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { betType, betNumber, stake, oddsBack, oddsLay, eventName, eventDate } = body

    if (!betType || stake === undefined || stake === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Las cuotas pueden ser 0 para apuestas manuales (sin igualar)
    const finalOddsBack = oddsBack ?? 0
    const finalOddsLay = oddsLay ?? 0

    // Verificar que la operación existe
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: { bets: true }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    // Verificar que la operación pertenece al usuario
    if (operation.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Calcular el número de apuesta si no se proporciona
    const existingBetsOfType = operation.bets.filter(b => b.betType === betType)
    const newBetNumber = betNumber || existingBetsOfType.length + 1

    // Calcular liability y beneficio esperado (solo si hay cuotas)
    let layStake = 0
    let liability = 0
    let expectedProfit = 0

    if (finalOddsBack > 0 && finalOddsLay > 0) {
      layStake = betType === 'qualifying'
        ? calculateLayStakeQualifying(stake, finalOddsBack, finalOddsLay)
        : calculateLayStakeFreeBet(stake, finalOddsBack, finalOddsLay)
      liability = calculateLiability(layStake, finalOddsLay)
      expectedProfit = calculateExpectedProfit(stake, finalOddsBack, finalOddsLay, betType as 'qualifying' | 'freebet')
    }

    // Crear la apuesta
    const bet = await prisma.bet.create({
      data: {
        operationId: id,
        betType,
        betNumber: newBetNumber,
        stake,
        oddsBack: finalOddsBack,
        oddsLay: finalOddsLay,
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
