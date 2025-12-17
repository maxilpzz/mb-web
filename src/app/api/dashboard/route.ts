import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Calcular dinero en la casa para una operación
function calculateMoneyInBookmaker(bets: Array<{
  betType: string
  stake: number
  oddsBack: number
  result: string | null
}>, deposits: Array<{ amount: number }>): number {
  // Separar qualifying y freebet
  const qualifyingBets = bets.filter(b => b.betType === 'qualifying')
  const freebetBets = bets.filter(b => b.betType === 'freebet')

  // Si no hay qualifying resueltas, el dinero depositado sigue en la casa
  const resolvedQualifying = qualifyingBets.filter(b => b.result !== null)

  if (resolvedQualifying.length === 0) {
    // Mientras no haya resultados de qualifying, el dinero depositado sigue en la casa
    return deposits.reduce((sum, d) => sum + d.amount, 0)
  }

  // Calcular dinero que quedó en la casa según resultados
  let moneyInBookmaker = 0

  // Qualifying bets
  for (const bet of qualifyingBets) {
    if (bet.result === 'won') {
      // Ganó en la casa: stake * odds
      moneyInBookmaker += bet.stake * bet.oddsBack
    } else if (bet.result === null) {
      // Pendiente: el stake sigue en la casa
      moneyInBookmaker += bet.stake
    }
    // Si perdió (result === 'lost'), el dinero está en el exchange, no suma
  }

  // Freebet bets - SOLO cuentan si ya se resolvieron y ganaron
  // El stake de freebet pendiente NO es dinero real (es un bono)
  for (const bet of freebetBets) {
    if (bet.result === 'won') {
      // Ganó en la casa: solo ganancias (stake * (odds - 1)), no el stake
      moneyInBookmaker += bet.stake * (bet.oddsBack - 1)
    }
    // Si está pendiente o perdió, no suma nada (freebet no es dinero real)
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
