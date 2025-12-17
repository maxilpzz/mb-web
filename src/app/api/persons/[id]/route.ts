import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const { name, phone, notes, commission } = body

    const person = await prisma.person.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
        ...(commission !== undefined && { commission })
      }
    })

    return NextResponse.json(person)
  } catch (error) {
    console.error('Error updating person:', error)
    return NextResponse.json({ error: 'Error al actualizar persona' }, { status: 500 })
  }
}
