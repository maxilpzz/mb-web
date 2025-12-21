import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  calculateLayStakeQualifying,
  calculateLayStakeFreeBet,
  calculateLiability,
  calculateExpectedProfit,
  calculateQualifyingProfit,
  calculateFreeBetProfit
} from '@/lib/calculations'

// POST: Recalcular todas las apuestas con la fórmula correcta
export async function POST() {
  try {
    // Obtener todas las apuestas con cuotas (no manuales)
    const bets = await prisma.bet.findMany({
      where: {
        AND: [
          { oddsBack: { gt: 0 } },
          { oddsLay: { gt: 0 } }
        ]
      }
    })

    let updated = 0
    const changes: { id: string; oldLiability: number; newLiability: number; diff: number }[] = []

    for (const bet of bets) {
      // Recalcular layStake
      const layStake = bet.betType === 'qualifying'
        ? calculateLayStakeQualifying(bet.stake, bet.oddsBack, bet.oddsLay)
        : calculateLayStakeFreeBet(bet.stake, bet.oddsBack, bet.oddsLay)

      // Recalcular liability
      const newLiability = calculateLiability(layStake, bet.oddsLay)

      // Recalcular expectedProfit
      const newExpectedProfit = calculateExpectedProfit(
        bet.stake,
        bet.oddsBack,
        bet.oddsLay,
        bet.betType as 'qualifying' | 'freebet'
      )

      // Si tiene resultado, recalcular actualProfit
      let newActualProfit = bet.actualProfit
      if (bet.result) {
        newActualProfit = bet.betType === 'qualifying'
          ? calculateQualifyingProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, bet.result as 'won' | 'lost')
          : calculateFreeBetProfit(bet.stake, bet.oddsBack, layStake, bet.oddsLay, bet.result as 'won' | 'lost')
      }

      // Solo actualizar si hay diferencia significativa
      const diff = Math.abs(bet.liability - newLiability)
      if (diff > 0.01) {
        changes.push({
          id: bet.id,
          oldLiability: bet.liability,
          newLiability,
          diff
        })

        await prisma.bet.update({
          where: { id: bet.id },
          data: {
            liability: newLiability,
            expectedProfit: newExpectedProfit,
            actualProfit: newActualProfit
          }
        })

        updated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculadas ${updated} de ${bets.length} apuestas`,
      total: bets.length,
      updated,
      changes
    })
  } catch (error) {
    console.error('Error recalculating bets:', error)
    return NextResponse.json({ error: 'Error al recalcular apuestas' }, { status: 500 })
  }
}
