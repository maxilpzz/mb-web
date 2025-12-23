import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateQualifyingProfit, calculateFreeBetProfit, calculateRefundProfit, calculateLayStakeQualifying, calculateLayStakeFreeBet, calculateLayStakeRefund } from '@/lib/calculations'
import { getCurrentUser } from '@/lib/supabase/server'

const COMMISSION = 0.02 // 2% comisión del exchange (Betfair)

// PATCH: Actualizar resultado de apuesta
export async function PATCH(
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
    const { result, actualProfit: manualProfit } = body

    // Obtener la apuesta actual con su operación y bookmaker para verificar ownership y tipo de bono
    const bet = await prisma.bet.findUnique({
      where: { id },
      include: {
        operation: {
          include: { bookmaker: true }
        }
      }
    })

    if (!bet) {
      return NextResponse.json({ error: 'Apuesta no encontrada' }, { status: 404 })
    }

    // Verificar que la operación pertenece al usuario
    if (bet.operation.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
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
      const isRefundBet = bet.betType === 'qualifying' && bet.operation.bookmaker.bonusType === 'only_if_lost'
      const retention = bet.operation.bookmaker.freebetRetention || 0.75

      let layStake: number
      if (isRefundBet) {
        layStake = calculateLayStakeRefund(bet.stake, bet.oddsBack, bet.oddsLay, retention)
      } else if (bet.betType === 'qualifying') {
        layStake = calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
      } else {
        layStake = calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)
      }

      if (isRefundBet) {
        // Para apuestas de reembolso, usar la fórmula especial
        // Si gana: profit alto (no hay freebet)
        // Si pierde: profit negativo, pero recibirás freebet que se contabiliza aparte
        actualProfit = calculateRefundProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')
      } else if (bet.betType === 'qualifying') {
        actualProfit = calculateQualifyingProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')
      } else {
        actualProfit = calculateFreeBetProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, result as 'won' | 'lost')
      }
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
      const isRefundBetForExchange = bet.betType === 'qualifying' && bet.operation.bookmaker.bonusType === 'only_if_lost'
      const retentionForExchange = bet.operation.bookmaker.freebetRetention || 0.75

      let layStakeForExchange: number
      if (isRefundBetForExchange) {
        layStakeForExchange = calculateLayStakeRefund(bet.stake, bet.oddsBack, bet.oddsLay, retentionForExchange)
      } else if (bet.betType === 'qualifying') {
        layStakeForExchange = calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
      } else {
        layStakeForExchange = calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)
      }

      let exchangeChange = 0

      if (finalResult === 'won') {
        // Ganó en la casa: perdiste la liability en el exchange
        exchangeChange = -bet.liability
      } else {
        // Perdió en la casa: ganaste en el exchange
        exchangeChange = layStakeForExchange * (1 - COMMISSION)
      }

      // Obtener settings del usuario actual y actualizar
      const settings = await prisma.settings.findFirst({ where: { userId: user.id } })
      if (settings) {
        await prisma.settings.update({
          where: { id: settings.id },
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

// DELETE: Eliminar una apuesta individual
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Obtener la apuesta con su operación para verificar ownership
    const bet = await prisma.bet.findUnique({
      where: { id },
      include: {
        operation: true
      }
    })

    if (!bet) {
      return NextResponse.json({ error: 'Apuesta no encontrada' }, { status: 404 })
    }

    // Verificar que la operación pertenece al usuario
    if (bet.operation.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Eliminar la apuesta
    await prisma.bet.delete({
      where: { id }
    })

    // Actualizar el estado de la operación si es necesario
    const remainingBets = await prisma.bet.findMany({
      where: { operationId: bet.operationId }
    })

    const qualifyingBets = remainingBets.filter(b => b.betType === 'qualifying')
    const freebetBets = remainingBets.filter(b => b.betType === 'freebet')

    const allQualifyingCompleted = qualifyingBets.length === 0 || qualifyingBets.every(b => b.result !== null)
    const allFreebetsCompleted = freebetBets.length === 0 || freebetBets.every(b => b.result !== null)

    let newStatus: string

    if (remainingBets.length === 0) {
      // Sin apuestas, volver a pending
      newStatus = 'pending'
    } else if (allQualifyingCompleted && allFreebetsCompleted) {
      newStatus = 'completed'
    } else if (allQualifyingCompleted && freebetBets.length > 0) {
      newStatus = 'freebet'
    } else if (qualifyingBets.some(b => b.result !== null)) {
      newStatus = 'qualifying'
    } else {
      newStatus = 'pending'
    }

    await prisma.operation.update({
      where: { id: bet.operationId },
      data: { status: newStatus }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bet:', error)
    return NextResponse.json({ error: 'Error al eliminar apuesta' }, { status: 500 })
  }
}
