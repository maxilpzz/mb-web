import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Obtener todas las personas con sus saldos
export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      include: {
        operations: {
          include: {
            bets: true
          }
        },
        transactions: true
      },
      orderBy: { name: 'asc' }
    })

    // Calcular saldo de cada persona
    const personsWithBalance = persons.map(person => {
      const totalBizumReceived = person.operations.reduce((sum, op) => sum + op.bizumReceived, 0)
      const totalPaid = person.operations.reduce((sum, op) => sum + op.paidToPerson, 0)
      const balance = totalBizumReceived - totalPaid

      const totalProfit = person.operations.reduce((sum, op) => {
        return sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0)
      }, 0)

      return {
        ...person,
        totalBizumReceived,
        totalPaid,
        balance, // Positivo = te debe, Negativo = le debes
        totalProfit,
        operationsCount: person.operations.length
      }
    })

    return NextResponse.json(personsWithBalance)
  } catch (error) {
    console.error('Error fetching persons:', error)
    return NextResponse.json({ error: 'Error al obtener personas' }, { status: 500 })
  }
}

// POST: Crear una nueva persona
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, notes } = body

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const person = await prisma.person.create({
      data: { name, phone, notes }
    })

    return NextResponse.json(person, { status: 201 })
  } catch (error) {
    console.error('Error creating person:', error)
    return NextResponse.json({ error: 'Error al crear persona' }, { status: 500 })
  }
}
