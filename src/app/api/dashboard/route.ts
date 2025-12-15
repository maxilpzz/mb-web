import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const pendingToCollect = totalBizumSent - totalMoneyReturned - totalCommissionPaid

    const totalLiability = operations
      .filter(op => op.status !== 'completed' && op.status !== 'cancelled')
      .reduce((sum, op) => {
        return sum + op.bets
          .filter(bet => bet.result === null)
          .reduce((betSum, bet) => betSum + bet.liability, 0)
      }, 0)

    // Personas con saldo pendiente
    const persons = await prisma.person.findMany({
      include: {
        operations: true
      }
    })

    const personsWithDebt = persons.map(person => {
      const sent = person.operations.reduce((sum, op) => sum + op.bizumSent, 0)
      const returned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)
      const commission = person.operations.reduce((sum, op) => sum + op.commissionPaid, 0)
      return {
        id: person.id,
        name: person.name,
        balance: sent - returned - commission // Positivo = te debe
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
