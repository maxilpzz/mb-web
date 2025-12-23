'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Person {
  id: string
  name: string
  commissionType: 'fixed_total' | 'per_operation'
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
  freebetRetention: number
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
  eventDate: string
}

function NewOperationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personId = searchParams.get('personId')

  const [person, setPerson] = useState<Person | null>(null)
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([])
  const [selectedBookmaker, setSelectedBookmaker] = useState<Bookmaker | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [usedBookmakerIds, setUsedBookmakerIds] = useState<string[]>([])

  const [form, setForm] = useState({
    bookmakerId: '',
    bizumSent: '',
    commission: '',
    notes: '',
  })

  const [qualifyingBets, setQualifyingBets] = useState<BetForm[]>([])
  const [freebets, setFreebets] = useState<BetForm[]>([])

  useEffect(() => {
    // Si no hay personId, redirigir a personas
    if (!personId) {
      router.push('/persons')
      return
    }

    // Cargar datos de la persona, casas de apuestas, y operaciones existentes
    Promise.all([
      fetch(`/api/persons/${personId}`).then(res => res.ok ? res.json() : null),
      fetch('/api/bookmakers').then(res => res.ok ? res.json() : []),
      fetch(`/api/operations?personId=${personId}`).then(res => res.ok ? res.json() : [])
    ]).then(([personData, bookmakersData, operationsData]) => {
      if (!personData) {
        router.push('/persons')
        return
      }

      setPerson(personData)
      setBookmakers(Array.isArray(bookmakersData) ? bookmakersData : [])

      // Extraer IDs de bookmakers ya usados (con fallback a bookmaker.id)
      if (Array.isArray(operationsData)) {
        const usedIds = operationsData.map((op: { bookmakerId?: string; bookmaker?: { id: string } }) =>
          op.bookmakerId || op.bookmaker?.id
        ).filter(Boolean) as string[]
        setUsedBookmakerIds(usedIds)
      }

      setLoading(false)
    }).catch(err => {
      console.error('Error loading data:', err)
      setLoading(false)
    })
  }, [personId, router])

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
          eventName: '',
          eventDate: ''
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
          eventName: '',
          eventDate: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Prepare bets array
    const bets = [
      ...qualifyingBets.filter(b => b.stake && b.oddsBack && b.oddsLay).map(b => ({
        betType: b.betType,
        betNumber: b.betNumber,
        stake: parseFloat(b.stake),
        oddsBack: parseFloat(b.oddsBack),
        oddsLay: parseFloat(b.oddsLay),
        eventName: b.eventName || undefined,
        eventDate: b.eventDate || undefined
      })),
      ...freebets.filter(b => b.stake && b.oddsBack && b.oddsLay).map(b => ({
        betType: b.betType,
        betNumber: b.betNumber,
        stake: parseFloat(b.stake),
        oddsBack: parseFloat(b.oddsBack),
        oddsLay: parseFloat(b.oddsLay),
        eventName: b.eventName || undefined,
        eventDate: b.eventDate || undefined
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
        personId,
        bookmakerId: form.bookmakerId,
        bizumSent: parseFloat(form.bizumSent) || 0,
        commission: parseFloat(form.commission) || 0,
        notes: form.notes,
        deposits,
        bets
      })
    })

    if (res.ok) {
      router.push(`/persons/${personId}`)
    } else {
      const data = await res.json()
      alert(data.error || 'Error al crear la operación')
    }

    setSubmitting(false)
  }

  // Calculate liability in real time
  const calculateLiability = (stake: string, oddsBack: string, oddsLay: string, type: 'qualifying' | 'freebet') => {
    const s = parseFloat(stake) || 0
    const ob = parseFloat(oddsBack) || 0
    const ol = parseFloat(oddsLay) || 0
    if (s === 0 || ob === 0 || ol === 0) return 0

    const commission = 0.02 // 2% comisión Betfair
    let layStake: number

    if (type === 'qualifying' && selectedBookmaker?.bonusType === 'only_if_lost') {
      // Modo Reembolso: fórmula especial para casas tipo "solo si pierdes"
      const retention = selectedBookmaker.freebetRetention || 0.75
      layStake = (s * (ob - retention)) / (ol - commission)
    } else if (type === 'qualifying') {
      // Qualifying normal
      layStake = (s * ob) / (ol - commission)
    } else {
      // Freebet (SNR)
      layStake = (s * (ob - 1)) / (ol - commission)
    }

    return layStake * (ol - 1)
  }

  // Calcular lay stake para mostrar al usuario
  const calculateLayStake = (stake: string, oddsBack: string, oddsLay: string, type: 'qualifying' | 'freebet') => {
    const s = parseFloat(stake) || 0
    const ob = parseFloat(oddsBack) || 0
    const ol = parseFloat(oddsLay) || 0
    if (s === 0 || ob === 0 || ol === 0) return 0

    const commission = 0.02

    if (type === 'qualifying' && selectedBookmaker?.bonusType === 'only_if_lost') {
      const retention = selectedBookmaker.freebetRetention || 0.75
      return (s * (ob - retention)) / (ol - commission)
    } else if (type === 'qualifying') {
      return (s * ob) / (ol - commission)
    } else {
      return (s * (ob - 1)) / (ol - commission)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!person) {
    return null
  }

  const availableBookmakers = bookmakers.filter(b => !usedBookmakerIds.includes(b.id))

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Nueva Operación</h1>
          <Link href={`/persons/${personId}`} className="text-gray-400 hover:text-white">
            ← Volver a {person.name}
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Persona (fija, no editable) */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Persona</h2>
            <div className="p-3 bg-gray-700 rounded-lg">
              <p className="font-semibold">{person.name}</p>
              {person.commission > 0 && (
                <p className="text-sm text-purple-400">Comisión acordada: {formatMoney(person.commission)}</p>
              )}
            </div>
          </div>

          {/* Casa de apuestas */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Casa de Apuestas</h2>
            {availableBookmakers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-yellow-400">Esta persona ya ha usado todas las casas de apuestas disponibles</p>
                <Link href={`/persons/${personId}`} className="btn btn-secondary mt-4 inline-block">
                  Volver
                </Link>
              </div>
            ) : (
              <>
                <select
                  name="bookmakerId"
                  value={form.bookmakerId}
                  onChange={(e) => handleBookmakerChange(e.target.value)}
                  className="select"
                  required
                >
                  <option value="">Seleccionar casa</option>
                  {availableBookmakers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} - Bono hasta {b.maxBonus}€ ({b.bonusType === 'always' ? 'Siempre' : 'Solo si pierdes'})
                    </option>
                  ))}
                </select>

                {usedBookmakerIds.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {usedBookmakerIds.length} casa(s) ya usada(s) con esta persona
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
                      <div className="text-yellow-400">Freebets deben ser en eventos DISTINTOS</div>
                    )}
                    {selectedBookmaker.promoCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Código promo:</span>
                        <span className="font-mono bg-gray-600 px-2 rounded">{selectedBookmaker.promoCode}</span>
                      </div>
                    )}
                    {selectedBookmaker.notes && (
                      <div className="text-yellow-300 mt-2">{selectedBookmaker.notes}</div>
                    )}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Bizum enviado (€)</label>
                    <input
                      type="number"
                      name="bizumSent"
                      value={form.bizumSent}
                      onChange={(e) => setForm({ ...form, bizumSent: e.target.value })}
                      placeholder="0"
                      step="0.01"
                      className="input"
                    />
                  </div>
                  {person?.commissionType === 'per_operation' && (
                    <div>
                      <label className="label">Comisión para esta casa (€)</label>
                      <input
                        type="number"
                        name="commission"
                        value={form.commission}
                        onChange={(e) => setForm({ ...form, commission: e.target.value })}
                        placeholder="Ej: 10"
                        step="0.01"
                        className="input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Comisión que pagarás a {person?.name} por esta operación
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Qualifying Bets */}
          {qualifyingBets.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Apuesta(s) Qualifying ({qualifyingBets.length})
                </h2>
                {selectedBookmaker?.bonusType === 'only_if_lost' && (
                  <span className="px-2 py-1 bg-orange-600 text-xs rounded-full">
                    Modo Reembolso ({(selectedBookmaker.freebetRetention * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <input
                      type="text"
                      value={bet.eventName}
                      onChange={(e) => handleBetChange(index, 'eventName', e.target.value, 'qualifying')}
                      placeholder="Evento (ej: Real Madrid vs Barcelona)"
                      className="input"
                    />
                    <input
                      type="datetime-local"
                      value={bet.eventDate}
                      onChange={(e) => handleBetChange(index, 'eventDate', e.target.value, 'qualifying')}
                      className="input"
                      title="Fecha y hora del partido"
                    />
                  </div>
                  {parseFloat(bet.oddsLay) > 0 && parseFloat(bet.oddsBack) > 0 && (
                    <div className="mt-2 text-sm space-y-1">
                      <p className="text-blue-400">
                        Lay Stake: {formatMoney(calculateLayStake(bet.stake, bet.oddsBack, bet.oddsLay, 'qualifying'))}
                      </p>
                      <p className="text-yellow-400">
                        Liability: {formatMoney(calculateLiability(bet.stake, bet.oddsBack, bet.oddsLay, 'qualifying'))}
                      </p>
                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <input
                      type="text"
                      value={bet.eventName}
                      onChange={(e) => handleBetChange(index, 'eventName', e.target.value, 'freebet')}
                      placeholder={!selectedBookmaker?.sameEvent ? 'Evento (DISTINTO requerido)' : 'Evento (ej: Liverpool vs Chelsea)'}
                      className="input"
                    />
                    <input
                      type="datetime-local"
                      value={bet.eventDate}
                      onChange={(e) => handleBetChange(index, 'eventDate', e.target.value, 'freebet')}
                      className="input"
                      title="Fecha y hora del partido"
                    />
                  </div>
                  {parseFloat(bet.oddsLay) > 0 && parseFloat(bet.oddsBack) > 0 && (
                    <div className="mt-2 text-sm space-y-1">
                      <p className="text-blue-400">
                        Lay Stake: {formatMoney(calculateLayStake(bet.stake, bet.oddsBack, bet.oddsLay, 'freebet'))}
                      </p>
                      <p className="text-yellow-400">
                        Liability: {formatMoney(calculateLiability(bet.stake, bet.oddsBack, bet.oddsLay, 'freebet'))}
                      </p>
                    </div>
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
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          {availableBookmakers.length > 0 && (
            <button
              type="submit"
              disabled={submitting || !form.bookmakerId}
              className="btn btn-primary w-full py-3 text-lg disabled:opacity-50"
            >
              {submitting ? 'Creando...' : 'Crear Operación'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default function NewOperationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    }>
      <NewOperationContent />
    </Suspense>
  )
}
