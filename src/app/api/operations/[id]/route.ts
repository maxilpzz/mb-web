import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Obtener una operación por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        person: true,
        bookmaker: true,
        deposits: {
          orderBy: { depositNum: 'asc' }
        },
        bets: {
          orderBy: [{ betType: 'asc' }, { betNumber: 'asc' }]
        }
      }
    })

    if (!operation) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    // Calcular totales
    const totalProfit = operation.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0)
    const totalExpectedProfit = operation.bets.reduce((sum, bet) => sum + bet.expectedProfit, 0)
    const totalLiability = operation.bets.reduce((sum, bet) => sum + bet.liability, 0)
    const pendingBets = operation.bets.filter(bet => bet.result === null).length
    const totalDeposited = operation.deposits.reduce((sum, dep) => sum + dep.amount, 0)

    return NextResponse.json({
      ...operation,
      totalProfit,
      totalExpectedProfit,
      totalLiability,
      pendingBets,
      totalDeposited
    })
  } catch (error) {
    console.error('Error fetching operation:', error)
    return NextResponse.json({ error: 'Error al obtener operación' }, { status: 500 })
  }
}

// PATCH: Actualizar una operación
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, bizumSent, moneyReturned, commissionPaid, notes } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (bizumSent !== undefined) updateData.bizumSent = bizumSent
    if (moneyReturned !== undefined) updateData.moneyReturned = moneyReturned
    if (commissionPaid !== undefined) updateData.commissionPaid = commissionPaid
    if (notes !== undefined) updateData.notes = notes

    const operation = await prisma.operation.update({
      where: { id },
      data: updateData,
      include: {
        person: true,
        bookmaker: true,
        deposits: true,
        bets: true
      }
    })

    return NextResponse.json(operation)
  } catch (error) {
    console.error('Error updating operation:', error)
    return NextResponse.json({ error: 'Error al actualizar operación' }, { status: 500 })
  }
}

// DELETE: Eliminar una operación
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.operation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting operation:', error)
    return NextResponse.json({ error: 'Error al eliminar operación' }, { status: 500 })
  }
}
