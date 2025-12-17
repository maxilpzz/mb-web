import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Calcular dinero en la casa para una operación
function calculateMoneyInBookmaker(bets: Array<{
  betType: string
  stake: number
  oddsBack: number
  result: string | null
}>, deposits: Array<{ amount: number }>): number {
  // Si no hay apuestas resueltas, el dinero en la casa es el total depositado
  const resolvedBets = bets.filter(b => b.result !== null)

  if (resolvedBets.length === 0) {
    // Mientras no haya resultados, el dinero depositado sigue en la casa
    return deposits.reduce((sum, d) => sum + d.amount, 0)
  }

  // Calcular dinero que quedó en la casa según resultados
  let moneyInBookmaker = 0

  for (const bet of bets) {
    if (bet.result === 'won') {
      // Ganó en la casa: el dinero quedó ahí
      if (bet.betType === 'freebet') {
        moneyInBookmaker += bet.stake * (bet.oddsBack - 1)
      } else {
        moneyInBookmaker += bet.stake * bet.oddsBack
      }
    }
    // Si perdió (result === 'lost'), el dinero está en el exchange, no suma
    // Si está pendiente (result === null), el stake sigue en la casa
    else if (bet.result === null) {
      moneyInBookmaker += bet.stake
    }
  }

  return moneyInBookmaker
}

// GET: Obtener estadísticas del dashboard
export async function GET() {
  try {
    // Obtener todas las operaciones con apuestas
    const operations = await prisma.operation.findMany({
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

    const totalBizumSent = operations.reduce((sum, op) => sum + op.bizumSent, 0)
    const totalMoneyReturned = operations.reduce((sum, op) => sum + op.moneyReturned, 0)
    const totalCommissionPaid = operations.reduce((sum, op) => sum + op.commissionPaid, 0)

    // Pendiente de cobro = dinero total en las casas - lo que ya te devolvieron
    const totalMoneyInBookmaker = operations.reduce((sum, op) => {
      return sum + calculateMoneyInBookmaker(op.bets, op.deposits)
    }, 0)
    const pendingToCollect = totalMoneyInBookmaker - totalMoneyReturned

    const totalLiability = operations
      .filter(op => op.status !== 'completed' && op.status !== 'cancelled')
      .reduce((sum, op) => {
        return sum + op.bets
          .filter(bet => bet.result === null)
          .reduce((betSum, bet) => betSum + bet.liability, 0)
      }, 0)

    // Personas con saldo pendiente (basado en dinero real en la casa)
    const persons = await prisma.person.findMany({
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
        return sum + calculateMoneyInBookmaker(op.bets, op.deposits)
      }, 0)

      // Restar el dinero que ya te devolvió
      const returned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)

      return {
        id: person.id,
        name: person.name,
        balance: moneyInBookmaker - returned // Positivo = te debe (dinero en casa - devuelto)
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

    // Estadísticas por casa de apuestas
    const bookmakerStats = await prisma.bookmaker.findMany({
      where: { isActive: true },
      include: {
        operations: {
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
