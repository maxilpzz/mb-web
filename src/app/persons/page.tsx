'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Person {
  id: string
  name: string
  phone: string | null
  notes: string | null
  commission: number
  totalBizumSent: number
  totalMoneyReturned: number
  totalCommissionPaid: number
  balance: number
  totalProfit: number
  operationsCount: number
  pendingOperations: number
  availableBookmakers: number
  hasAvailableBookmakers: boolean
}

export default function PersonsPage() {
  const router = useRouter()
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newPerson, setNewPerson] = useState({ name: '', phone: '', notes: '', commission: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)

  useEffect(() => {
    fetchPersons()
  }, [])

  const fetchPersons = () => {
    fetch('/api/persons')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPersons(data)
        } else {
          console.error('API returned non-array:', data)
          setPersons([])
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching persons:', err)
        setPersons([])
        setLoading(false)
      })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPerson,
        commission: parseFloat(newPerson.commission) || 0
      })
    })

    if (res.ok) {
      setNewPerson({ name: '', phone: '', notes: '', commission: '' })
      setShowNew(false)
      fetchPersons()
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteError(null)
    const res = await fetch(`/api/persons/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setDeletingId(null)
      fetchPersons()
    } else {
      const data = await res.json()
      setDeleteError(data.error || 'Error al eliminar')
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Personas</h1>
          <div className="flex gap-4">
            <button onClick={() => setShowNew(true)} className="btn btn-primary">
              + Nueva Persona
            </button>
            <Link href="/" className="btn btn-secondary">
              ← Volver
            </Link>
          </div>
        </div>

        {/* Toggle para filtrar */}
        <div className="flex items-center gap-3 mb-6">
          <span className={`text-sm ${!showOnlyAvailable ? 'text-white font-medium' : 'text-gray-400'}`}>
            Todas
          </span>
          <button
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              showOnlyAvailable ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                showOnlyAvailable ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${showOnlyAvailable ? 'text-white font-medium' : 'text-gray-400'}`}>
            Con casas disponibles
          </span>
        </div>

        {/* Formulario nueva persona */}
        {showNew && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">Nueva Persona</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input
                    type="text"
                    value={newPerson.phone}
                    onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                    className="input"
                    placeholder="Para identificar en Bizum"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Comisión acordada (€)</label>
                  <input
                    type="number"
                    value={newPerson.commission}
                    onChange={(e) => setNewPerson({ ...newPerson, commission: e.target.value })}
                    className="input"
                    placeholder="Ej: 20"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Notas</label>
                  <input
                    type="text"
                    value={newPerson.notes}
                    onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">Crear</button>
                <button type="button" onClick={() => setShowNew(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="card max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">¿Eliminar persona?</h3>
              <p className="text-gray-400 mb-4">
                Esta acción no se puede deshacer. Solo puedes eliminar personas que no tengan operaciones asociadas.
              </p>
              {deleteError && (
                <p className="text-red-500 mb-4 text-sm">{deleteError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setDeletingId(null)
                    setDeleteError(null)
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de personas */}
        <div className="space-y-4">
          {persons.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400">No hay personas registradas</p>
              <button onClick={() => setShowNew(true)} className="btn btn-primary mt-4">
                Añadir primera persona
              </button>
            </div>
          ) : (
            (() => {
              // Filtrar y ordenar personas
              const filtered = showOnlyAvailable
                ? persons.filter(p => p.hasAvailableBookmakers)
                : persons

              // Ordenar: primero los que tienen casas disponibles, luego los que no
              const sorted = [...filtered].sort((a, b) => {
                if (a.hasAvailableBookmakers && !b.hasAvailableBookmakers) return -1
                if (!a.hasAvailableBookmakers && b.hasAvailableBookmakers) return 1
                return 0
              })

              if (sorted.length === 0) {
                return (
                  <div className="card text-center py-8">
                    <p className="text-gray-400">No hay personas con casas disponibles</p>
                    <button
                      onClick={() => setShowOnlyAvailable(false)}
                      className="btn btn-secondary mt-4"
                    >
                      Ver todas
                    </button>
                  </div>
                )
              }

              return sorted.map(person => {
                const isCompleted = !person.hasAvailableBookmakers

                return (
                  <div
                    key={person.id}
                    onClick={() => router.push(`/persons/${person.id}`)}
                    className={`card block transition-colors cursor-pointer ${
                      isCompleted
                        ? 'opacity-50 bg-gray-800/50 hover:bg-gray-700/50'
                        : 'hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-lg font-semibold ${isCompleted ? 'text-gray-400' : ''}`}>
                            {person.name}
                          </h3>
                          {person.pendingOperations > 0 && (
                            <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-400 text-xs rounded-full">
                              {person.pendingOperations} en curso
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-gray-600/50 text-gray-400 text-xs rounded-full">
                              Completado
                            </span>
                          )}
                        </div>
                        {person.phone && <p className="text-sm text-gray-400">{person.phone}</p>}
                        {person.commission > 0 && (
                          <p className={`text-sm ${isCompleted ? 'text-purple-400/60' : 'text-purple-400'}`}>
                            Comisión acordada: {formatMoney(person.commission)}
                          </p>
                        )}
                        {!isCompleted && person.availableBookmakers > 0 && (
                          <p className="text-sm text-blue-400">
                            {person.availableBookmakers} casa{person.availableBookmakers !== 1 ? 's' : ''} disponible{person.availableBookmakers !== 1 ? 's' : ''}
                          </p>
                        )}
                        {person.notes && <p className="text-sm text-gray-500">{person.notes}</p>}
                      </div>
                      <div className="text-right flex items-start gap-2">
                        <div>
                          <p className={`text-xl font-bold ${
                            isCompleted
                              ? 'text-gray-500'
                              : person.balance > 0
                                ? 'positive'
                                : person.balance < 0
                                  ? 'negative'
                                  : ''
                          }`}>
                            {person.balance > 0 ? 'Te debe ' : person.balance < 0 ? 'Le debes ' : ''}
                            {formatMoney(Math.abs(person.balance))}
                          </p>
                          <p className="text-sm text-gray-400">
                            {person.operationsCount} operaciones
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDeletingId(person.id)
                          }}
                          className="text-gray-500 hover:text-red-500 transition-colors p-1"
                          title="Eliminar persona"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className={`mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm ${isCompleted ? 'opacity-70' : ''}`}>
                      <div>
                        <p className="text-gray-400">Bizum enviado</p>
                        <p className="font-medium">{formatMoney(person.totalBizumSent)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Devuelto</p>
                        <p className="font-medium">{formatMoney(person.totalMoneyReturned)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Comisiones pagadas</p>
                        <p className="font-medium">{formatMoney(person.totalCommissionPaid)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Beneficio generado</p>
                        <p className={`font-medium ${
                          isCompleted
                            ? 'text-gray-400'
                            : person.totalProfit >= 0 ? 'positive' : 'negative'
                        }`}>
                          {formatMoney(person.totalProfit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            })()
          )}
        </div>
      </div>
    </div>
  )
}
