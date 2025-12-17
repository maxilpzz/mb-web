import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Calcular dinero en la casa para una operación
function calculateMoneyInBookmaker(bets: Array<{
  betType: string
  stake: number
  oddsBack: number
  result: string | null
}>): number {
  const qualifyingBets = bets.filter(b => b.betType === 'qualifying')
  const freebetBets = bets.filter(b => b.betType === 'freebet')
  const resolvedQualifying = qualifyingBets.filter(b => b.result !== null)

  if (resolvedQualifying.length === 0) {
    return 0 // Sin resultados aún
  }

  let moneyInBookmaker = 0

  for (const bet of qualifyingBets) {
    if (bet.result === 'won') {
      moneyInBookmaker += bet.stake * bet.oddsBack
    }
  }

  for (const bet of freebetBets) {
    if (bet.result === 'won') {
      moneyInBookmaker += bet.stake * (bet.oddsBack - 1)
    }
  }

  return moneyInBookmaker
}

// GET: Obtener detalle de una persona con sus operaciones
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Calcular totales
    const operationsWithTotals = person.operations.map(op => {
      const moneyInBookmaker = calculateMoneyInBookmaker(op.bets)
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
    const totalDebt = operationsWithTotals.reduce((sum, op) => sum + op.remainingDebt, 0)
    const totalProfit = operationsWithTotals.reduce((sum, op) => sum + op.totalProfit, 0)
    const totalBizumSent = person.operations.reduce((sum, op) => sum + op.bizumSent, 0)
    const totalMoneyReturned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)
    const completedOperations = person.operations.filter(op => op.status === 'completed').length
    const pendingOperations = person.operations.filter(op => op.status !== 'completed' && op.status !== 'cancelled').length

    return NextResponse.json({
      ...person,
      operations: operationsWithTotals,
      totals: {
        totalDebt,
        totalProfit,
        totalBizumSent,
        totalMoneyReturned,
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
    const { id } = await params

    // Verificar si tiene operaciones asociadas
    const person = await prisma.person.findUnique({
      where: { id },
      include: { operations: true }
    })

    if (!person) {
      return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
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
    const { id } = await params
    const body = await request.json()
    const { name, phone, notes, commission, commissionPaid } = body

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
        ...(commission !== undefined && { commission }),
        ...(commissionPaid !== undefined && { commissionPaid })
      }
    })

    return NextResponse.json(person)
  } catch (error) {
    console.error('Error updating person:', error)
    return NextResponse.json({ error: 'Error al actualizar persona' }, { status: 500 })
  }
}
