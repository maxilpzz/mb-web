import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateQualifyingProfit, calculateFreeBetProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet } from '@/lib/calculations'

const COMMISSION = 0.02 // 2% comisión del exchange (Betfair)

// PATCH: Actualizar resultado de apuesta
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { result, actualProfit: manualProfit } = body

    // Obtener la apuesta actual
    const bet = await prisma.bet.findUnique({
      where: { id }
    })

    if (!bet) {
      return NextResponse.json({ error: 'Apuesta no encontrada' }, { status: 404 })
    }

    // Si la apuesta ya tenía resultado, no actualizar el saldo del exchange otra vez
    const alreadyResolved = bet.result !== null

    // Detectar si es una apuesta manual (sin cuotas de lay)
    const isManualBet = bet.oddsBack === 0 || bet.oddsLay === 0

    let actualProfit: number
    let finalResult: 'won' | 'lost'

    if (isManualBet && manualProfit !== undefined) {
      // Apuesta manual: el profit se pasa directamente
      actualProfit = manualProfit
      // Si ganó algo, "won" para que se muestre verde, si no "lost"
      finalResult = manualProfit > 0 ? 'won' : 'lost'
    } else if (result && ['won', 'lost'].includes(result)) {
      // Apuesta con lay: calcular profit basándose en el resultado
      const layStake = bet.betType === 'qualifying'
        ? calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
        : calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)

      actualProfit = bet.betType === 'qualifying'
        ? calculateQualifyingProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')
        : calculateFreeBetProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')
      finalResult = result as 'won' | 'lost'
    } else {
      return NextResponse.json({ error: 'Resultado o profit requerido' }, { status: 400 })
    }

    // Actualizar la apuesta
    const updatedBet = await prisma.bet.update({
      where: { id },
      data: {
        result: finalResult,
        actualProfit
      },
      include: {
        operation: true
      }
    })

    // Actualizar saldo del exchange automáticamente (solo si no estaba ya resuelto y NO es manual)
    if (!alreadyResolved && !isManualBet) {
      const layStake = bet.betType === 'qualifying'
        ? calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
        : calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)

      let exchangeChange = 0

      if (finalResult === 'won') {
        // Ganó en la casa: perdiste la liability en el exchange
        exchangeChange = -bet.liability
      } else {
        // Perdió en la casa: ganaste en el exchange
        exchangeChange = layStake * (1 - COMMISSION)
      }

      // Obtener settings actual y actualizar
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
      if (settings) {
        await prisma.settings.update({
          where: { id: 'global' },
          data: {
            exchangeBalance: settings.exchangeBalance + exchangeChange
          }
        })
      }
    }

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
