import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Get user from session
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          cookie: cookieStore.toString()
        }
      }
    })

    const { data: { user } } = await supabase.auth.getUser()

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
