import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const startDate = new Date(year, 0, 1) // 1 de enero
    const endDate = new Date(year + 1, 0, 1) // 1 de enero del siguiente año

    // 1. Obtener todas las operaciones completadas del año
    const operations = await prisma.operation.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        person: {
          select: { name: true }
        },
        bookmaker: {
          select: { name: true }
        },
        bets: true
      }
    })

    // 2. Calcular datos del Exchange (Betfair)
    // Cuando result = 'won' (ganó en casa), perdemos en exchange (liability)
    // Cuando result = 'lost' (perdió en casa), ganamos en exchange
    let exchangeWins = 0
    let exchangeLosses = 0
    let totalLiability = 0
    let pendingBets = 0

    const allBets = operations.flatMap(op => op.bets)

    for (const bet of allBets) {
      if (bet.result === 'won') {
        // Ganó en casa = perdimos en exchange (liability)
        exchangeLosses += bet.liability
      } else if (bet.result === 'lost') {
        // Perdió en casa = ganamos en exchange
        // Ganancia = stake * (oddsBack - 1) para qualifying
        // Para freebet, ganancia es diferente (solo el lay stake - comisiones)
        if (bet.betType === 'qualifying') {
          exchangeWins += bet.stake * (bet.oddsBack - 1)
        } else {
          // Freebet: ganamos el stake apostado menos la liability
          exchangeWins += bet.stake - bet.liability
        }
      } else {
        // Pendiente
        pendingBets++
        totalLiability += bet.liability
      }
    }

    const exchangeNetResult = exchangeWins - exchangeLosses

    // 3. Calcular comisiones cobradas
    let totalCommissionsDue = 0
    let totalCommissionsPaid = 0
    const commissionsByPerson: Record<string, {
      name: string
      due: number
      paid: number
      operations: number
    }> = {}

    for (const op of operations) {
      const personName = op.person.name

      if (!commissionsByPerson[personName]) {
        commissionsByPerson[personName] = {
          name: personName,
          due: 0,
          paid: 0,
          operations: 0
        }
      }

      commissionsByPerson[personName].due += op.commission
      commissionsByPerson[personName].paid += op.commissionPaid
      commissionsByPerson[personName].operations++

      totalCommissionsDue += op.commission
      totalCommissionsPaid += op.commissionPaid
    }

    // 4. Calcular flujo de efectivo
    let totalBizumSent = 0
    let totalMoneyReturned = 0
    const cashFlowByPerson: Record<string, {
      name: string
      bizumSent: number
      moneyReturned: number
      balance: number
    }> = {}

    for (const op of operations) {
      const personName = op.person.name

      if (!cashFlowByPerson[personName]) {
        cashFlowByPerson[personName] = {
          name: personName,
          bizumSent: 0,
          moneyReturned: 0,
          balance: 0
        }
      }

      cashFlowByPerson[personName].bizumSent += op.bizumSent
      cashFlowByPerson[personName].moneyReturned += op.moneyReturned

      totalBizumSent += op.bizumSent
      totalMoneyReturned += op.moneyReturned
    }

    // Calcular balance por persona
    for (const person of Object.values(cashFlowByPerson)) {
      person.balance = person.moneyReturned - person.bizumSent
    }

    // 5. Obtener saldo actual del exchange
    const settings = await prisma.settings.findFirst({
      where: { userId: user.id }
    })
    const currentExchangeBalance = settings?.exchangeBalance || 0

    // 6. Resumen mensual para gráficos
    const monthlyData: Array<{
      month: string
      exchangeResult: number
      commissionsPaid: number
      bizumSent: number
      moneyReturned: number
    }> = []

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 1)

      const monthOps = operations.filter(op => {
        const opDate = new Date(op.createdAt)
        return opDate >= monthStart && opDate < monthEnd
      })

      let monthExchangeResult = 0
      for (const op of monthOps) {
        for (const bet of op.bets) {
          if (bet.result === 'won') {
            monthExchangeResult -= bet.liability
          } else if (bet.result === 'lost') {
            if (bet.betType === 'qualifying') {
              monthExchangeResult += bet.stake * (bet.oddsBack - 1)
            } else {
              monthExchangeResult += bet.stake - bet.liability
            }
          }
        }
      }

      monthlyData.push({
        month: new Date(year, month).toLocaleDateString('es-ES', { month: 'short' }),
        exchangeResult: monthExchangeResult,
        commissionsPaid: monthOps.reduce((sum, op) => sum + op.commissionPaid, 0),
        bizumSent: monthOps.reduce((sum, op) => sum + op.bizumSent, 0),
        moneyReturned: monthOps.reduce((sum, op) => sum + op.moneyReturned, 0)
      })
    }

    return NextResponse.json({
      year,
      exchange: {
        currentBalance: currentExchangeBalance,
        wins: exchangeWins,
        losses: exchangeLosses,
        netResult: exchangeNetResult,
        pendingBets,
        totalLiability
      },
      commissions: {
        totalDue: totalCommissionsDue,
        totalPaid: totalCommissionsPaid,
        pending: totalCommissionsDue - totalCommissionsPaid,
        byPerson: Object.values(commissionsByPerson).sort((a, b) => b.paid - a.paid)
      },
      cashFlow: {
        totalBizumSent,
        totalMoneyReturned,
        netFlow: totalMoneyReturned - totalBizumSent,
        byPerson: Object.values(cashFlowByPerson).sort((a, b) => b.balance - a.balance)
      },
      summary: {
        totalOperations: operations.length,
        completedOperations: operations.filter(op => op.status === 'completed').length,
        pendingOperations: operations.filter(op => op.status !== 'completed' && op.status !== 'cancelled').length
      },
      monthlyData
    })
  } catch (error) {
    console.error('Error fetching accounting data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de contabilidad' },
      { status: 500 }
    )
  }
}
