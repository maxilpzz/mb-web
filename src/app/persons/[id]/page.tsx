'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface Bet {
  id: string
  betType: string
  result: string | null
  actualProfit: number | null
}

interface Operation {
  id: string
  bookmaker: { id: string; name: string }
  status: string
  bizumSent: number
  moneyReturned: number
  moneyInBookmaker: number
  remainingDebt: number
  totalProfit: number
  pendingBets: number
  bets: Bet[]
  createdAt: string
}

interface Person {
  id: string
  name: string
  phone: string | null
  notes: string | null
  commission: number
  commissionPaid: number
  operations: Operation[]
  totals: {
    totalDebt: number
    totalProfit: number
    totalBizumSent: number
    totalMoneyReturned: number
    completedOperations: number
    pendingOperations: number
    totalOperations: number
  }
}

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    notes: '',
    commission: ''
  })

  useEffect(() => {
    fetchPerson()
  }, [id])

  const fetchPerson = async () => {
    const res = await fetch(`/api/persons/${id}`)
    if (res.ok) {
      const data = await res.json()
      setPerson(data)
      setEditForm({
        name: data.name,
        phone: data.phone || '',
        notes: data.notes || '',
        commission: data.commission.toString()
      })
    }
    setLoading(false)
  }

  const handleSaveEdit = async () => {
    const res = await fetch(`/api/persons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        phone: editForm.phone || null,
        notes: editForm.notes || null,
        commission: parseFloat(editForm.commission) || 0
      })
    })

    if (res.ok) {
      setEditing(false)
      fetchPerson()
    }
  }

  const handlePayCommission = async () => {
    if (!person) return

    const res = await fetch(`/api/persons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commissionPaid: person.commission
      })
    })

    if (res.ok) {
      fetchPerson()
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

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Persona no encontrada</p>
          <Link href="/persons" className="btn btn-primary">
            Ver personas
          </Link>
        </div>
      </div>
    )
  }

  const commissionRemaining = person.commission - person.commissionPaid

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{person.name}</h1>
            {person.phone && <p className="text-gray-400">{person.phone}</p>}
          </div>
          <Link href="/persons" className="btn btn-secondary">
            ← Volver
          </Link>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-400">Te debe (total)</p>
            <p className={`text-2xl font-bold ${person.totals.totalDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatMoney(person.totals.totalDebt)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Beneficio generado</p>
            <p className={`text-2xl font-bold ${person.totals.totalProfit >= 0 ? 'positive' : 'negative'}`}>
              {formatMoney(person.totals.totalProfit)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Operaciones</p>
            <p className="text-2xl font-bold">
              {person.totals.completedOperations}/{person.totals.totalOperations}
              <span className="text-sm text-gray-400 ml-1">completadas</span>
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Bizum enviado</p>
            <p className="text-2xl font-bold">{formatMoney(person.totals.totalBizumSent)}</p>
          </div>
        </div>

        {/* Comisión */}
        <div className="card mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold mb-2">Comisión acordada</h2>
              <p className="text-3xl font-bold text-purple-400">{formatMoney(person.commission)}</p>
              {person.commissionPaid > 0 && (
                <p className="text-sm text-green-500 mt-1">
                  ✓ Pagado: {formatMoney(person.commissionPaid)}
                </p>
              )}
              {commissionRemaining > 0 && (
                <p className="text-sm text-yellow-500 mt-1">
                  Pendiente: {formatMoney(commissionRemaining)}
                </p>
              )}
            </div>
            <div className="text-right">
              {commissionRemaining > 0 ? (
                <button
                  onClick={handlePayCommission}
                  className="btn btn-primary"
                >
                  Pagar {formatMoney(commissionRemaining)}
                </button>
              ) : person.commission > 0 ? (
                <span className="badge badge-completed text-lg px-4 py-2">✓ Pagada</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Info editable */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Información</h2>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Nombre</p>
                <p className="font-medium">{person.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Teléfono</p>
                <p className="font-medium">{person.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Comisión acordada</p>
                <p className="font-medium">{formatMoney(person.commission)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Notas</p>
                <p className="font-medium">{person.notes || '-'}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Comisión acordada (€)</label>
                <input
                  type="number"
                  value={editForm.commission}
                  onChange={(e) => setEditForm({ ...editForm, commission: e.target.value })}
                  className="input"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Notas</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lista de operaciones */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Operaciones ({person.operations.length})
          </h2>

          {person.operations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay operaciones con esta persona</p>
          ) : (
            <div className="space-y-3">
              {person.operations.map(op => (
                <Link
                  key={op.id}
                  href={`/operations/${op.id}`}
                  className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{op.bookmaker.name}</h3>
                      <p className="text-sm text-gray-400">
                        {op.bets.length} apuesta{op.bets.length !== 1 ? 's' : ''}
                        {op.pendingBets > 0 && ` (${op.pendingBets} pendiente${op.pendingBets !== 1 ? 's' : ''})`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`badge badge-${op.status}`}>
                        {getStatusLabel(op.status)}
                      </span>
                      {op.remainingDebt > 0 && (
                        <p className="text-sm text-red-400 mt-1">
                          Te debe {formatMoney(op.remainingDebt)}
                        </p>
                      )}
                      {op.status === 'completed' && (
                        <p className={`text-sm mt-1 ${op.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {op.totalProfit >= 0 ? '+' : ''}{formatMoney(op.totalProfit)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Botón para nueva operación */}
          <Link
            href="/operations/new"
            className="btn btn-primary w-full mt-4"
          >
            + Nueva operación con {person.name}
          </Link>
        </div>
      </div>
    </div>
  )
}
