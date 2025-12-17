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
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calcular saldo de cada persona
    // Saldo = bizumSent - moneyReturned - commissionPaid
    // Si es positivo, la persona te debe dinero
    // Si es negativo, tú le debes dinero
    const personsWithBalance = persons.map(person => {
      const totalBizumSent = person.operations.reduce((sum, op) => sum + op.bizumSent, 0)
      const totalMoneyReturned = person.operations.reduce((sum, op) => sum + op.moneyReturned, 0)
      const totalCommissionPaid = person.operations.reduce((sum, op) => sum + op.commissionPaid, 0)
      const balance = totalBizumSent - totalMoneyReturned - totalCommissionPaid

      const totalProfit = person.operations.reduce((sum, op) => {
        return sum + op.bets.reduce((betSum, bet) => betSum + (bet.actualProfit || 0), 0)
      }, 0)

      // Return only the fields needed by the frontend
      return {
        id: person.id,
        name: person.name,
        phone: person.phone,
        notes: person.notes,
        commission: person.commission,
        commissionPaid: person.commissionPaid,
        totalBizumSent,
        totalMoneyReturned,
        totalCommissionPaid,
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
    const { name, phone, notes, commission } = body

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const person = await prisma.person.create({
      data: {
        name,
        phone,
        notes,
        commission: commission || 0
      }
    })

    return NextResponse.json(person, { status: 201 })
  } catch (error) {
    console.error('Error creating person:', error)
    return NextResponse.json({ error: 'Error al crear persona' }, { status: 500 })
  }
}
