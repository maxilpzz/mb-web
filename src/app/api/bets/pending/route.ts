import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get all bets without result (pending) that have eventDate
    const pendingBets = await prisma.bet.findMany({
      where: {
        result: null,
        operation: {
          userId: user.id
        }
      },
      include: {
        operation: {
          include: {
            person: {
              select: { name: true }
            },
            bookmaker: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        eventDate: 'asc'
      }
    })

    // Transform data for frontend
    const bets = pendingBets.map(bet => ({
      id: bet.id,
      eventName: bet.eventName,
      eventDate: bet.eventDate?.toISOString() || null,
      betType: bet.betType,
      betNumber: bet.betNumber,
      stake: bet.stake,
      oddsBack: bet.oddsBack,
      oddsLay: bet.oddsLay,
      liability: bet.liability,
      expectedProfit: bet.expectedProfit,
      operation: {
        id: bet.operationId,
        person: { name: bet.operation.person.name },
        bookmaker: { name: bet.operation.bookmaker.name }
      }
    }))

    return NextResponse.json(bets)
  } catch (error) {
    console.error('Error fetching pending bets:', error)
    return NextResponse.json(
      { error: 'Error al obtener apuestas pendientes' },
      { status: 500 }
    )
  }
}
