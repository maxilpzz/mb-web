import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateOwes } from '@/lib/calculations'
import { getCurrentUser } from '@/lib/supabase/server'

// GET: Obtener estadísticas del dashboard
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener todas las operaciones con apuestas
    const operations = await prisma.operation.findMany({
      where: { userId: user.id },
      include: {
        bets: true,
        person: true,
        bookmaker: true,
        deposits: true
      }
    })

    // Calcular estadísticas
    const totalOperations = operations.length
    const completedOperations = operations.filter(op => op.status === 'completed').length
    const pendingOperations = operations.filter(op => op.status !== 'completed' && op.status !== 'cancelled').length

    const totalProfit = operations.reduce((sum, op) => {
      return sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0)
    }, 0)

    // Calcular beneficio por ubicación (exchange vs casa)
    let profitInExchange = 0
    let profitInBookmaker = 0

    operations.forEach(op => {
      op.bets.forEach(bet => {
        if (bet.result === 'lost' && bet.actualProfit) {
          // Perdió en la casa = ganaste en exchange
          profitInExchange += bet.actualProfit
        } else if (bet.result === 'won' && bet.actualProfit) {
          // Ganó en la casa = beneficio quedó en la casa
          profitInBookmaker += bet.actualProfit
        }
      })
    })

    const totalBizumSent = operations.reduce((sum, op) => sum + op.bizumSent, 0)
    const totalMoneyReturned = operations.reduce((sum, op) => sum + op.moneyReturned, 0)
    const totalCommissionPaid = operations.reduce((sum, op) => sum + op.commissionPaid, 0)

    // Pendiente de cobro = dinero total en las casas - lo que ya te devolvieron - comisiones pagadas
    const totalMoneyInBookmaker = operations.reduce((sum, op) => {
      const owesData = calculateOwes(op.bets.map(bet => ({
        betType: bet.betType,
        stake: bet.stake,
        oddsBack: bet.oddsBack,
        oddsLay: bet.oddsLay,
        liability: bet.liability,
        result: bet.result,
        actualProfit: bet.actualProfit
      })))
      return sum + owesData.totalOwes
    }, 0)

    // Obtener total de comisiones pagadas a nivel de persona
    const allPersons = await prisma.person.findMany({
      where: { userId: user.id }
    })
    const totalPersonCommissionPaid = allPersons.reduce((sum, p) => sum + p.commissionPaid, 0)

    // Deuda real pendiente (descontando lo ya devuelto y comisiones pagadas)
    const pendingToCollect = Math.max(0, totalMoneyInBookmaker - totalMoneyReturned - totalPersonCommissionPaid)

    const totalLiability = operations
      .filter(op => op.status !== 'completed' && op.status !== 'cancelled')
      .reduce((sum, op) => {
        return sum + op.bets
          .filter(bet => bet.result === null)
          .reduce((betSum, bet) => betSum + bet.liability, 0)
      }, 0)

    // Personas con saldo pendiente (basado en dinero real en la casa)
    const persons = await prisma.person.findMany({
      where: { userId: user.id },
      include: {
        operations: {
          include: {
            bets: true,
            deposits: true
          }
        }
      }
    })

    const personsWithDebt = persons.map(person => {
      // Calcular el dinero total que está en las casas de apuestas de esta persona
      const moneyInBookmaker = person.operations.reduce((sum, op) => {
        const owesData = calculateOwes(op.bets.map(bet => ({
          betType: bet.betType,
          stake: bet.stake,
          oddsBack: bet.oddsBack,
          oddsLay: bet.oddsLay,
          liability: bet.liability,
          result: bet.result,
          actualProfit: bet.actualProfit
        })))
        return sum + owesData.totalOwes
      }, 0)

      // Restar el dinero que ya te devolvió y la comisión pagada
      const returned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)

      // Deuda pendiente = dinero en casa - lo que ya devolvió - comisión pagada
      const remainingDebt = moneyInBookmaker - returned - person.commissionPaid

      return {
        id: person.id,
        name: person.name,
        balance: remainingDebt, // Positivo = te debe (dinero en casa - devuelto - comisión)
        moneyInBookmaker, // Total en la casa
        returned // Lo que ya devolvió
      }
    }).filter(p => Math.abs(p.balance) > 0.01)

    // Operaciones recientes
    const recentOperations = operations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(op => ({
        id: op.id,
        personName: op.person.name,
        bookmakerName: op.bookmaker.name,
        status: op.status,
        profit: op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0),
        createdAt: op.createdAt
      }))

    // Estadísticas por casa de apuestas (filtradas por usuario)
    const bookmakerStats = await prisma.bookmaker.findMany({
      where: { isActive: true },
      include: {
        operations: {
          where: { userId: user.id },
          include: { bets: true }
        }
      }
    })

    const bookmakerSummary = bookmakerStats.map(bm => ({
      id: bm.id,
      name: bm.name,
      operationsCount: bm.operations.length,
      totalProfit: bm.operations.reduce((sum, op) =>
        sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0), 0
      )
    }))

    return NextResponse.json({
      totalOperations,
      completedOperations,
      pendingOperations,
      totalProfit,
      profitInExchange,
      profitInBookmaker,
      totalBizumSent,
      totalMoneyReturned,
      totalCommissionPaid,
      pendingToCollect,
      totalLiability,
      personsWithDebt,
      recentOperations,
      bookmakerSummary
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener dashboard' }, { status: 500 })
  }
}
