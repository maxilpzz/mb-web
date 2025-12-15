'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Bet {
  id: string
  betType: string
  stake: number
  oddsBack: number
  oddsLay: number
  liability: number
  result: string | null
  actualProfit: number | null
}

interface Operation {
  id: string
  person: { id: string; name: string }
  bookmaker: string
  bonusType: string
  status: string
  bizumReceived: number
  paidToPerson: number
  bets: Bet[]
  totalProfit: number
  totalLiability: number
  pendingBets: number
  createdAt: string
}

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchOperations()
  }, [])

  const fetchOperations = () => {
    fetch('/api/operations')
      .then(res => res.json())
      .then(data => {
        setOperations(data)
        setLoading(false)
      })
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const filteredOperations = operations.filter(op => {
    if (filter === 'all') return true
    return op.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Operaciones</h1>
          <div className="flex gap-4">
            <Link href="/operations/new" className="btn btn-primary">
              + Nueva Operación
            </Link>
            <Link href="/" className="btn btn-secondary">
              ← Volver
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'in_progress', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f === 'all' ? 'Todas' :
               f === 'pending' ? 'Pendientes' :
               f === 'in_progress' ? 'En curso' : 'Completadas'}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-4">
          {filteredOperations.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400">No hay operaciones</p>
              <Link href="/operations/new" className="btn btn-primary mt-4">
                Crear primera operación
              </Link>
            </div>
          ) : (
            filteredOperations.map(op => (
              <Link
                href={`/operations/${op.id}`}
                key={op.id}
                className="card block hover:border-gray-500 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{op.person.name}</h3>
                      <span className={`badge badge-${op.status}`}>
                        {op.status === 'pending' ? 'Pendiente' :
                         op.status === 'in_progress' ? 'En curso' :
                         op.status === 'completed' ? 'Completado' : op.status}
                      </span>
                    </div>
                    <p className="text-gray-400">{op.bookmaker} · {op.bonusType}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(op.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right">
                    {op.status === 'completed' ? (
                      <p className={`text-xl font-bold ${op.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                        {formatMoney(op.totalProfit)}
                      </p>
                    ) : (
                      <p className="text-yellow-400">
                        Liability: {formatMoney(op.totalLiability)}
                      </p>
                    )}
                    {op.pendingBets > 0 && (
                      <p className="text-sm text-gray-400">
                        {op.pendingBets} apuesta(s) pendiente(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Apuestas */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {op.bets.map(bet => (
                    <div
                      key={bet.id}
                      className={`text-sm p-2 rounded ${
                        bet.result === null ? 'bg-gray-700' :
                        bet.result === 'won' ? 'bg-green-900/30' : 'bg-red-900/30'
                      }`}
                    >
                      <span className="font-medium">
                        {bet.betType === 'qualifying' ? 'Qualifying' : 'Free Bet'}
                      </span>
                      <span className="text-gray-400 ml-2">
                        {formatMoney(bet.stake)} @ {bet.oddsBack}
                      </span>
                      {bet.result && (
                        <span className={`ml-2 ${(bet.actualProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                          {formatMoney(bet.actualProfit || 0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
