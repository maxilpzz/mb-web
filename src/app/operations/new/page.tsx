'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Person {
  id: string
  name: string
}

const BOOKMAKERS = [
  'Bet365', 'Codere', 'Betfair', 'William Hill', 'Betway',
  'Sportium', '888sport', 'Luckia', 'Bwin', 'Marca Apuestas',
  'Kirolbet', 'Retabet', 'Paf', 'Otro'
]

export default function NewOperation() {
  const router = useRouter()
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewPerson, setShowNewPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')

  const [form, setForm] = useState({
    personId: '',
    bookmaker: '',
    bonusType: '',
    bizumReceived: '',
    notes: '',
    // Qualifying bet
    qualifyingStake: '',
    qualifyingOddsBack: '',
    qualifyingOddsLay: '',
    // Free bet
    freebetStake: '',
    freebetOddsBack: '',
    freebetOddsLay: '',
  })

  useEffect(() => {
    fetch('/api/persons')
      .then(res => res.json())
      .then(data => setPersons(data))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCreatePerson = async () => {
    if (!newPersonName.trim()) return

    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPersonName })
    })

    if (res.ok) {
      const newPerson = await res.json()
      setPersons([...persons, newPerson])
      setForm({ ...form, personId: newPerson.id })
      setNewPersonName('')
      setShowNewPerson(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const bets = []

    // Añadir qualifying bet si tiene datos
    if (form.qualifyingStake && form.qualifyingOddsBack && form.qualifyingOddsLay) {
      bets.push({
        betType: 'qualifying',
        stake: parseFloat(form.qualifyingStake),
        oddsBack: parseFloat(form.qualifyingOddsBack),
        oddsLay: parseFloat(form.qualifyingOddsLay)
      })
    }

    // Añadir free bet si tiene datos
    if (form.freebetStake && form.freebetOddsBack && form.freebetOddsLay) {
      bets.push({
        betType: 'freebet',
        stake: parseFloat(form.freebetStake),
        oddsBack: parseFloat(form.freebetOddsBack),
        oddsLay: parseFloat(form.freebetOddsLay)
      })
    }

    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: form.personId,
        bookmaker: form.bookmaker,
        bonusType: form.bonusType,
        bizumReceived: parseFloat(form.bizumReceived) || 0,
        notes: form.notes,
        bets
      })
    })

    if (res.ok) {
      router.push('/')
    } else {
      alert('Error al crear la operación')
    }

    setLoading(false)
  }

  // Calcular liability en tiempo real
  const calculateLiability = (stake: string, oddsBack: string, oddsLay: string, type: 'qualifying' | 'freebet') => {
    const s = parseFloat(stake) || 0
    const ob = parseFloat(oddsBack) || 0
    const ol = parseFloat(oddsLay) || 0
    if (s === 0 || ob === 0 || ol === 0) return 0

    const commission = 0.05
    const layStake = type === 'qualifying'
      ? (s * ob) / (ol - commission)
      : (s * (ob - 1)) / (ol - commission)

    return layStake * (ol - 1)
  }

  const qualifyingLiability = calculateLiability(
    form.qualifyingStake, form.qualifyingOddsBack, form.qualifyingOddsLay, 'qualifying'
  )

  const freebetLiability = calculateLiability(
    form.freebetStake, form.freebetOddsBack, form.freebetOddsLay, 'freebet'
  )

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Nueva Operación</h1>
          <Link href="/" className="text-gray-400 hover:text-white">
            ← Volver
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Persona */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Persona</h2>

            {!showNewPerson ? (
              <div className="space-y-2">
                <select
                  name="personId"
                  value={form.personId}
                  onChange={handleChange}
                  className="select"
                  required
                >
                  <option value="">Seleccionar persona</option>
                  {persons.map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewPerson(true)}
                  className="text-blue-400 text-sm hover:underline"
                >
                  + Añadir nueva persona
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Nombre de la persona"
                  className="input"
                />
                <button type="button" onClick={handleCreatePerson} className="btn btn-primary">
                  Crear
                </button>
                <button type="button" onClick={() => setShowNewPerson(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Casa de apuestas y bono */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Casa de Apuestas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Casa de apuestas</label>
                <select
                  name="bookmaker"
                  value={form.bookmaker}
                  onChange={handleChange}
                  className="select"
                  required
                >
                  <option value="">Seleccionar</option>
                  {BOOKMAKERS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo de bono</label>
                <input
                  type="text"
                  name="bonusType"
                  value={form.bonusType}
                  onChange={handleChange}
                  placeholder="Ej: Apuesta 100€ y recibe 50€"
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Bizum recibido</label>
              <input
                type="number"
                name="bizumReceived"
                value={form.bizumReceived}
                onChange={handleChange}
                placeholder="0"
                step="0.01"
                className="input"
              />
            </div>
          </div>

          {/* Qualifying Bet */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Apuesta Qualifying (Desbloqueo)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Stake (€)</label>
                <input
                  type="number"
                  name="qualifyingStake"
                  value={form.qualifyingStake}
                  onChange={handleChange}
                  placeholder="100"
                  step="0.01"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Cuota Back</label>
                <input
                  type="number"
                  name="qualifyingOddsBack"
                  value={form.qualifyingOddsBack}
                  onChange={handleChange}
                  placeholder="2.0"
                  step="0.01"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Cuota Lay</label>
                <input
                  type="number"
                  name="qualifyingOddsLay"
                  value={form.qualifyingOddsLay}
                  onChange={handleChange}
                  placeholder="2.05"
                  step="0.01"
                  className="input"
                />
              </div>
            </div>
            {qualifyingLiability > 0 && (
              <p className="mt-2 text-yellow-400">
                Liability: {formatMoney(qualifyingLiability)}
              </p>
            )}
          </div>

          {/* Free Bet */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Free Bet (Bono)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Valor Free Bet (€)</label>
                <input
                  type="number"
                  name="freebetStake"
                  value={form.freebetStake}
                  onChange={handleChange}
                  placeholder="50"
                  step="0.01"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Cuota Back</label>
                <input
                  type="number"
                  name="freebetOddsBack"
                  value={form.freebetOddsBack}
                  onChange={handleChange}
                  placeholder="5.0"
                  step="0.01"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Cuota Lay</label>
                <input
                  type="number"
                  name="freebetOddsLay"
                  value={form.freebetOddsLay}
                  onChange={handleChange}
                  placeholder="5.2"
                  step="0.01"
                  className="input"
                />
              </div>
            </div>
            {freebetLiability > 0 && (
              <p className="mt-2 text-yellow-400">
                Liability: {formatMoney(freebetLiability)}
              </p>
            )}
          </div>

          {/* Notas */}
          <div className="card">
            <label className="label">Notas (opcional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="input"
              placeholder="Cualquier nota adicional..."
            />
          </div>

          {/* Resumen */}
          {(qualifyingLiability > 0 || freebetLiability > 0) && (
            <div className="card bg-gray-700">
              <h2 className="text-lg font-semibold mb-2">Resumen</h2>
              <p>Liability total: <span className="text-yellow-400 font-bold">{formatMoney(qualifyingLiability + freebetLiability)}</span></p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-lg"
          >
            {loading ? 'Creando...' : 'Crear Operación'}
          </button>
        </form>
      </div>
    </div>
  )
}
