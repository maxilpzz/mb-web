import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateOwes } from '@/lib/calculations'
import { getCurrentUser } from '@/lib/supabase/server'

// GET: Obtener todas las personas con sus saldos
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener total de casas de apuestas disponibles
    const totalBookmakers = await prisma.bookmaker.count({
      where: { isActive: true }
    })

    const persons = await prisma.person.findMany({
      where: { userId: user.id },
      include: {
        operations: {
          include: {
            bets: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calcular saldo de cada persona
    // Saldo = dinero que queda en las casas de apuestas - lo que ya devolvió
    // Se calcula basándose en los resultados de las apuestas
    const personsWithBalance = persons.map(person => {
      const totalBizumSent = person.operations.reduce((sum, op) => sum + op.bizumSent, 0)
      const totalMoneyReturned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)
      const totalCommissionPaid = person.operations.reduce((sum, op) => sum + op.commissionPaid, 0)

      // Calcular lo que realmente te debe basándose en los resultados de las apuestas
      let totalOwes = 0
      person.operations.forEach(op => {
        const owesData = calculateOwes(op.bets.map(bet => ({
          betType: bet.betType,
          stake: bet.stake,
          oddsBack: bet.oddsBack,
          oddsLay: bet.oddsLay,
          liability: bet.liability,
          result: bet.result,
          actualProfit: bet.actualProfit
        })))
        totalOwes += owesData.totalOwes
      })

      // Balance = lo que te debe (dinero en casas) - lo que ya devolvió - comisión pagada
      // La comisión pagada se descuenta porque se "paga" de lo que te debe
      const balance = totalOwes - totalMoneyReturned - person.commissionPaid

      const totalProfit = person.operations.reduce((sum, op) => {
        return sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0)
      }, 0)

      // Contar operaciones pendientes (no completadas ni canceladas)
      const pendingOperations = person.operations.filter(
        op => op.status !== 'completed' && op.status !== 'cancelled'
      ).length

      // Calcular casas de apuestas disponibles
      const usedBookmakers = person.operations.length
      const availableBookmakers = totalBookmakers - usedBookmakers

      // Return only the fields needed by the frontend
      return {
        id: person.id,
        name: person.name,
        phone: person.phone,
        notes: person.notes,
        commission: person.commission,
        commissionPaid: person.commissionPaid,
        paused: person.paused,
        totalBizumSent,
        totalMoneyReturned,
        totalCommissionPaid,
        balance, // Positivo = te debe, Negativo = le debes
        totalProfit,
        operationsCount: person.operations.length,
        pendingOperations,
        availableBookmakers,
        // Si está pausada, se considera como sin casas disponibles
        hasAvailableBookmakers: !person.paused && availableBookmakers > 0
      }
    })

    return NextResponse.json(personsWithBalance)
  } catch (error) {
    console.error('Error fetching persons:', error)
    return NextResponse.json({ error: 'Error al obtener personas' }, { status: 500 })
  }
}

// POST: Crear una nueva persona
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, notes, commission } = body

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const person = await prisma.person.create({
      data: {
        userId: user.id,
        name,
        phone,
        notes,
        commission: commission || 0
      }
    })

    return NextResponse.json(person, { status: 201 })
  } catch (error) {
    console.error('Error creating person:', error)
    return NextResponse.json({ error: 'Error al crear persona' }, { status: 500 })
  }
}
