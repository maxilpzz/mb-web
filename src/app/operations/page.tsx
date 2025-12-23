'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Bet {
  id: string
  betType: string
  betNumber: number
  stake: number
  oddsBack: number
  oddsLay: number
  liability: number
  result: string | null
  actualProfit: number | null
  eventName: string | null
}

interface Bookmaker {
  id: string
  name: string
  bonusType: string
}

interface Operation {
  id: string
  person: { id: string; name: string }
  bookmaker: Bookmaker
  status: string
  bizumSent: number
  moneyReturned: number
  commissionPaid: number
  bets: Bet[]
  totalProfit: number
  totalLiability: number
  pendingBets: number
  totalDeposited: number
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'qualifying': return 'Qualifying'
      case 'freebet': return 'Freebet'
      case 'completed': return 'Completado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Operaciones</h1>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'qualifying', 'freebet', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f === 'all' ? 'Todas' : getStatusLabel(f)}
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
                        {getStatusLabel(op.status)}
                      </span>
                    </div>
                    <p className="text-gray-400">
                      {op.bookmaker.name}
                      <span className="text-sm ml-2">
                        ({op.bookmaker.bonusType === 'always' ? 'Siempre' : 'Solo si pierdes'})
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(op.createdAt).toLocaleDateString('es-ES')} ·
                      Bizum: {formatMoney(op.bizumSent)}
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
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {op.bets.map(bet => (
                    <div
                      key={bet.id}
                      className={`text-sm p-2 rounded ${
                        bet.result === null ? 'bg-gray-700' :
                        bet.result === 'won' ? 'bg-red-900/30' : 'bg-green-900/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {bet.betType === 'qualifying' ? 'Q' : 'FB'}
                          {bet.betNumber > 1 && `#${bet.betNumber}`}
                        </span>
                        {bet.result && (
                          <span className={`text-xs ${bet.result === 'won' ? 'text-red-400' : 'text-green-400'}`}>
                            {bet.result === 'won' ? 'CASA' : 'EXCH'}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {formatMoney(bet.stake)} @ {bet.oddsBack}
                      </span>
                      {bet.result && (
                        <span className={`block ${(bet.actualProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
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
