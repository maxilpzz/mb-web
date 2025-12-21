import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

// GET /api/settings - Obtener configuración del usuario
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar o crear la configuración del usuario
    let settings = await prisma.settings.findFirst({
      where: { userId: user.id }
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId: user.id, exchangeBalance: 0 }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings - Actualizar configuración del usuario
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { exchangeBalance } = body

    // Buscar settings existente del usuario
    const existingSettings = await prisma.settings.findFirst({
      where: { userId: user.id }
    })

    let settings
    if (existingSettings) {
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: {
          exchangeBalance: exchangeBalance !== undefined ? exchangeBalance : undefined
        }
      })
    } else {
      settings = await prisma.settings.create({
        data: {
          userId: user.id,
          exchangeBalance: exchangeBalance || 0
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
