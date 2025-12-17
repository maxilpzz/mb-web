'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Person {
  id: string
  name: string
  commission: number
}

interface Bookmaker {
  id: string
  name: string
  bonusType: string
  minDeposit: number
  maxDeposit: number
  numDeposits: number
  numQualifying: number
  minOddsQualifying: number
  bonusPercentage: number
  maxBonus: number
  numFreebets: number
  freebetValue: number | null
  minOddsFreebet: number | null
  maxOddsFreebet: number | null
  sameEvent: boolean
  promoCode: string | null
  notes: string | null
}

interface BetForm {
  betType: 'qualifying' | 'freebet'
  betNumber: number
  stake: string
  oddsBack: string
  oddsLay: string
  eventName: string
}

export default function NewOperation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPersonId = searchParams.get('personId')

  const [persons, setPersons] = useState<Person[]>([])
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([])
  const [selectedBookmaker, setSelectedBookmaker] = useState<Bookmaker | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNewPerson, setShowNewPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonCommission, setNewPersonCommission] = useState('')
  const [preselectedPerson, setPreselectedPerson] = useState<Person | null>(null)

  const [form, setForm] = useState({
    personId: '',
    bookmakerId: '',
    bizumSent: '',
    notes: '',
  })

  const [qualifyingBets, setQualifyingBets] = useState<BetForm[]>([])
  const [freebets, setFreebets] = useState<BetForm[]>([])
  const [usedBookmakerIds, setUsedBookmakerIds] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/persons').then(res => res.json()),
      fetch('/api/bookmakers').then(res => res.json())
    ]).then(([personsData, bookmakersData]) => {
      setPersons(Array.isArray(personsData) ? personsData : [])
      setBookmakers(Array.isArray(bookmakersData) ? bookmakersData : [])

      // If personId is in URL, pre-select that person
      if (preselectedPersonId && Array.isArray(personsData)) {
        const person = personsData.find((p: Person) => p.id === preselectedPersonId)
        if (person) {
          setPreselectedPerson(person)
          setForm(prev => ({ ...prev, personId: preselectedPersonId }))
          // Load used bookmakers for this person
          fetch(`/api/operations?personId=${preselectedPersonId}`)
            .then(res => res.json())
            .then(operations => {
              if (Array.isArray(operations)) {
                const usedIds = operations.map((op: { bookmakerId: string }) => op.bookmakerId)
                setUsedBookmakerIds(usedIds)
              }
            })
        }
      }
    })
  }, [preselectedPersonId])

  const handleBookmakerChange = (bookmakerId: string) => {
    setForm({ ...form, bookmakerId })
    const bookmaker = bookmakers.find(b => b.id === bookmakerId)
    setSelectedBookmaker(bookmaker || null)

    if (bookmaker) {
      // Initialize qualifying bets based on bookmaker config
      const newQualifyingBets: BetForm[] = []
      for (let i = 1; i <= bookmaker.numQualifying; i++) {
        newQualifyingBets.push({
          betType: 'qualifying',
          betNumber: i,
          stake: bookmaker.maxDeposit.toString(),
          oddsBack: '',
          oddsLay: '',
          eventName: ''
        })
      }
      setQualifyingBets(newQualifyingBets)

      // Initialize freebets based on bookmaker config
      const newFreebets: BetForm[] = []
      for (let i = 1; i <= bookmaker.numFreebets; i++) {
        newFreebets.push({
          betType: 'freebet',
          betNumber: i,
          stake: bookmaker.freebetValue?.toString() || (bookmaker.maxBonus / bookmaker.numFreebets).toString(),
          oddsBack: '',
          oddsLay: '',
          eventName: ''
        })
      }
      setFreebets(newFreebets)

      // Set default bizum amount
      setForm(prev => ({
        ...prev,
        bizumSent: (bookmaker.maxDeposit * bookmaker.numDeposits).toString()
      }))
    }
  }

  const handlePersonChange = async (personId: string) => {
    setForm({ ...form, personId, bookmakerId: '' })
    setSelectedBookmaker(null)
    setQualifyingBets([])
    setFreebets([])

    if (personId) {
      // Fetch operations for this person to know which bookmakers they've already used
      const res = await fetch(`/api/operations?personId=${personId}`)
      const operations = await res.json()
      const usedIds = operations.map((op: { bookmakerId: string }) => op.bookmakerId)
      setUsedBookmakerIds(usedIds)
    } else {
      setUsedBookmakerIds([])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleBetChange = (
    index: number,
    field: keyof BetForm,
    value: string,
    betType: 'qualifying' | 'freebet'
  ) => {
    if (betType === 'qualifying') {
      const updated = [...qualifyingBets]
      updated[index] = { ...updated[index], [field]: value }
      setQualifyingBets(updated)
    } else {
      const updated = [...freebets]
      updated[index] = { ...updated[index], [field]: value }
      setFreebets(updated)
    }
  }

  const handleCreatePerson = async () => {
    if (!newPersonName.trim()) return

    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPersonName,
        commission: parseFloat(newPersonCommission) || 0
      })
    })

    if (res.ok) {
      const newPerson = await res.json()
      setPersons([...persons, newPerson])
      setForm({ ...form, personId: newPerson.id, bookmakerId: '' })
      setUsedBookmakerIds([]) // New person has no used bookmakers
      setSelectedBookmaker(null)
      setQualifyingBets([])
      setFreebets([])
      setNewPersonName('')
      setNewPersonCommission('')
      setShowNewPerson(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Prepare bets array
    const bets = [
      ...qualifyingBets.filter(b => b.stake && b.oddsBack && b.oddsLay).map(b => ({
        betType: b.betType,
        betNumber: b.betNumber,
        stake: parseFloat(b.stake),
        oddsBack: parseFloat(b.oddsBack),
        oddsLay: parseFloat(b.oddsLay),
        eventName: b.eventName || undefined
      })),
      ...freebets.filter(b => b.stake && b.oddsBack && b.oddsLay).map(b => ({
        betType: b.betType,
        betNumber: b.betNumber,
        stake: parseFloat(b.stake),
        oddsBack: parseFloat(b.oddsBack),
        oddsLay: parseFloat(b.oddsLay),
        eventName: b.eventName || undefined
      }))
    ]

    // Prepare deposits array
    const deposits = selectedBookmaker ?
      Array.from({ length: selectedBookmaker.numDeposits }, (_, i) => ({
        amount: selectedBookmaker.maxDeposit,
        depositNum: i + 1
      })) : []

    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: form.personId,
        bookmakerId: form.bookmakerId,
        bizumSent: parseFloat(form.bizumSent) || 0,
        notes: form.notes,
        deposits,
        bets
      })
    })

    if (res.ok) {
      router.push('/operations')
    } else {
      const data = await res.json()
      alert(data.error || 'Error al crear la operación')
    }

    setLoading(false)
  }

  // Calculate liability in real time
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

  const totalQualifyingLiability = qualifyingBets.reduce((sum, bet) =>
    sum + calculateLiability(bet.stake, bet.oddsBack, bet.oddsLay, 'qualifying'), 0
  )

  const totalFreebetLiability = freebets.reduce((sum, bet) =>
    sum + calculateLiability(bet.stake, bet.oddsBack, bet.oddsLay, 'freebet'), 0
  )

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
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

            {preselectedPerson ? (
              <div className="p-3 bg-gray-700 rounded-lg">
                <p className="font-semibold">{preselectedPerson.name}</p>
                {preselectedPerson.commission > 0 && (
                  <p className="text-sm text-purple-400">Comisión acordada: {preselectedPerson.commission}€</p>
                )}
              </div>
            ) : !showNewPerson ? (
              <div className="space-y-2">
                <select
                  name="personId"
                  value={form.personId}
                  onChange={(e) => handlePersonChange(e.target.value)}
                  className="select"
                  required
                >
                  <option value="">Seleccionar persona</option>
                  {persons.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name} {person.commission > 0 && `(${person.commission}€)`}
                    </option>
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
              <div className="space-y-3">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Nombre de la persona"
                  className="input"
                />
                <input
                  type="number"
                  value={newPersonCommission}
                  onChange={(e) => setNewPersonCommission(e.target.value)}
                  placeholder="Comisión acordada (€)"
                  step="0.01"
                  className="input"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleCreatePerson} className="btn btn-primary">
                    Crear
                  </button>
                  <button type="button" onClick={() => setShowNewPerson(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Casa de apuestas */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Casa de Apuestas</h2>
            <select
              name="bookmakerId"
              value={form.bookmakerId}
              onChange={(e) => handleBookmakerChange(e.target.value)}
              className="select"
              required
            >
              <option value="">Seleccionar casa</option>
              {bookmakers.map(b => {
                const isUsed = usedBookmakerIds.includes(b.id)
                return (
                  <option key={b.id} value={b.id} disabled={isUsed}>
                    {b.name} - Bono hasta {b.maxBonus}€ ({b.bonusType === 'always' ? 'Siempre' : 'Solo si pierdes'})
                    {isUsed && ' ✓ Ya usada'}
                  </option>
                )
              })}
            </select>
            {form.personId && usedBookmakerIds.length > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Las casas marcadas con ✓ ya fueron usadas con esta persona
              </p>
            )}

            {/* Bookmaker info */}
            {selectedBookmaker && (
              <div className="mt-4 p-4 bg-gray-700 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Depósito:</span>
                  <span>{selectedBookmaker.minDeposit}€ - {selectedBookmaker.maxDeposit}€ {selectedBookmaker.numDeposits > 1 && `(${selectedBookmaker.numDeposits} depósitos)`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Qualifying:</span>
                  <span>{selectedBookmaker.numQualifying} apuesta(s), cuota mín {selectedBookmaker.minOddsQualifying}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bono:</span>
                  <span>{selectedBookmaker.bonusPercentage}% hasta {selectedBookmaker.maxBonus}€ en {selectedBookmaker.numFreebets} freebet(s)</span>
                </div>
                {selectedBookmaker.freebetValue && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor freebet:</span>
                    <span>{selectedBookmaker.freebetValue}€ cada una</span>
                  </div>
                )}
                {(selectedBookmaker.minOddsFreebet || selectedBookmaker.maxOddsFreebet) && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cuota freebet:</span>
                    <span>
                      {selectedBookmaker.minOddsFreebet && `Mín ${selectedBookmaker.minOddsFreebet}`}
                      {selectedBookmaker.minOddsFreebet && selectedBookmaker.maxOddsFreebet && ' - '}
                      {selectedBookmaker.maxOddsFreebet && `Máx ${selectedBookmaker.maxOddsFreebet}`}
                    </span>
                  </div>
                )}
                {!selectedBookmaker.sameEvent && (
                  <div className="text-yellow-400">⚠️ Freebets deben ser en eventos DISTINTOS</div>
                )}
                {selectedBookmaker.promoCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Código promo:</span>
                    <span className="font-mono bg-gray-600 px-2 rounded">{selectedBookmaker.promoCode}</span>
                  </div>
                )}
                {selectedBookmaker.notes && (
                  <div className="text-yellow-300 mt-2">📝 {selectedBookmaker.notes}</div>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="label">Bizum enviado (€)</label>
              <input
                type="number"
                name="bizumSent"
                value={form.bizumSent}
                onChange={handleChange}
                placeholder="0"
                step="0.01"
                className="input"
              />
            </div>
          </div>

          {/* Qualifying Bets */}
          {qualifyingBets.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">
                Apuesta(s) Qualifying ({qualifyingBets.length})
              </h2>
              {qualifyingBets.map((bet, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-700 rounded-lg">
                  {qualifyingBets.length > 1 && (
                    <h3 className="text-sm font-medium mb-3 text-gray-400">Qualifying #{bet.betNumber}</h3>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Stake (€)</label>
                      <input
                        type="number"
                        value={bet.stake}
                        onChange={(e) => handleBetChange(index, 'stake', e.target.value, 'qualifying')}
                        placeholder="100"
                        step="0.01"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Cuota Back</label>
                      <input
                        type="number"
                        value={bet.oddsBack}
                        onChange={(e) => handleBetChange(index, 'oddsBack', e.target.value, 'qualifying')}
                        placeholder={selectedBookmaker?.minOddsQualifying.toString() || '2.0'}
                        step="0.01"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Cuota Lay</label>
                      <input
                        type="number"
                        value={bet.oddsLay}
                        onChange={(e) => handleBetChange(index, 'oddsLay', e.target.value, 'qualifying')}
                        placeholder="2.05"
                        step="0.01"
                        className="input"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={bet.eventName}
                    onChange={(e) => handleBetChange(index, 'eventName', e.target.value, 'qualifying')}
                    placeholder="Evento (opcional)"
                    className="input mt-3"
                  />
                  {parseFloat(bet.oddsLay) > 0 && (
                    <p className="mt-2 text-yellow-400 text-sm">
                      Liability: {formatMoney(calculateLiability(bet.stake, bet.oddsBack, bet.oddsLay, 'qualifying'))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Free Bets */}
          {freebets.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">
                Free Bet(s) ({freebets.length})
              </h2>
              {freebets.map((bet, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-700 rounded-lg">
                  {freebets.length > 1 && (
                    <h3 className="text-sm font-medium mb-3 text-gray-400">
                      Freebet #{bet.betNumber}
                      {!selectedBookmaker?.sameEvent && ' - Evento distinto requerido'}
                    </h3>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Valor (€)</label>
                      <input
                        type="number"
                        value={bet.stake}
                        onChange={(e) => handleBetChange(index, 'stake', e.target.value, 'freebet')}
                        placeholder="50"
                        step="0.01"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Cuota Back</label>
                      <input
                        type="number"
                        value={bet.oddsBack}
                        onChange={(e) => handleBetChange(index, 'oddsBack', e.target.value, 'freebet')}
                        placeholder="5.0"
                        step="0.01"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Cuota Lay</label>
                      <input
                        type="number"
                        value={bet.oddsLay}
                        onChange={(e) => handleBetChange(index, 'oddsLay', e.target.value, 'freebet')}
                        placeholder="5.2"
                        step="0.01"
                        className="input"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={bet.eventName}
                    onChange={(e) => handleBetChange(index, 'eventName', e.target.value, 'freebet')}
                    placeholder={!selectedBookmaker?.sameEvent ? 'Evento (DISTINTO requerido)' : 'Evento (opcional)'}
                    className="input mt-3"
                  />
                  {parseFloat(bet.oddsLay) > 0 && (
                    <p className="mt-2 text-yellow-400 text-sm">
                      Liability: {formatMoney(calculateLiability(bet.stake, bet.oddsBack, bet.oddsLay, 'freebet'))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

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
          {(totalQualifyingLiability > 0 || totalFreebetLiability > 0) && (
            <div className="card bg-gray-700">
              <h2 className="text-lg font-semibold mb-2">Resumen</h2>
              <div className="space-y-1">
                <p>Bizum a enviar: <span className="font-bold">{formatMoney(parseFloat(form.bizumSent) || 0)}</span></p>
                {totalQualifyingLiability > 0 && (
                  <p>Liability qualifying: <span className="text-yellow-400">{formatMoney(totalQualifyingLiability)}</span></p>
                )}
                {totalFreebetLiability > 0 && (
                  <p>Liability freebet: <span className="text-yellow-400">{formatMoney(totalFreebetLiability)}</span></p>
                )}
                <p className="pt-2 border-t border-gray-600">
                  Liability total: <span className="text-yellow-400 font-bold">{formatMoney(totalQualifyingLiability + totalFreebetLiability)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !form.personId || !form.bookmakerId}
            className="btn btn-primary w-full py-3 text-lg disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Operación'}
          </button>
        </form>
      </div>
    </div>
  )
}
