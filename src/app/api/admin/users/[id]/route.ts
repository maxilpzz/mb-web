import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'
import { calculateOwes } from '@/lib/calculations'

// Verificar que el usuario actual es admin
async function verifyAdmin() {
  const supabaseUser = await getCurrentUser()
  if (!supabaseUser) return null

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id }
  })

  if (!user?.isAdmin) return null
  return user
}

// GET: Obtener detalles y datos de un usuario específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener datos del usuario (como si fueras él)
    const operations = await prisma.operation.findMany({
      where: { userId: user.supabaseId },
      include: {
        bets: true,
        person: true,
        bookmaker: true,
        deposits: true
      }
    })

    const persons = await prisma.person.findMany({
      where: { userId: user.supabaseId }
    })

    // Calcular estadísticas
    const totalOperations = operations.length
    const completedOperations = operations.filter(op => op.status === 'completed').length

    const totalProfit = operations.reduce((sum, op) => {
      return sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0)
    }, 0)

    // Calcular beneficio por ubicación
    let profitInExchange = 0
    let profitInBookmaker = 0
    operations.forEach(op => {
      op.bets.forEach(bet => {
        if (bet.result === 'lost' && bet.actualProfit) {
          profitInExchange += bet.actualProfit
        } else if (bet.result === 'won' && bet.actualProfit) {
          profitInBookmaker += bet.actualProfit
        }
      })
    })

    // Pendiente de cobro
    const totalMoneyInBookmaker = operations.reduce((sum, op) => {
      const owesData = calculateOwes(op.bets.map(bet => ({
        betType: bet.betType,
        stake: bet.stake,
        oddsBack: bet.oddsBack,
        oddsLay: bet.oddsLay,
        liability: bet.liability,
        result: bet.result,
        actualProfit: bet.actualProfit
      })))
      return sum + owesData.totalOwes
    }, 0)

    const totalMoneyReturned = operations.reduce((sum, op) => sum + op.moneyReturned, 0)
    const totalCommissionPaid = persons.reduce((sum, p) => sum + p.commissionPaid, 0)
    const pendingToCollect = Math.max(0, totalMoneyInBookmaker - totalMoneyReturned - totalCommissionPaid)

    return NextResponse.json({
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        isAdmin: user.isAdmin,
        isApproved: user.isApproved,
        createdAt: user.createdAt
      },
      stats: {
        totalOperations,
        completedOperations,
        totalProfit,
        profitInExchange,
        profitInBookmaker,
        pendingToCollect,
        personsCount: persons.length
      },
      recentOperations: operations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(op => ({
          id: op.id,
          personName: op.person.name,
          bookmakerName: op.bookmaker.name,
          status: op.status,
          profit: op.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0),
          createdAt: op.createdAt
        })),
      persons: persons.map(p => ({
        id: p.id,
        name: p.name,
        commission: p.commission,
        commissionPaid: p.commissionPaid
      }))
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
  }
}

// PATCH: Actualizar estado del usuario (aprobar/rechazar/hacer admin)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { isApproved, isAdmin } = body

    const updateData: { isApproved?: boolean; isAdmin?: boolean } = {}
    if (typeof isApproved === 'boolean') updateData.isApproved = isApproved
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// DELETE: Eliminar usuario
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    // No permitir eliminarse a sí mismo
    const user = await prisma.user.findUnique({ where: { id } })
    if (user?.supabaseId === admin.supabaseId) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
