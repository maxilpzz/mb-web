import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

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

// GET: Listar todos los usuarios
export async function GET() {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Para cada usuario, obtener estadísticas básicas
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const operationsCount = await prisma.operation.count({
        where: { userId: user.supabaseId }
      })
      const personsCount = await prisma.person.count({
        where: { userId: user.supabaseId }
      })

      return {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        isAdmin: user.isAdmin,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
        stats: {
          operations: operationsCount,
          persons: personsCount
        }
      }
    }))

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}
