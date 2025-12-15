'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Bet {
  id: string
  betType: string
  stake: number
  oddsBack: number
  oddsLay: number
  liability: number
  expectedProfit: number
  result: string | null
  actualProfit: number | null
  eventName: string | null
}

interface Operation {
  id: string
  person: { id: string; name: string }
  bookmaker: string
  bonusType: string
  status: string
  bizumReceived: number
  paidToPerson: number
  notes: string | null
  bets: Bet[]
  createdAt: string
}

export default function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [operation, setOperation] = useState<Operation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/operations?id=${id}`)
      .then(res => res.json())
      .then(data => {
        const op = Array.isArray(data) ? data.find((o: Operation) => o.id === id) : data
        setOperation(op)
        setLoading(false)
      })
  }, [id])

  const handleSetResult = async (betId: string, result: 'won' | 'lost') => {
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    })

    if (res.ok) {
      // Refetch operation
      const data = await fetch(`/api/operations?id=${id}`).then(r => r.json())
      const op = Array.isArray(data) ? data.find((o: Operation) => o.id === id) : data
      setOperation(op)
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!operation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Operación no encontrada</p>
          <Link href="/operations" className="btn btn-primary">
            Ver operaciones
          </Link>
        </div>
      </div>
    )
  }

  const totalProfit = operation.bets.reduce((sum, bet) => sum + (bet.actualProfit || 0), 0)
  const totalLiability = operation.bets
    .filter(bet => bet.result === null)
    .reduce((sum, bet) => sum + bet.liability, 0)
  const balance = operation.bizumReceived - operation.paidToPerson

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{operation.person.name}</h1>
            <p className="text-gray-400">{operation.bookmaker} · {operation.bonusType}</p>
          </div>
          <div className="flex gap-4">
            <span className={`badge badge-${operation.status} text-base px-3 py-1`}>
              {operation.status === 'pending' ? 'Pendiente' :
               operation.status === 'in_progress' ? 'En curso' :
               operation.status === 'completed' ? 'Completado' : operation.status}
            </span>
            <Link href="/operations" className="btn btn-secondary">
              ← Volver
            </Link>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-gray-400">Bizum recibido</p>
            <p className="text-xl font-bold">{formatMoney(operation.bizumReceived)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Pagado</p>
            <p className="text-xl font-bold">{formatMoney(operation.paidToPerson)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Saldo</p>
            <p className={`text-xl font-bold ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`}>
              {formatMoney(balance)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">
              {operation.status === 'completed' ? 'Beneficio' : 'Liability'}
            </p>
            <p className={`text-xl font-bold ${
              operation.status === 'completed'
                ? (totalProfit >= 0 ? 'positive' : 'negative')
                : 'text-yellow-400'
            }`}>
              {formatMoney(operation.status === 'completed' ? totalProfit : totalLiability)}
            </p>
          </div>
        </div>

        {/* Apuestas */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Apuestas</h2>
          <div className="space-y-4">
            {operation.bets.map(bet => (
              <div
                key={bet.id}
                className={`p-4 rounded-lg ${
                  bet.result === null ? 'bg-gray-700' :
                  bet.result === 'won' ? 'bg-green-900/30 border border-green-700' :
                  'bg-red-900/30 border border-red-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">
                      {bet.betType === 'qualifying' ? 'Apuesta Qualifying' : 'Free Bet'}
                    </h3>
                    {bet.eventName && (
                      <p className="text-sm text-gray-400">{bet.eventName}</p>
                    )}
                  </div>
                  {bet.result && (
                    <span className={`badge ${bet.result === 'won' ? 'badge-completed' : 'badge-cancelled'}`}>
                      {bet.result === 'won' ? 'Ganó en casa' : 'Perdió en casa'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Stake</p>
                    <p className="font-medium">{formatMoney(bet.stake)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cuota Back</p>
                    <p className="font-medium">{bet.oddsBack}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cuota Lay</p>
                    <p className="font-medium">{bet.oddsLay}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Liability</p>
                    <p className="font-medium text-yellow-400">{formatMoney(bet.liability)}</p>
                  </div>
                </div>

                {bet.result ? (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-sm text-gray-400">Resultado</p>
                    <p className={`text-xl font-bold ${(bet.actualProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                      {formatMoney(bet.actualProfit || 0)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-sm text-gray-400 mb-2">¿Qué resultado tuvo en la casa de apuestas?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetResult(bet.id, 'won')}
                        className="btn btn-success"
                      >
                        Ganó en casa
                      </button>
                      <button
                        onClick={() => handleSetResult(bet.id, 'lost')}
                        className="btn btn-danger"
                      >
                        Perdió en casa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        {operation.notes && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold mb-2">Notas</h2>
            <p className="text-gray-300">{operation.notes}</p>
          </div>
        )}

        {/* Info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Creado el {new Date(operation.createdAt).toLocaleString('es-ES')}
        </p>
      </div>
    </div>
  )
}
