import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

// GET: Obtener todas las casas de apuestas activas
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Bookmakers are shared across all users
    const bookmakers = await prisma.bookmaker.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(bookmakers)
  } catch (error) {
    console.error('Error fetching bookmakers:', error)
    return NextResponse.json({ error: 'Error al obtener casas de apuestas' }, { status: 500 })
  }
}
