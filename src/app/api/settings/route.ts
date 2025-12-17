import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/settings - Obtener configuración global
export async function GET() {
  try {
    // Buscar o crear la configuración global
    let settings = await prisma.settings.findUnique({
      where: { id: 'global' }
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'global', exchangeBalance: 0 }
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

// PATCH /api/settings - Actualizar configuración global
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { exchangeBalance } = body

    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: {
        exchangeBalance: exchangeBalance !== undefined ? exchangeBalance : undefined
      },
      create: {
        id: 'global',
        exchangeBalance: exchangeBalance || 0
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
