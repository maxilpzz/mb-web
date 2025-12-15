'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Person {
  id: string
  name: string
  phone: string | null
  notes: string | null
  totalBizumReceived: number
  totalPaid: number
  balance: number
  totalProfit: number
  operationsCount: number
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newPerson, setNewPerson] = useState({ name: '', phone: '', notes: '' })

  useEffect(() => {
    fetchPersons()
  }, [])

  const fetchPersons = () => {
    fetch('/api/persons')
      .then(res => res.json())
      .then(data => {
        setPersons(data)
        setLoading(false)
      })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPerson)
    })

    if (res.ok) {
      setNewPerson({ name: '', phone: '', notes: '' })
      setShowNew(false)
      fetchPersons()
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
        <div className="flex items-center justify-between mb-8">
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
              <div>
                <label className="label">Notas</label>
                <input
                  type="text"
                  value={newPerson.notes}
                  onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                  className="input"
                />
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
            persons.map(person => (
              <div key={person.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{person.name}</h3>
                    {person.phone && <p className="text-sm text-gray-400">{person.phone}</p>}
                    {person.notes && <p className="text-sm text-gray-500">{person.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${person.balance > 0 ? 'positive' : person.balance < 0 ? 'negative' : ''}`}>
                      {person.balance > 0 ? 'Te debe ' : person.balance < 0 ? 'Le debes ' : ''}
                      {formatMoney(Math.abs(person.balance))}
                    </p>
                    <p className="text-sm text-gray-400">
                      {person.operationsCount} operaciones
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Bizum recibido</p>
                    <p className="font-medium">{formatMoney(person.totalBizumReceived)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pagado</p>
                    <p className="font-medium">{formatMoney(person.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Beneficio generado</p>
                    <p className={`font-medium ${person.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                      {formatMoney(person.totalProfit)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
