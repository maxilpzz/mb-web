'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'

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
  commission: number
  commissionPaid: number
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
  commissionType: 'fixed_total' | 'per_operation'
  commission: number
  commissionPaid: number
  operations: Operation[]
  totals: {
    totalDebt: number
    totalProfit: number
    totalBizumSent: number
    totalMoneyReturned: number
    totalCommissionDue: number
    commissionRemaining: number
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
    commissionType: 'fixed_total' as 'fixed_total' | 'per_operation',
    commission: ''
  })
  const [operationCommissions, setOperationCommissions] = useState<Record<string, string>>({})

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
        commissionType: data.commissionType || 'fixed_total',
        commission: data.commission.toString()
      })
      // Inicializar comisiones por operación
      const commissions: Record<string, string> = {}
      data.operations.forEach((op: Operation) => {
        commissions[op.id] = op.commission.toString()
      })
      setOperationCommissions(commissions)
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
        commissionType: editForm.commissionType,
        commission: parseFloat(editForm.commission) || 0
      })
    })

    if (res.ok) {
      // Si es por operación, guardar comisiones individuales
      if (editForm.commissionType === 'per_operation' && person) {
        await Promise.all(
          person.operations.map(op =>
            fetch(`/api/operations/${op.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                commission: parseFloat(operationCommissions[op.id]) || 0
              })
            })
          )
        )
      }
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
        commissionPaid: person.totals.totalCommissionDue
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

  const commissionRemaining = person.totals.commissionRemaining

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Personas', href: '/persons' },
          { label: person.name }
        ]} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{person.name}</h1>
          {person.phone && <p className="text-gray-400">{person.phone}</p>}
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-400">Te debe</p>
            <p className={`text-2xl font-bold ${person.totals.totalDebt > 0 ? 'text-loss' : 'text-profit'}`}>
              {formatMoney(person.totals.totalDebt)}
            </p>
            {person.totals.totalDebt === 0 && person.operations.length > 0 && (
              <p className="text-xs text-profit mt-1">Liquidado</p>
            )}
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Comisión</p>
            <p className="text-2xl font-bold text-purple-400">
              {formatMoney(person.totals.totalCommissionDue)}
            </p>
            {person.commissionPaid > 0 && (
              <p className="text-xs text-green-400 mt-1">
                ✓ Pagada: {formatMoney(person.commissionPaid)}
              </p>
            )}
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
        </div>

        {/* Comisión - Solo mostrar si hay comisión configurada */}
        {person.totals.totalCommissionDue > 0 && (
          <div className="card mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold mb-2">Comisión</h2>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-purple-400">
                    {formatMoney(person.totals.totalCommissionDue)}
                  </p>
                  {person.commissionType === 'per_operation' && (
                    <span className="text-sm text-gray-400">
                      (por operación)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {person.commissionType === 'per_operation'
                    ? 'Pago por cada operación completada'
                    : 'Pago único por todas las casas'}
                </p>
                {person.commissionPaid > 0 && (
                  <p className="text-sm text-profit mt-2">
                    ✓ Pagado: {formatMoney(person.commissionPaid)}
                  </p>
                )}
                {commissionRemaining > 0 && (
                  <p className="text-sm text-yellow-400 mt-1">
                    Pendiente: {formatMoney(commissionRemaining)}
                  </p>
                )}
              </div>
              <div className="text-right space-y-2">
                {person.commissionPaid >= person.totals.totalCommissionDue ? (
                  <span className="badge badge-completed text-lg px-4 py-2">✓ Pagada</span>
                ) : (
                  <p className="text-sm text-gray-400">
                    Paga desde cada operación
                  </p>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="btn btn-secondary text-sm block w-full"
                >
                  Cambiar comisión
                </button>
              </div>
            </div>
          </div>
        )}

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
                <p className="text-sm text-gray-400">Tipo de comisión</p>
                <p className="font-medium">
                  {person.commissionType === 'per_operation' ? 'Por cada casa' : 'Pago único'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">
                  {person.commissionType === 'per_operation' ? 'Comisión por casa' : 'Comisión total'}
                </p>
                <p className="font-medium">{formatMoney(person.commission)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-400">Notas</p>
                <p className="font-medium">{person.notes || '-'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
              </div>
              <div>
                <label className="label">Tipo de comisión</label>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, commissionType: 'fixed_total' })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      editForm.commissionType === 'fixed_total'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Pago único (total)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, commissionType: 'per_operation' })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      editForm.commissionType === 'per_operation'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Por cada casa
                  </button>
                </div>
              </div>
              {editForm.commissionType === 'fixed_total' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Comisión total (€)</label>
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
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="label">Comisión por cada casa (€)</label>
                    {person.operations.length === 0 ? (
                      <p className="text-gray-500 text-sm">No hay operaciones creadas</p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {person.operations.map(op => (
                          <div key={op.id} className="flex items-center gap-3">
                            <span className="text-sm text-gray-300 w-32 truncate">{op.bookmaker.name}</span>
                            <input
                              type="number"
                              value={operationCommissions[op.id] || ''}
                              onChange={(e) => setOperationCommissions({
                                ...operationCommissions,
                                [op.id]: e.target.value
                              })}
                              className="input w-24"
                              step="0.01"
                              placeholder="0"
                            />
                            <span className="text-gray-500 text-sm">€</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                  href={`/operations/${op.id}?fromPerson=${person.id}`}
                  className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{op.bookmaker.name}</h3>
                      <p className="text-sm text-gray-400">
                        {op.bets.length} apuesta{op.bets.length !== 1 ? 's' : ''}
                        {op.pendingBets > 0 && ` (${op.pendingBets} pendiente${op.pendingBets !== 1 ? 's' : ''})`}
                      </p>
                      {person.commissionType === 'per_operation' && op.commission > 0 && (
                        <p className="text-sm text-purple-400">
                          Comisión: {formatMoney(op.commission)}
                          {op.commissionPaid >= op.commission && ' ✓'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`badge badge-${op.status}`}>
                        {getStatusLabel(op.status)}
                      </span>
                      {op.remainingDebt > 0 && (
                        <p className="text-sm text-loss mt-1">
                          Te debe {formatMoney(op.remainingDebt)}
                        </p>
                      )}
                      {op.status === 'completed' && (
                        <p className={`text-sm mt-1 ${op.totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
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
            href={`/operations/new?personId=${person.id}`}
            className="btn btn-primary w-full mt-4"
          >
            + Nueva operación con {person.name}
          </Link>
        </div>
      </div>
    </div>
  )
}
