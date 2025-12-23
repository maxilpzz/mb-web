import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateOwes } from '@/lib/calculations'
import { getCurrentUser } from '@/lib/supabase/server'

// GET: Obtener detalle de una persona con sus operaciones
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        operations: {
          include: {
            bookmaker: true,
            bets: true,
            deposits: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
    }

    // Verificar que la persona pertenece al usuario
    if (person.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Calcular totales usando calculateOwes para manejar apuestas manuales correctamente
    const operationsWithTotals = person.operations.map(op => {
      const owesData = calculateOwes(op.bets.map(bet => ({
        betType: bet.betType,
        stake: bet.stake,
        oddsBack: bet.oddsBack,
        oddsLay: bet.oddsLay,
        liability: bet.liability,
        result: bet.result,
        actualProfit: bet.actualProfit
      })))

      const moneyInBookmaker = owesData.totalOwes
      const remainingDebt = Math.max(0, moneyInBookmaker - op.moneyReturned)
      const totalProfit = op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0)
      const pendingBets = op.bets.filter(bet => bet.result === null).length

      return {
        ...op,
        moneyInBookmaker,
        remainingDebt,
        totalProfit,
        pendingBets
      }
    })

    // Calcular totales globales de la persona
    // Restar commissionPaid porque se "paga" de lo que te debe
    const totalDebtBeforeCommission = operationsWithTotals.reduce((sum, op) => sum + op.remainingDebt, 0)
    const totalDebt = Math.max(0, totalDebtBeforeCommission - person.commissionPaid)
    const totalProfit = operationsWithTotals.reduce((sum, op) => sum + op.totalProfit, 0)
    const totalBizumSent = person.operations.reduce((sum, op) => sum + op.bizumSent, 0)
    const totalMoneyReturned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)
    const completedOperations = person.operations.filter(op => op.status === 'completed').length
    const pendingOperations = person.operations.filter(op => op.status !== 'completed' && op.status !== 'cancelled').length

    // Calcular comisión total según el tipo
    let totalCommissionDue = 0
    if (person.commissionType === 'fixed_total') {
      // Pago único por todas las casas
      totalCommissionDue = person.commission
    } else if (person.commissionType === 'per_operation') {
      // Sumar comisiones de cada operación individual
      totalCommissionDue = person.operations.reduce((sum, op) => sum + op.commission, 0)
    }

    return NextResponse.json({
      ...person,
      operations: operationsWithTotals,
      totals: {
        totalDebt,
        totalDebtBeforeCommission, // Antes de restar comisión
        totalProfit,
        totalBizumSent,
        totalMoneyReturned,
        totalCommissionDue, // Comisión total que se debe
        commissionRemaining: totalCommissionDue - person.commissionPaid, // Comisión pendiente de pagar
        completedOperations,
        pendingOperations,
        totalOperations: person.operations.length
      }
    })
  } catch (error) {
    console.error('Error fetching person:', error)
    return NextResponse.json({ error: 'Error al obtener persona' }, { status: 500 })
  }
}

// DELETE: Eliminar una persona
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

    // Verificar si tiene operaciones asociadas
    const person = await prisma.person.findUnique({
      where: { id },
      include: { operations: true }
    })

    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
    }

    // Verificar que la persona pertenece al usuario
    if (person.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (person.operations.length > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${person.operations.length} operación(es) asociada(s)` },
        { status: 400 }
      )
    }

    // Eliminar la persona
    await prisma.person.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting person:', error)
    return NextResponse.json({ error: 'Error al eliminar persona' }, { status: 500 })
  }
}

// PATCH: Actualizar una persona
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

    // Verificar que la persona pertenece al usuario
    const existingPerson = await prisma.person.findUnique({
      where: { id }
    })

    if (!existingPerson) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
    }

    if (existingPerson.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, notes, commissionType, commission, commissionPaid, paused } = body

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
        ...(commissionType !== undefined && { commissionType }),
        ...(commission !== undefined && { commission }),
        ...(commissionPaid !== undefined && { commissionPaid }),
        ...(paused !== undefined && { paused })
      }
    })

    return NextResponse.json(person)
  } catch (error) {
    console.error('Error updating person:', error)
    return NextResponse.json({ error: 'Error al actualizar persona' }, { status: 500 })
  }
}
