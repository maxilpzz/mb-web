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

    // Verificar el estado de la operación basándose en las apuestas
    const allBets = await prisma.bet.findMany({
      where: { operationId: updatedBet.operationId }
    })

    const qualifyingBets = allBets.filter(b => b.betType === 'qualifying')
    const freebetBets = allBets.filter(b => b.betType === 'freebet')

    const allQualifyingCompleted = qualifyingBets.every(b => b.result !== null)
    const allFreebetsCompleted = freebetBets.every(b => b.result !== null)

    let newStatus: string | null = null

    if (allQualifyingCompleted && allFreebetsCompleted) {
      // Todas las apuestas completadas
      newStatus = 'completed'
    } else if (allQualifyingCompleted && freebetBets.length > 0) {
      // Qualifying completadas, pero hay freebets pendientes
      newStatus = 'freebet'
    } else if (qualifyingBets.some(b => b.result !== null)) {
      // Al menos una qualifying tiene resultado
      newStatus = 'qualifying'
    }

    if (newStatus) {
      await prisma.operation.update({
        where: { id: updatedBet.operationId },
        data: { status: newStatus }
      })
    }

    return NextResponse.json(updatedBet)
  } catch (error) {
    console.error('Error updating bet:', error)
    return NextResponse.json({ error: 'Error al actualizar apuesta' }, { status: 500 })
  }
}
