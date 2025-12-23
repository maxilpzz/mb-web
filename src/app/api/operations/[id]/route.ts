import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

// GET: Obtener una operación por ID
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

    // Verificar que la operación pertenece al usuario
    if (operation.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Calcular totales
    const totalProfit = operation.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0)
    const totalExpectedProfit = operation.bets
      .filter(bet => bet.result === null)
      .reduce((sum, bet) => sum + bet.expectedProfit, 0)
    // Solo contar liability de apuestas PENDIENTES (sin resultado)
    const totalLiability = operation.bets
      .filter(bet => bet.result === null)
      .reduce((sum, bet) => sum + bet.liability, 0)
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la operación pertenece al usuario
    const existingOperation = await prisma.operation.findUnique({
      where: { id }
    })

    if (!existingOperation) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    if (existingOperation.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { status, bizumSent, moneyReturned, commission, commissionPaid, notes } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (bizumSent !== undefined) updateData.bizumSent = bizumSent
    if (moneyReturned !== undefined) updateData.moneyReturned = moneyReturned
    if (commission !== undefined) updateData.commission = commission
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la operación pertenece al usuario
    const existingOperation = await prisma.operation.findUnique({
      where: { id }
    })

    if (!existingOperation) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }

    if (existingOperation.userId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await prisma.operation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting operation:', error)
    return NextResponse.json({ error: 'Error al eliminar operación' }, { status: 500 })
  }
}
