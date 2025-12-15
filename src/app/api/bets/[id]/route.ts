import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateQualifyingProfit, calculateFreeBetProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet } from '@/lib/calculations'

// PATCH: Actualizar resultado de apuesta
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { result } = body

    if (!result || !['won', 'lost'].includes(result)) {
      return NextResponse.json({ error: 'Resultado inválido' }, { status: 400 })
    }

    // Obtener la apuesta actual
    const bet = await prisma.bet.findUnique({
      where: { id }
    })

    if (!bet) {
      return NextResponse.json({ error: 'Apuesta no encontrada' }, { status: 404 })
    }

    // Calcular el beneficio real
    const layStake = bet.betType === 'qualifying'
      ? calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
      : calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)

    const actualProfit = bet.betType === 'qualifying'
      ? calculateQualifyingProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')
      : calculateFreeBetProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')

    // Actualizar la apuesta
    const updatedBet = await prisma.bet.update({
      where: { id },
      data: {
        result,
        actualProfit
      },
      include: {
        operation: true
      }
    })

    // Verificar si todas las apuestas de la operación están completadas
    const allBets = await prisma.bet.findMany({
      where: { operationId: updatedBet.operationId }
    })

    const allCompleted = allBets.every(b => b.result !== null)
    if (allCompleted) {
      await prisma.operation.update({
        where: { id: updatedBet.operationId },
        data: { status: 'completed' }
      })
    }

    return NextResponse.json(updatedBet)
  } catch (error) {
    console.error('Error updating bet:', error)
    return NextResponse.json({ error: 'Error al actualizar apuesta' }, { status: 500 })
  }
}
