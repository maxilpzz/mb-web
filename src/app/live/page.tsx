'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import LiveBetCard from '@/components/LiveBetCard'

interface PendingBet {
  id: string
  eventName: string | null
  eventDate: string | null
  betType: string
  betNumber: number
  stake: number
  oddsBack: number
  oddsLay: number
  liability: number
  expectedProfit: number
  operation: {
    id: string
    person: { name: string }
    bookmaker: { name: string }
  }
}

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours

function sortBets(bets: PendingBet[]): PendingBet[] {
  const now = Date.now()

  return [...bets].sort((a, b) => {
    const aEndTime = a.eventDate ? new Date(a.eventDate).getTime() + MATCH_DURATION_MS : Infinity
    const bEndTime = b.eventDate ? new Date(b.eventDate).getTime() + MATCH_DURATION_MS : Infinity

    const aFinished = aEndTime <= now
    const bFinished = bEndTime <= now

    // Finished bets first (most urgent)
    if (aFinished && !bFinished) return -1
    if (!aFinished && bFinished) return 1

    // Then by end time (soonest first)
    if (a.eventDate && b.eventDate) {
      return aEndTime - bEndTime
    }

    // Bets without date at the end
    if (a.eventDate && !b.eventDate) return -1
    if (!a.eventDate && b.eventDate) return 1

    return 0
  })
}

export default function LivePage() {
  const [bets, setBets] = useState<PendingBet[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingBetId, setUpdatingBetId] = useState<string | null>(null)

  const fetchBets = useCallback(async () => {
    try {
      const res = await fetch('/api/bets/pending')
      if (res.ok) {
        const data = await res.json()
        setBets(sortBets(data))
      }
    } catch (error) {
      console.error('Error fetching bets:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBets()

    // Refresh every 30 seconds to catch new bets
    const interval = setInterval(fetchBets, 30000)
    return () => clearInterval(interval)
  }, [fetchBets])

  const handleSetResult = async (betId: string, result: 'won' | 'lost') => {
    setUpdatingBetId(betId)

    try {
      const res = await fetch(`/api/bets/${betId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      })

      if (res.ok) {
        // Remove the bet from the list
        setBets(prev => prev.filter(b => b.id !== betId))
      } else {
        alert('Error al actualizar el resultado')
      }
    } catch (error) {
      console.error('Error updating bet:', error)
      alert('Error al actualizar el resultado')
    } finally {
      setUpdatingBetId(null)
    }
  }

  // Count bets by status
  const now = Date.now()
  const stats = bets.reduce(
    (acc, bet) => {
      if (!bet.eventDate) {
        acc.noDate++
      } else {
        const endTime = new Date(bet.eventDate).getTime() + MATCH_DURATION_MS
        if (endTime <= now) {
          acc.finished++
        } else if (new Date(bet.eventDate).getTime() <= now) {
          acc.live++
        } else {
          acc.upcoming++
        }
      }
      return acc
    },
    { finished: 0, live: 0, upcoming: 0, noDate: 0 }
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando partidos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Partidos en Vivo</h1>
            <p className="text-gray-400">
              {bets.length} apuesta{bets.length !== 1 ? 's' : ''} pendiente{bets.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/" className="btn btn-secondary">
            Volver al Dashboard
          </Link>
        </div>

        {/* Stats */}
        {bets.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card text-center">
              <p className="text-red-400 text-2xl font-bold">{stats.finished}</p>
              <p className="text-xs text-gray-400">Terminados</p>
            </div>
            <div className="card text-center">
              <p className="text-yellow-400 text-2xl font-bold">{stats.live}</p>
              <p className="text-xs text-gray-400">En juego</p>
            </div>
            <div className="card text-center">
              <p className="text-blue-400 text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-xs text-gray-400">Por empezar</p>
            </div>
            <div className="card text-center">
              <p className="text-gray-400 text-2xl font-bold">{stats.noDate}</p>
              <p className="text-xs text-gray-400">Sin fecha</p>
            </div>
          </div>
        )}

        {/* Bets list */}
        {bets.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No hay apuestas pendientes</p>
            <p className="text-gray-500 text-sm mb-6">
              Las apuestas aparecerán aquí cuando las crees con fecha y hora del partido.
            </p>
            <Link href="/operations" className="btn btn-primary">
              Ver operaciones
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Finished bets warning */}
            {stats.finished > 0 && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
                <p className="text-red-400 font-bold">
                  {stats.finished} partido{stats.finished !== 1 ? 's' : ''} terminado{stats.finished !== 1 ? 's' : ''} esperando resultado
                </p>
                <p className="text-red-300 text-sm">
                  Marca el resultado para cada apuesta
                </p>
              </div>
            )}

            {/* Bet cards */}
            {bets.map(bet => (
              <LiveBetCard
                key={bet.id}
                bet={bet}
                onSetResult={handleSetResult}
                isUpdating={updatingBetId === bet.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
