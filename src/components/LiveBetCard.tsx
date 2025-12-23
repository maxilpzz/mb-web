'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

interface LiveBetCardProps {
  bet: PendingBet
  onSetResult: (betId: string, result: 'won' | 'lost') => void
  isUpdating?: boolean
}

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

function useCountdown(eventDate: string | null) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!eventDate) {
    return {
      status: 'no-date' as const,
      timeLeft: null,
      progress: 0,
      label: 'Sin fecha de inicio'
    }
  }

  const startTime = new Date(eventDate).getTime()
  const endTime = startTime + MATCH_DURATION_MS

  if (now < startTime) {
    // Match hasn't started yet
    const timeUntilStart = startTime - now
    return {
      status: 'upcoming' as const,
      timeLeft: timeUntilStart,
      progress: 0,
      label: `Empieza en ${formatTime(timeUntilStart)}`
    }
  }

  if (now >= endTime) {
    // Match has finished
    const timeSinceEnd = now - endTime
    return {
      status: 'finished' as const,
      timeLeft: 0,
      progress: 100,
      label: `Terminó hace ${formatTime(timeSinceEnd)}`
    }
  }

  // Match is in progress
  const timeLeft = endTime - now
  const elapsed = now - startTime
  const progress = (elapsed / MATCH_DURATION_MS) * 100

  return {
    status: 'live' as const,
    timeLeft,
    progress,
    label: `Termina en ${formatTime(timeLeft)}`
  }
}

function formatTime(ms: number): string {
  if (ms <= 0) return '0s'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export default function LiveBetCard({ bet, onSetResult, isUpdating }: LiveBetCardProps) {
  const countdown = useCountdown(bet.eventDate)

  const statusColors = {
    'no-date': 'border-gray-600 bg-gray-800',
    'upcoming': 'border-blue-600 bg-blue-900/20',
    'live': 'border-yellow-600 bg-yellow-900/20',
    'finished': 'border-red-600 bg-red-900/30'
  }

  const progressColors = {
    'no-date': 'bg-gray-500',
    'upcoming': 'bg-blue-500',
    'live': 'bg-yellow-500',
    'finished': 'bg-red-500'
  }

  return (
    <div className={`p-4 rounded-lg border-2 ${statusColors[countdown.status]} transition-all`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg">
            {bet.eventName || 'Evento sin nombre'}
          </h3>
          <p className="text-sm text-gray-400">
            {bet.operation.bookmaker.name} &middot; {bet.operation.person.name} &middot;{' '}
            <span className="capitalize">{bet.betType}</span>
            {bet.betNumber > 1 && ` #${bet.betNumber}`}
          </p>
        </div>
        <Link
          href={`/operations/${bet.operation.id}`}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Ver operación
        </Link>
      </div>

      {/* Countdown */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {countdown.status === 'finished' && (
            <span className="text-red-400 font-bold text-sm uppercase animate-pulse">
              Partido terminado
            </span>
          )}
          {countdown.status === 'live' && (
            <span className="text-yellow-400 font-bold text-sm uppercase">
              En juego
            </span>
          )}
          {countdown.status === 'upcoming' && (
            <span className="text-blue-400 font-bold text-sm uppercase">
              Próximamente
            </span>
          )}
          {countdown.status === 'no-date' && (
            <span className="text-gray-400 text-sm">
              Sin fecha configurada
            </span>
          )}
        </div>

        <p className={`text-xl font-mono ${
          countdown.status === 'finished' ? 'text-red-400' :
          countdown.status === 'live' ? 'text-yellow-400' :
          countdown.status === 'upcoming' ? 'text-blue-400' :
          'text-gray-400'
        }`}>
          {countdown.label}
        </p>

        {/* Progress bar */}
        {countdown.status !== 'no-date' && (
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${progressColors[countdown.status]}`}
              style={{ width: `${Math.min(countdown.progress, 100)}%` }}
            />
          </div>
        )}

        {/* Event date display */}
        {bet.eventDate && (
          <p className="text-xs text-gray-500 mt-2">
            Inicio: {new Date(bet.eventDate).toLocaleString('es-ES', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>

      {/* Bet details */}
      <div className="grid grid-cols-4 gap-2 text-sm mb-4 p-3 bg-gray-800 rounded-lg">
        <div>
          <p className="text-gray-500 text-xs">Stake</p>
          <p className="font-medium">{formatMoney(bet.stake)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Back</p>
          <p className="font-medium">{bet.oddsBack.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Lay</p>
          <p className="font-medium">{bet.oddsLay.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Liability</p>
          <p className="font-medium text-yellow-400">{formatMoney(bet.liability)}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onSetResult(bet.id, 'lost')}
          disabled={isUpdating}
          className="btn btn-success flex-1 text-sm"
        >
          Quedó en Exchange
        </button>
        <button
          onClick={() => onSetResult(bet.id, 'won')}
          disabled={isUpdating}
          className="btn btn-danger flex-1 text-sm"
        >
          Quedó en Casa
        </button>
      </div>
    </div>
  )
}
