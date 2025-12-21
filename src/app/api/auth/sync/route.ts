import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

// Email del administrador principal (configurar en variables de entorno)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'maxilopezr04@gmail.com'

// POST: Sincronizar usuario de Supabase con nuestra BD
export async function POST() {
  try {
    const supabaseUser = await getCurrentUser()
    if (!supabaseUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const email = supabaseUser.email || ''
    const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

    // Crear o actualizar usuario en nuestra BD
    const user = await prisma.user.upsert({
      where: { supabaseId: supabaseUser.id },
      update: {
        email,
        // Si es el email admin, asegurar que tenga permisos
        ...(isAdminEmail ? { isAdmin: true, isApproved: true } : {})
      },
      create: {
        supabaseId: supabaseUser.id,
        email,
        isApproved: isAdminEmail, // Auto-aprobar si es admin
        isAdmin: isAdminEmail     // Auto-admin si es el email configurado
      }
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Error al sincronizar usuario' }, { status: 500 })
  }
}

// GET: Obtener estado del usuario actual
export async function GET() {
  try {
    const supabaseUser = await getCurrentUser()
    if (!supabaseUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id }
    })

    if (!user) {
      // Usuario no existe en nuestra BD, crearlo
      const email = supabaseUser.email || ''
      const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase()

      const newUser = await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email,
          isApproved: isAdminEmail,
          isAdmin: isAdminEmail
        }
      })
      return NextResponse.json({
        id: newUser.id,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        isApproved: newUser.isApproved
      })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
  }
}
