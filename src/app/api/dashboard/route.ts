import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Obtener estadísticas del dashboard
export async function GET() {
  try {
    // Obtener todas las operaciones con apuestas
    const operations = await prisma.operation.findMany({
      include: {
        bets: true,
        person: true
      }
    })

    // Calcular estadísticas
    const totalOperations = operations.length
    const completedOperations = operations.filter(op => op.status === 'completed').length
    const pendingOperations = operations.filter(op => op.status !== 'completed' && op.status !== 'cancelled').length

    const totalProfit = operations.reduce((sum, op) => {
      return sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0)
    }, 0)

    const totalBizumReceived = operations.reduce((sum, op) => sum + op.bizumReceived, 0)
    const totalPaid = operations.reduce((sum, op) => sum + op.paidToPerson, 0)
    const pendingToCollect = totalBizumReceived - totalPaid

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
      const received = person.operations.reduce((sum, op) => sum + op.bizumReceived, 0)
      const paid = person.operations.reduce((sum, op) => sum + op.paidToPerson, 0)
      return {
        id: person.id,
        name: person.name,
        balance: received - paid
      }
    }).filter(p => Math.abs(p.balance) > 0.01)

    // Operaciones recientes
    const recentOperations = operations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(op => ({
        id: op.id,
        personName: op.person.name,
        bookmaker: op.bookmaker,
        status: op.status,
        profit: op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0),
        createdAt: op.createdAt
      }))

    return NextResponse.json({
      totalOperations,
      completedOperations,
      pendingOperations,
      totalProfit,
      totalBizumReceived,
      totalPaid,
      pendingToCollect,
      totalLiability,
      personsWithDebt,
      recentOperations
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener dashboard' }, { status: 500 })
  }
}
