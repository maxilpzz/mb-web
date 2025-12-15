'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface Bet {
  id: string
  betType: string
  betNumber: number
  stake: number
  oddsBack: number
  oddsLay: number
  liability: number
  expectedProfit: number
  result: string | null
  actualProfit: number | null
  eventName: string | null
}

interface Deposit {
  id: string
  amount: number
  depositNum: number
  completed: boolean
}

interface Bookmaker {
  id: string
  name: string
  bonusType: string
  promoCode: string | null
  notes: string | null
}

interface Operation {
  id: string
  person: { id: string; name: string; commission: number }
  bookmaker: Bookmaker
  status: string
  bizumSent: number
  moneyReturned: number
  commissionPaid: number
  notes: string | null
  deposits: Deposit[]
  bets: Bet[]
  totalProfit: number
  totalExpectedProfit: number
  totalLiability: number
  pendingBets: number
  totalDeposited: number
  createdAt: string
}

export default function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [operation, setOperation] = useState<Operation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    bizumSent: '',
    moneyReturned: '',
    commissionPaid: '',
    status: ''
  })

  useEffect(() => {
    fetchOperation()
  }, [id])

  const fetchOperation = async () => {
    const res = await fetch(`/api/operations/${id}`)
    if (res.ok) {
      const data = await res.json()
      setOperation(data)
      setEditForm({
        bizumSent: data.bizumSent.toString(),
        moneyReturned: data.moneyReturned.toString(),
        commissionPaid: data.commissionPaid.toString(),
        status: data.status
      })
    }
    setLoading(false)
  }

  const handleSetResult = async (betId: string, result: 'won' | 'lost') => {
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    })

    if (res.ok) {
      fetchOperation()
    }
  }

  const handleSaveEdit = async () => {
    const res = await fetch(`/api/operations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bizumSent: parseFloat(editForm.bizumSent) || 0,
        moneyReturned: parseFloat(editForm.moneyReturned) || 0,
        commissionPaid: parseFloat(editForm.commissionPaid) || 0,
        status: editForm.status
      })
    })

    if (res.ok) {
      setEditing(false)
      fetchOperation()
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

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

  const balance = operation.bizumSent - operation.moneyReturned - operation.commissionPaid

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{operation.person.name}</h1>
            <p className="text-gray-400">
              {operation.bookmaker.name}
              <span className="text-sm ml-2">
                ({operation.bookmaker.bonusType === 'always' ? 'Bono siempre' : 'Solo si pierdes'})
              </span>
            </p>
          </div>
          <div className="flex gap-4">
            <span className={`badge badge-${operation.status} text-base px-3 py-1`}>
              {getStatusLabel(operation.status)}
            </span>
            <Link href="/operations" className="btn btn-secondary">
              ← Volver
            </Link>
          </div>
        </div>

        {/* Bookmaker Info */}
        {(operation.bookmaker.promoCode || operation.bookmaker.notes) && (
          <div className="card mb-6 bg-gray-700">
            {operation.bookmaker.promoCode && (
              <p className="text-sm">
                <span className="text-gray-400">Código promo:</span>{' '}
                <span className="font-mono bg-gray-600 px-2 py-1 rounded">{operation.bookmaker.promoCode}</span>
              </p>
            )}
            {operation.bookmaker.notes && (
              <p className="text-yellow-300 text-sm mt-2">{operation.bookmaker.notes}</p>
            )}
          </div>
        )}

        {/* Resumen financiero */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Resumen Financiero</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn btn-secondary text-sm">
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} className="btn btn-primary text-sm">
                  Guardar
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-secondary text-sm">
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Bizum enviado</p>
                <p className="text-xl font-bold">{formatMoney(operation.bizumSent)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Devuelto</p>
                <p className="text-xl font-bold">{formatMoney(operation.moneyReturned)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Comisión</p>
                <p className="text-xl font-bold">{formatMoney(operation.commissionPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Saldo</p>
                <p className={`text-xl font-bold ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : ''}`}>
                  {balance > 0 ? 'Te debe ' : balance < 0 ? 'Le debes ' : ''}
                  {formatMoney(Math.abs(balance))}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Bizum enviado (€)</label>
                  <input
                    type="number"
                    value={editForm.bizumSent}
                    onChange={(e) => setEditForm({ ...editForm, bizumSent: e.target.value })}
                    className="input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Devuelto (€)</label>
                  <input
                    type="number"
                    value={editForm.moneyReturned}
                    onChange={(e) => setEditForm({ ...editForm, moneyReturned: e.target.value })}
                    className="input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Comisión pagada (€)</label>
                  <input
                    type="number"
                    value={editForm.commissionPaid}
                    onChange={(e) => setEditForm({ ...editForm, commissionPaid: e.target.value })}
                    className="input"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="label">Estado</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="select"
                >
                  <option value="pending">Pendiente</option>
                  <option value="qualifying">Qualifying</option>
                  <option value="freebet">Freebet</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              {operation.person.commission > 0 && (
                <p className="text-sm text-purple-400">
                  Comisión acordada con {operation.person.name}: {formatMoney(operation.person.commission)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats de apuestas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-400">
              {operation.status === 'completed' ? 'Beneficio' : 'Beneficio esperado'}
            </p>
            <p className={`text-xl font-bold ${
              operation.status === 'completed'
                ? (operation.totalProfit >= 0 ? 'positive' : 'negative')
                : 'text-blue-400'
            }`}>
              {formatMoney(operation.status === 'completed' ? operation.totalProfit : operation.totalExpectedProfit)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Liability total</p>
            <p className="text-xl font-bold text-yellow-400">{formatMoney(operation.totalLiability)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Apuestas pendientes</p>
            <p className="text-xl font-bold">{operation.pendingBets}</p>
          </div>
        </div>

        {/* Depósitos */}
        {operation.deposits.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">Depósitos ({operation.deposits.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {operation.deposits.map(deposit => (
                <div key={deposit.id} className="p-3 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400">Depósito #{deposit.depositNum}</p>
                  <p className="font-bold">{formatMoney(deposit.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apuestas */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Apuestas ({operation.bets.length})</h2>
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
                      {bet.betType === 'qualifying' ? 'Qualifying' : 'Free Bet'}
                      {bet.betNumber > 1 && ` #${bet.betNumber}`}
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

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                  <div>
                    <p className="text-gray-400">Esperado</p>
                    <p className="font-medium text-blue-400">{formatMoney(bet.expectedProfit)}</p>
                  </div>
                </div>

                {bet.result ? (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-sm text-gray-400">Resultado final</p>
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
