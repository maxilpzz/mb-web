import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Obtener estadísticas para gráficos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly' // monthly, yearly, total

    // Obtener todas las operaciones completadas con sus apuestas
    const operations = await prisma.operation.findMany({
      where: {
        status: 'completed'
      },
      include: {
        bets: true,
        person: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Obtener todas las personas con sus operaciones
    const persons = await prisma.person.findMany({
      include: {
        operations: {
          include: {
            bookmaker: true
          }
        }
      }
    })

    // Calcular beneficio por operación
    const operationsWithProfit = operations.map(op => ({
      ...op,
      profit: op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0),
      date: op.createdAt
    }))

    // Agrupar datos según el período
    const profitByPeriod: Record<string, number> = {}
    const cumulativeProfit: Array<{ period: string; profit: number; cumulative: number }> = []
    let runningTotal = 0

    // Función para obtener la clave del período
    const getPeriodKey = (date: Date): string => {
      const year = date.getFullYear()
      const month = date.getMonth() + 1

      if (period === 'yearly') {
        return `${year}`
      } else if (period === 'total') {
        return 'Total'
      } else {
        // monthly - formato: "Ene 2024"
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        return `${monthNames[month - 1]} ${year}`
      }
    }

    // Agrupar beneficios por período
    for (const op of operationsWithProfit) {
      const key = getPeriodKey(op.date)
      profitByPeriod[key] = (profitByPeriod[key] || 0) + op.profit
    }

    // Crear array ordenado de beneficios por período
    const profitData = Object.entries(profitByPeriod).map(([period, profit]) => ({
      period,
      profit: Math.round(profit * 100) / 100
    }))

    // Calcular beneficio acumulado
    for (const item of profitData) {
      runningTotal += item.profit
      cumulativeProfit.push({
        period: item.period,
        profit: item.profit,
        cumulative: Math.round(runningTotal * 100) / 100
      })
    }

    // Calcular personas "completadas" por período
    // Una persona está "completada" cuando tiene al menos una operación completada
    // y contamos la fecha de su primera operación completada
    const personsCompleted: Record<string, number> = {}

    for (const person of persons) {
      const completedOps = person.operations.filter(op => op.status === 'completed')
      if (completedOps.length > 0) {
        // Usar la fecha de la primera operación completada
        const firstCompleted = completedOps.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0]
        const key = getPeriodKey(firstCompleted.createdAt)
        personsCompleted[key] = (personsCompleted[key] || 0) + 1
      }
    }

    const personsData = Object.entries(personsCompleted).map(([period, count]) => ({
      period,
      count
    }))

    // Estadísticas totales
    const totalGrossProfit = operationsWithProfit.reduce((sum, op) => sum + op.profit, 0)
    const totalOperations = operations.length
    const totalPersons = persons.filter(p =>
      p.operations.some(op => op.status === 'completed')
    ).length

    // Calcular comisiones pagadas (de todas las personas)
    const totalCommissionsPaid = persons.reduce((sum, p) => sum + p.commissionPaid, 0)

    // Beneficio neto = beneficio bruto - comisiones pagadas
    const totalNetProfit = totalGrossProfit - totalCommissionsPaid

    return NextResponse.json({
      profitByPeriod: profitData,
      cumulativeProfit,
      personsCompleted: personsData,
      totals: {
        grossProfit: Math.round(totalGrossProfit * 100) / 100,
        netProfit: Math.round(totalNetProfit * 100) / 100,
        commissionsPaid: Math.round(totalCommissionsPaid * 100) / 100,
        operations: totalOperations,
        persons: totalPersons
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
