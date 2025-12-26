'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { calculateOwes, OwesBreakdown } from '@/lib/calculations'
import Breadcrumbs from '@/components/Breadcrumbs'

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
  eventDate: string | null
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
  numQualifying: number
  numFreebets: number
  freebetValue: number | null
  maxBonus: number
}

interface Person {
  id: string
  name: string
  commissionType: 'fixed_total' | 'per_operation'
  commission: number
  commissionPaid: number
}

interface Operation {
  id: string
  person: Person
  bookmaker: Bookmaker
  commission: number // Comisión específica de esta operación (para per_operation)
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

// Componente para mostrar el "Te debe" con desglose expandible
function OwesDisplay({
  owesData,
  moneyReturned,
  formatMoney,
  onMarkReturned
}: {
  owesData: OwesBreakdown
  moneyReturned: number
  formatMoney: (amount: number) => string
  onMarkReturned: (amount: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const hasResults = owesData.breakdown.length > 0
  const remainingDebt = Math.max(0, owesData.totalOwes - moneyReturned)
  const hasRemainingDebt = remainingDebt > 0.01

  return (
    <div className="space-y-2">
      <div
        onClick={() => hasResults && setExpanded(!expanded)}
        className={`${hasResults ? 'cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors' : ''}`}
      >
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm text-gray-400">Te debe</p>
            <p className={`text-xl font-bold ${remainingDebt > 0 ? 'text-loss' : 'text-profit'}`}>
              {formatMoney(remainingDebt)}
            </p>
            {moneyReturned > 0 && (
              <p className="text-xs text-profit">
                ✓ Devuelto: {formatMoney(moneyReturned)}
              </p>
            )}
          </div>
          {hasResults && (
            <span className="text-gray-500 text-sm">
              {expanded ? '▼' : '▶'} ver desglose
            </span>
          )}
        </div>
        {owesData.pendingBets > 0 && (
          <p className="text-xs text-warning mt-1">
            ⏳ {owesData.pendingBets} apuesta{owesData.pendingBets > 1 ? 's' : ''} pendiente{owesData.pendingBets > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Botón para marcar como devuelto */}
      {hasRemainingDebt && owesData.pendingBets === 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkReturned(owesData.totalOwes)
          }}
          className="btn btn-success text-sm w-full mt-2"
        >
          ✓ Marcar {formatMoney(remainingDebt)} como devuelto
        </button>
      )}

      {expanded && (
        <div className="bg-gray-800 rounded-lg p-4 text-sm space-y-3 border border-gray-700">
          {/* Desglose por apuesta */}
          <div className="space-y-2">
            <p className="text-gray-400 font-medium">Desglose por apuesta:</p>
            {owesData.breakdown.map((item, idx) => (
              <div key={idx} className={`p-2 rounded ${item.result === 'won' ? 'result-bookmaker' : 'result-exchange'}`}>
                <div className="flex justify-between items-center">
                  <span className="capitalize">
                    {item.betType === 'qualifying' ? 'Qualifying' : 'Freebet'}
                    <span className={`ml-2 text-xs ${item.result === 'won' ? 'text-loss' : 'text-profit'}`}>
                      ({item.result === 'won' ? 'en casa' : 'en exchange'})
                    </span>
                  </span>
                  <span className={`font-semibold ${item.moneyInBookmaker > 0 ? 'text-loss' : 'text-profit'}`}>
                    {item.moneyInBookmaker > 0
                      ? `Te debe ${formatMoney(item.moneyInBookmaker)}`
                      : `+${formatMoney(item.exchangeWinnings)} en exchange`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen exchange */}
          <div className="pt-3 border-t border-gray-700 space-y-2">
            <p className="text-gray-400 font-medium">Tu balance en exchange (esta operación):</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">Liability perdida</p>
                <p className="font-semibold text-warning">-{formatMoney(owesData.liabilityLost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Ganado en exchange</p>
                <p className="font-semibold text-profit">+{formatMoney(owesData.exchangeWinnings)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-400">Balance exchange:</span>
              <span className={`font-bold ${owesData.exchangeBalance >= 0 ? 'text-profit' : 'text-loss'}`}>
                {owesData.exchangeBalance >= 0 ? '+' : ''}{formatMoney(owesData.exchangeBalance)}
              </span>
            </div>
          </div>

          {/* Total te debe */}
          <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
            <span className="text-gray-400">Total te debe (dinero en casa):</span>
            <span className={`text-lg font-bold ${owesData.totalOwes > 0 ? 'text-loss' : 'text-muted'}`}>
              {formatMoney(owesData.totalOwes)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para la sección de comisiones
function CommissionSection({
  operation,
  owesData,
  formatMoney,
  onPayCommission
}: {
  operation: Operation
  owesData: OwesBreakdown
  formatMoney: (amount: number) => string
  onPayCommission: (amount: number, method: 'deduct' | 'bizum') => void
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'deduct' | 'bizum'>('deduct')
  const [customAmount, setCustomAmount] = useState('')

  // Determinar la comisión según el tipo
  const isPerOperation = operation.person.commissionType === 'per_operation'
  const commissionDue = isPerOperation ? operation.commission : operation.person.commission
  const commissionPaid = isPerOperation ? operation.commissionPaid : operation.person.commissionPaid
  const commissionPending = Math.max(0, commissionDue - commissionPaid)

  // Calcular deuda restante
  const remainingDebt = Math.max(0, owesData.totalOwes - operation.moneyReturned)
  const hasDebt = remainingDebt > 0.01
  const allBetsResolved = owesData.pendingBets === 0

  // Si no hay comisión pendiente, no mostrar nada
  if (commissionPending <= 0) {
    return (
      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xl">✓</span>
          <div>
            <p className="font-medium text-green-400">Comisión pagada</p>
            <p className="text-sm text-gray-400">
              {formatMoney(commissionPaid)} {isPerOperation ? '(esta operación)' : '(total)'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Si hay apuestas pendientes, solo mostrar info
  if (!allBetsResolved) {
    return (
      <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
        <p className="text-gray-400 text-sm">Comisión pendiente</p>
        <p className="text-xl font-bold text-purple-400">{formatMoney(commissionPending)}</p>
        <p className="text-xs text-gray-500 mt-1">
          Resuelve las apuestas para pagar la comisión
        </p>
      </div>
    )
  }

  const handleConfirmPayment = () => {
    const amount = customAmount ? parseFloat(customAmount) : commissionPending
    onPayCommission(amount, paymentMethod)
    setShowPaymentModal(false)
    setCustomAmount('')
  }

  return (
    <>
      <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-gray-400 text-sm">Comisión pendiente</p>
            <p className="text-xl font-bold text-purple-400">{formatMoney(commissionPending)}</p>
            {isPerOperation && (
              <p className="text-xs text-gray-500">Por esta casa de apuestas</p>
            )}
          </div>
        </div>

        {/* Resumen de la situación */}
        <div className="bg-gray-800 rounded-lg p-3 mb-3 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">Te debe ({operation.bookmaker.name}):</span>
            <span className={hasDebt ? 'text-red-400' : 'text-green-400'}>
              {formatMoney(remainingDebt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Comisión acordada:</span>
            <span className="text-purple-400">{formatMoney(commissionPending)}</span>
          </div>
          <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between font-medium">
            <span className="text-gray-300">
              {hasDebt ? 'Te devolverá:' : 'Le enviarás:'}
            </span>
            <span className={hasDebt ? 'text-green-400' : 'text-orange-400'}>
              {hasDebt
                ? formatMoney(Math.max(0, remainingDebt - commissionPending))
                : formatMoney(commissionPending)
              }
            </span>
          </div>
        </div>

        {/* Botón para pagar */}
        <button
          onClick={() => setShowPaymentModal(true)}
          className="btn btn-primary w-full"
        >
          💰 Pagar comisión
        </button>
      </div>

      {/* Modal de pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4 w-full">
            <h2 className="text-xl font-bold mb-4">Pagar comisión a {operation.person.name}</h2>

            <div className="space-y-4">
              {/* Info */}
              <div className="bg-gray-700 rounded-lg p-3 text-sm">
                <p className="text-gray-400">Comisión pendiente: <span className="text-purple-400 font-medium">{formatMoney(commissionPending)}</span></p>
                <p className="text-gray-400">Te debe: <span className={hasDebt ? 'text-red-400' : 'text-green-400'} >{formatMoney(remainingDebt)}</span></p>
              </div>

              {/* Opciones de pago */}
              <div>
                <p className="label mb-2">¿Cómo quieres pagar?</p>
                <div className="space-y-2">
                  {hasDebt && (
                    <button
                      onClick={() => setPaymentMethod('deduct')}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                        paymentMethod === 'deduct'
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💸</span>
                        <div>
                          <p className="font-medium">Descontar de su deuda</p>
                          <p className="text-sm text-gray-400">
                            Te devolverá {formatMoney(Math.max(0, remainingDebt - commissionPending))} en vez de {formatMoney(remainingDebt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setPaymentMethod('bizum')}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                      paymentMethod === 'bizum'
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <p className="font-medium">Pagar por Bizum</p>
                        <p className="text-sm text-gray-400">
                          {hasDebt
                            ? `Te devuelve ${formatMoney(remainingDebt)} y tú le envías ${formatMoney(commissionPending)}`
                            : `Tú le envías ${formatMoney(commissionPending)}`
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cantidad personalizada (opcional) */}
              <div>
                <label className="label">Cantidad a pagar (opcional)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={commissionPending.toString()}
                  className="input"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Déjalo vacío para pagar {formatMoney(commissionPending)} completos
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleConfirmPayment}
                className="btn btn-primary flex-1"
              >
                Confirmar pago
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setCustomAmount('')
                }}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Componente para mostrar una apuesta individual
function BetCard({
  bet,
  onSetResult,
  onSetManualProfit,
  onDelete,
  onEdit,
  formatMoney,
  disabled = false
}: {
  bet: Bet
  onSetResult: (betId: string, result: 'won' | 'lost') => void
  onSetManualProfit: (betId: string, profit: number) => void
  onDelete: (betId: string) => void
  onEdit: (betId: string, data: { stake?: number; oddsBack?: number; oddsLay?: number; eventName?: string; eventDate?: string }) => void
  formatMoney: (amount: number) => string
  disabled?: boolean
}) {
  const [manualProfit, setManualProfit] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    stake: bet.stake.toString(),
    oddsBack: bet.oddsBack.toString(),
    oddsLay: bet.oddsLay.toString(),
    eventName: bet.eventName || '',
    eventDate: bet.eventDate ? new Date(bet.eventDate).toISOString().slice(0, 16) : ''
  })
  const isManualBet = bet.oddsBack === 0 || bet.oddsLay === 0

  const handleSaveEdit = () => {
    onEdit(bet.id, {
      stake: parseFloat(editForm.stake) || bet.stake,
      oddsBack: parseFloat(editForm.oddsBack) || 0,
      oddsLay: parseFloat(editForm.oddsLay) || 0,
      eventName: editForm.eventName,
      eventDate: editForm.eventDate || undefined
    })
    setIsEditing(false)
  }

  if (isEditing && !bet.result) {
    return (
      <div className="p-4 rounded-lg bg-gray-700 border-2 border-blue-500">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">
            Editando {bet.betType === 'qualifying' ? 'Qualifying' : 'Free Bet'}
            {bet.betNumber > 1 && ` #${bet.betNumber}`}
          </h3>
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="btn btn-primary text-sm">
              Guardar
            </button>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label text-xs">Stake (€)</label>
            <input
              type="number"
              value={editForm.stake}
              onChange={(e) => setEditForm({ ...editForm, stake: e.target.value })}
              className="input text-sm"
              step="0.01"
            />
          </div>
          <div>
            <label className="label text-xs">Cuota Back</label>
            <input
              type="number"
              value={editForm.oddsBack}
              onChange={(e) => setEditForm({ ...editForm, oddsBack: e.target.value })}
              className="input text-sm"
              step="0.01"
            />
          </div>
          <div>
            <label className="label text-xs">Cuota Lay</label>
            <input
              type="number"
              value={editForm.oddsLay}
              onChange={(e) => setEditForm({ ...editForm, oddsLay: e.target.value })}
              className="input text-sm"
              step="0.01"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Evento</label>
            <input
              type="text"
              value={editForm.eventName}
              onChange={(e) => setEditForm({ ...editForm, eventName: e.target.value })}
              className="input text-sm"
              placeholder="Real Madrid vs Barcelona"
            />
          </div>
          <div>
            <label className="label text-xs">Fecha y hora</label>
            <input
              type="datetime-local"
              value={editForm.eventDate}
              onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
              className="input text-sm"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-4 rounded-lg ${
        bet.result === null ? 'result-pending' :
        bet.result === 'won' ? 'result-bookmaker' :
        'result-exchange'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">
            {bet.betType === 'qualifying' ? 'Qualifying' : 'Free Bet'}
            {bet.betNumber > 1 && ` #${bet.betNumber}`}
            {isManualBet && <span className="text-xs text-purple-400 ml-2">(sin igualar)</span>}
          </h3>
          {bet.eventName && (
            <p className="text-sm text-gray-400">{bet.eventName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {bet.result && (
            <span className={`badge ${bet.result === 'won' ? 'badge-completed' : 'badge-cancelled'}`}>
              {isManualBet ? 'Resultado registrado' : (bet.result === 'won' ? 'Quedó en casa' : 'Quedó en exchange')}
            </span>
          )}
          {!bet.result && !showDeleteConfirm && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-500 hover:text-blue-400 text-sm"
              title="Editar apuesta"
            >
              ✎
            </button>
          )}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-500 hover:text-red-400 text-sm"
              title="Eliminar apuesta"
            >
              ✕
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onDelete(bet.id)
                  setShowDeleteConfirm(false)
                }}
                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {isManualBet ? (
        <div className="text-sm">
          <div>
            <p className="text-gray-400">Valor freebet</p>
            <p className="font-medium">{formatMoney(bet.stake)}</p>
          </div>
        </div>
      ) : (
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
            <p className="font-medium text-warning">{formatMoney(bet.liability)}</p>
          </div>
          <div>
            <p className="text-gray-400">Esperado</p>
            <p className="font-medium text-info">{formatMoney(bet.expectedProfit)}</p>
          </div>
        </div>
      )}

      {bet.result ? (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <p className="text-sm text-gray-400">Resultado final</p>
          <p className={`text-xl font-bold ${(bet.actualProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(bet.actualProfit || 0)}
          </p>
        </div>
      ) : isManualBet ? (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <p className="text-sm text-gray-400 mb-2">¿Cuánto ganaste? (0 si perdiste)</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={manualProfit}
              onChange={(e) => setManualProfit(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="input flex-1"
              disabled={disabled}
            />
            <button
              onClick={() => {
                const profit = parseFloat(manualProfit) || 0
                onSetManualProfit(bet.id, profit)
              }}
              className="btn btn-primary"
              disabled={disabled || manualProfit === ''}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <p className="text-sm text-gray-400 mb-2">¿Dónde quedó el dinero?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onSetResult(bet.id, 'lost')}
              className="btn btn-success"
              disabled={disabled}
            >
              En mi exchange ✓
            </button>
            <button
              onClick={() => onSetResult(bet.id, 'won')}
              className="btn btn-danger"
              disabled={disabled}
            >
              En la casa ✗
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPersonId = searchParams.get('fromPerson')
  const [operation, setOperation] = useState<Operation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAddFreebet, setShowAddFreebet] = useState(false)
  const [addingFreebet, setAddingFreebet] = useState(false)
  const [freebetForm, setFreebetForm] = useState({
    stake: '',
    oddsBack: '',
    oddsLay: '',
    eventName: '',
    eventDate: '',
    noLay: false
  })
  const [showAddQualifying, setShowAddQualifying] = useState(false)
  const [addingQualifying, setAddingQualifying] = useState(false)
  const [qualifyingForm, setQualifyingForm] = useState({
    stake: '',
    oddsBack: '',
    oddsLay: '',
    eventName: '',
    eventDate: ''
  })
  const [showQuickProfit, setShowQuickProfit] = useState(false)
  const [quickProfitAmount, setQuickProfitAmount] = useState('')
  const [savingQuickProfit, setSavingQuickProfit] = useState(false)
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

  const handleSetManualProfit = async (betId: string, profit: number) => {
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualProfit: profit })
    })

    if (res.ok) {
      fetchOperation()
    }
  }

  const handleDeleteBet = async (betId: string) => {
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      fetchOperation()
    } else {
      alert('Error al eliminar la apuesta')
    }
  }

  const handleEditBet = async (betId: string, data: { stake?: number; oddsBack?: number; oddsLay?: number; eventName?: string; eventDate?: string }) => {
    const res = await fetch(`/api/bets/${betId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (res.ok) {
      fetchOperation()
    } else {
      alert('Error al editar la apuesta')
    }
  }

  const handleAddFreebet = async () => {
    if (!freebetForm.stake) {
      alert('Introduce el stake')
      return
    }
    if (!freebetForm.noLay && (!freebetForm.oddsBack || !freebetForm.oddsLay)) {
      alert('Completa las cuotas o marca "Sin igualar"')
      return
    }

    setAddingFreebet(true)
    const res = await fetch(`/api/operations/${id}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        betType: 'freebet',
        stake: parseFloat(freebetForm.stake),
        oddsBack: freebetForm.noLay ? 0 : parseFloat(freebetForm.oddsBack),
        oddsLay: freebetForm.noLay ? 0 : parseFloat(freebetForm.oddsLay),
        eventName: freebetForm.eventName || null,
        eventDate: freebetForm.eventDate || null
      })
    })

    if (res.ok) {
      setShowAddFreebet(false)
      setFreebetForm({ stake: '', oddsBack: '', oddsLay: '', eventName: '', eventDate: '', noLay: false })
      fetchOperation()
    } else {
      alert('Error al añadir freebet')
    }
    setAddingFreebet(false)
  }

  const handleAddQualifying = async () => {
    if (!qualifyingForm.stake || !qualifyingForm.oddsBack || !qualifyingForm.oddsLay) {
      alert('Completa todos los campos')
      return
    }

    setAddingQualifying(true)
    const res = await fetch(`/api/operations/${id}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        betType: 'qualifying',
        stake: parseFloat(qualifyingForm.stake),
        oddsBack: parseFloat(qualifyingForm.oddsBack),
        oddsLay: parseFloat(qualifyingForm.oddsLay),
        eventName: qualifyingForm.eventName || null,
        eventDate: qualifyingForm.eventDate || null
      })
    })

    if (res.ok) {
      setShowAddQualifying(false)
      setQualifyingForm({ stake: '', oddsBack: '', oddsLay: '', eventName: '', eventDate: '' })
      fetchOperation()
    } else {
      alert('Error al añadir qualifying')
    }
    setAddingQualifying(false)
  }

  const handleQuickProfit = async () => {
    if (!operation) return

    if (quickProfitAmount === '') {
      alert('Introduce una cantidad (puede ser 0)')
      return
    }
    const profit = parseFloat(quickProfitAmount) || 0

    setSavingQuickProfit(true)

    // Crear una freebet con el valor total del bono y registrar el profit directamente
    const totalBonus = operation.bookmaker.numFreebets * (operation.bookmaker.freebetValue || 0)

    // Primero crear la freebet sin cuotas (manual)
    const createRes = await fetch(`/api/operations/${id}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        betType: 'freebet',
        stake: totalBonus || 150, // fallback
        oddsBack: 0,
        oddsLay: 0,
        eventName: 'Freebets sin igualar'
      })
    })

    if (createRes.ok) {
      const newBet = await createRes.json()

      // Ahora registrar el profit
      await fetch(`/api/bets/${newBet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualProfit: profit })
      })

      setShowQuickProfit(false)
      setQuickProfitAmount('')
      fetchOperation()
    } else {
      alert('Error al registrar ganancias')
    }

    setSavingQuickProfit(false)
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

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/operations/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      router.push('/operations')
    } else {
      alert('Error al eliminar la operación')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleMarkReturned = async (amount: number) => {
    const res = await fetch(`/api/operations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moneyReturned: amount
      })
    })

    if (res.ok) {
      fetchOperation()
    } else {
      alert('Error al actualizar')
    }
  }

  const handlePayCommission = async (amount: number, method: 'deduct' | 'bizum') => {
    if (!operation) return

    const isPerOperation = operation.person.commissionType === 'per_operation'

    // Si es per_operation, actualizar Operation.commissionPaid
    // Si es fixed_total, actualizar Person.commissionPaid
    if (isPerOperation) {
      const res = await fetch(`/api/operations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionPaid: operation.commissionPaid + amount
        })
      })

      if (!res.ok) {
        alert('Error al pagar comisión')
        return
      }
    } else {
      // Para fixed_total, actualizar en Person
      const res = await fetch(`/api/persons/${operation.person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionPaid: operation.person.commissionPaid + amount
        })
      })

      if (!res.ok) {
        alert('Error al pagar comisión')
        return
      }
    }

    // Si el método es 'deduct', marcar la deuda completa como devuelta
    // (la comisión se descontó de lo que físicamente devolvió, pero la deuda está saldada)
    if (method === 'deduct') {
      const owesData = calculateOwes(operation.bets.map(bet => ({
        betType: bet.betType,
        stake: bet.stake,
        oddsBack: bet.oddsBack,
        oddsLay: bet.oddsLay,
        liability: bet.liability,
        result: bet.result,
        actualProfit: bet.actualProfit
      })))

      // Marcar toda la deuda como devuelta (la comisión ya se descontó)
      await fetch(`/api/operations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moneyReturned: owesData.totalOwes
        })
      })
    }

    fetchOperation()
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

  // Calcular lo que te debe basándose en los resultados de las apuestas
  const owesData = calculateOwes(operation.bets.map(bet => ({
    betType: bet.betType,
    stake: bet.stake,
    oddsBack: bet.oddsBack,
    oddsLay: bet.oddsLay,
    liability: bet.liability,
    result: bet.result,
    actualProfit: bet.actualProfit
  })))

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <Breadcrumbs items={
          fromPersonId
            ? [
                { label: 'Dashboard', href: '/' },
                { label: 'Personas', href: '/persons' },
                { label: operation.person.name, href: `/persons/${fromPersonId}` },
                { label: operation.bookmaker.name }
              ]
            : [
                { label: 'Dashboard', href: '/' },
                { label: 'Operaciones', href: '/operations' },
                { label: `${operation.person.name} - ${operation.bookmaker.name}` }
              ]
        } />

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
          <span className={`badge badge-${operation.status} text-base px-3 py-1`}>
            {getStatusLabel(operation.status)}
          </span>
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
            <div className="space-y-4">
              {/* Fila principal de datos */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Bizum enviado</p>
                  <p className="text-xl font-bold">{formatMoney(operation.bizumSent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Devuelto</p>
                  <p className="text-xl font-bold">{formatMoney(operation.moneyReturned)}</p>
                </div>
                <OwesDisplay
                  owesData={owesData}
                  moneyReturned={operation.moneyReturned}
                  formatMoney={formatMoney}
                  onMarkReturned={handleMarkReturned}
                />
              </div>

              {/* Sección de comisiones */}
              {(operation.person.commission > 0 || operation.commission > 0) && (
                <CommissionSection
                  operation={operation}
                  owesData={owesData}
                  formatMoney={formatMoney}
                  onPayCommission={handlePayCommission}
                />
              )}
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

        {/* Progreso de la operación */}
        {(() => {
          const qualifyingBets = operation.bets.filter(b => b.betType === 'qualifying')
          const freebetBets = operation.bets.filter(b => b.betType === 'freebet')
          const qualifyingCompleted = qualifyingBets.filter(b => b.result !== null).length
          const freebetCompleted = freebetBets.filter(b => b.result !== null).length

          return (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-4">Progreso</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Progreso Qualifying */}
                <div className={`p-4 rounded-lg border-2 ${
                  qualifyingCompleted === qualifyingBets.length
                    ? 'border-emerald-600 bg-emerald-900/20'
                    : operation.status === 'qualifying' || operation.status === 'pending'
                      ? 'border-amber-600 bg-amber-900/20'
                      : 'border-gray-600 bg-gray-700'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Qualifying</span>
                    <span className={`text-sm ${qualifyingCompleted === qualifyingBets.length ? 'text-profit' : 'text-warning'}`}>
                      {qualifyingCompleted}/{qualifyingBets.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${qualifyingCompleted === qualifyingBets.length ? 'progress-fill-success' : 'progress-fill-warning'}`}
                      style={{ width: `${qualifyingBets.length > 0 ? (qualifyingCompleted / qualifyingBets.length) * 100 : 0}%` }}
                    />
                  </div>
                  {qualifyingCompleted === qualifyingBets.length ? (
                    <p className="text-xs text-profit mt-2">✓ Completado</p>
                  ) : (
                    <p className="text-xs text-warning mt-2">⏳ En progreso</p>
                  )}
                </div>

                {/* Progreso Freebet */}
                <div className={`p-4 rounded-lg border-2 ${
                  freebetCompleted === freebetBets.length && freebetBets.length > 0
                    ? 'border-emerald-600 bg-emerald-900/20'
                    : operation.status === 'freebet'
                      ? 'border-blue-600 bg-blue-900/20'
                      : qualifyingCompleted < qualifyingBets.length
                        ? 'border-gray-700 bg-gray-800 opacity-50'
                        : 'border-gray-600 bg-gray-700'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Freebet</span>
                    <span className={`text-sm ${
                      freebetCompleted === freebetBets.length && freebetBets.length > 0 ? 'text-profit' :
                      operation.status === 'freebet' ? 'text-info' : 'text-muted'
                    }`}>
                      {freebetCompleted}/{freebetBets.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        freebetCompleted === freebetBets.length && freebetBets.length > 0 ? 'progress-fill-success' :
                        operation.status === 'freebet' ? 'progress-fill-info' : 'bg-gray-500'
                      }`}
                      style={{ width: `${freebetBets.length > 0 ? (freebetCompleted / freebetBets.length) * 100 : 0}%` }}
                    />
                  </div>
                  {qualifyingCompleted < qualifyingBets.length ? (
                    <p className="text-xs text-muted mt-2">🔒 Completa qualifying primero</p>
                  ) : freebetCompleted === freebetBets.length && freebetBets.length > 0 ? (
                    <p className="text-xs text-profit mt-2">✓ Completado</p>
                  ) : (
                    <p className="text-xs text-info mt-2">⏳ Pendiente</p>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Stats de apuestas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-400">
              {operation.status === 'completed' ? 'Beneficio' : 'Beneficio esperado'}
            </p>
            <p className={`text-xl font-bold ${
              operation.status === 'completed'
                ? (operation.totalProfit >= 0 ? 'positive' : 'negative')
                : 'text-info'
            }`}>
              {formatMoney(operation.status === 'completed' ? operation.totalProfit : operation.totalExpectedProfit)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-400">Liability actual</p>
            <p className="text-xl font-bold text-warning">{formatMoney(operation.totalLiability)}</p>
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

        {/* Apuestas Qualifying */}
        {(() => {
          const qualifyingBets = operation.bets.filter(b => b.betType === 'qualifying')
          const allQualifyingDone = qualifyingBets.every(b => b.result !== null)
          const maxQualifying = operation.bookmaker.numQualifying || 999
          const canAddMoreQualifying = qualifyingBets.length < maxQualifying
          const canAddQualifying = canAddMoreQualifying && (operation.status === 'pending' || operation.status === 'qualifying' || !allQualifyingDone)

          return (
            <div className="card mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Apuestas Qualifying ({qualifyingBets.filter(b => b.result !== null).length}/{qualifyingBets.length})
                </h2>
                {canAddQualifying && (
                  <button
                    onClick={() => setShowAddQualifying(true)}
                    className="btn btn-primary text-sm"
                  >
                    + Añadir Qualifying
                  </button>
                )}
              </div>
              {qualifyingBets.length > 0 ? (
                <div className="space-y-4">
                  {qualifyingBets.map(bet => (
                    <BetCard key={bet.id} bet={bet} onSetResult={handleSetResult} onSetManualProfit={handleSetManualProfit} onDelete={handleDeleteBet} onEdit={handleEditBet} formatMoney={formatMoney} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No hay qualifying bets. Haz click en &quot;Añadir Qualifying&quot; para crear una.
                </p>
              )}
            </div>
          )
        })()}

        {/* Apuestas Freebet */}
        {(() => {
          const qualifyingBets = operation.bets.filter(b => b.betType === 'qualifying')
          const freebetBets = operation.bets.filter(b => b.betType === 'freebet')
          const allQualifyingDone = qualifyingBets.every(b => b.result !== null)
          const maxFreebets = operation.bookmaker.numFreebets || 999
          const canAddMoreFreebets = freebetBets.length < maxFreebets

          return (
            <div className={`card mb-6 ${!allQualifyingDone ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Apuestas Freebet ({freebetBets.filter(b => b.result !== null).length}/{freebetBets.length})
                  {!allQualifyingDone && <span className="text-sm text-gray-400 ml-2">- Completa qualifying primero</span>}
                </h2>
                {allQualifyingDone && (
                  <div className="flex gap-2">
                    {canAddMoreFreebets && (
                      <button
                        onClick={() => setShowAddFreebet(true)}
                        className="btn btn-primary text-sm"
                      >
                        + Añadir Freebet
                      </button>
                    )}
                    {freebetBets.length === 0 && (
                      <button
                        onClick={() => setShowQuickProfit(true)}
                        className="btn btn-secondary text-sm"
                      >
                        Registrar ganancias
                      </button>
                    )}
                  </div>
                )}
              </div>
              {freebetBets.length > 0 ? (
                <div className="space-y-4">
                  {freebetBets.map(bet => (
                    <BetCard
                      key={bet.id}
                      bet={bet}
                      onSetResult={handleSetResult}
                      onSetManualProfit={handleSetManualProfit}
                      onDelete={handleDeleteBet}
                      onEdit={handleEditBet}
                      formatMoney={formatMoney}
                      disabled={!allQualifyingDone}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {allQualifyingDone
                    ? 'No hay freebets. Haz click en "Añadir Freebet" para crear una.'
                    : 'Completa las qualifying bets primero.'}
                </p>
              )}
            </div>
          )
        })()}

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

        {/* Eliminar operación */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger w-full"
          >
            Eliminar operación
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">¿Eliminar operación?</h2>
            <p className="text-gray-400 mb-6">
              Se eliminará la operación de <strong>{operation.person.name}</strong> con <strong>{operation.bookmaker.name}</strong> y todas sus apuestas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-danger flex-1"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir freebet */}
      {showAddFreebet && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4 w-full">
            <h2 className="text-xl font-bold mb-4">Añadir Freebet</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Stake (€)</label>
                <input
                  type="number"
                  value={freebetForm.stake}
                  onChange={(e) => setFreebetForm({ ...freebetForm, stake: e.target.value })}
                  className="input"
                  placeholder="25"
                  step="0.01"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noLay"
                  checked={freebetForm.noLay}
                  onChange={(e) => setFreebetForm({ ...freebetForm, noLay: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="noLay" className="text-sm text-gray-300">
                  Sin igualar (poner ganancia a mano)
                </label>
              </div>
              {!freebetForm.noLay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Cuota Back</label>
                    <input
                      type="number"
                      value={freebetForm.oddsBack}
                      onChange={(e) => setFreebetForm({ ...freebetForm, oddsBack: e.target.value })}
                      className="input"
                      placeholder="3.0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="label">Cuota Lay</label>
                    <input
                      type="number"
                      value={freebetForm.oddsLay}
                      onChange={(e) => setFreebetForm({ ...freebetForm, oddsLay: e.target.value })}
                      className="input"
                      placeholder="3.1"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Evento (opcional)</label>
                  <input
                    type="text"
                    value={freebetForm.eventName}
                    onChange={(e) => setFreebetForm({ ...freebetForm, eventName: e.target.value })}
                    className="input"
                    placeholder="Real Madrid vs Barcelona"
                  />
                </div>
                <div>
                  <label className="label">Fecha y hora del partido</label>
                  <input
                    type="datetime-local"
                    value={freebetForm.eventDate}
                    onChange={(e) => setFreebetForm({ ...freebetForm, eventDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleAddFreebet}
                disabled={addingFreebet}
                className="btn btn-primary flex-1"
              >
                {addingFreebet ? 'Añadiendo...' : 'Añadir Freebet'}
              </button>
              <button
                onClick={() => {
                  setShowAddFreebet(false)
                  setFreebetForm({ stake: '', oddsBack: '', oddsLay: '', eventName: '', eventDate: '', noLay: false })
                }}
                disabled={addingFreebet}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir qualifying */}
      {showAddQualifying && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4 w-full">
            <h2 className="text-xl font-bold mb-4">Añadir Qualifying</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Stake (€)</label>
                <input
                  type="number"
                  value={qualifyingForm.stake}
                  onChange={(e) => setQualifyingForm({ ...qualifyingForm, stake: e.target.value })}
                  className="input"
                  placeholder="100"
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cuota Back</label>
                  <input
                    type="number"
                    value={qualifyingForm.oddsBack}
                    onChange={(e) => setQualifyingForm({ ...qualifyingForm, oddsBack: e.target.value })}
                    className="input"
                    placeholder="2.0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Cuota Lay</label>
                  <input
                    type="number"
                    value={qualifyingForm.oddsLay}
                    onChange={(e) => setQualifyingForm({ ...qualifyingForm, oddsLay: e.target.value })}
                    className="input"
                    placeholder="2.05"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Evento (opcional)</label>
                  <input
                    type="text"
                    value={qualifyingForm.eventName}
                    onChange={(e) => setQualifyingForm({ ...qualifyingForm, eventName: e.target.value })}
                    className="input"
                    placeholder="Real Madrid vs Barcelona"
                  />
                </div>
                <div>
                  <label className="label">Fecha y hora del partido</label>
                  <input
                    type="datetime-local"
                    value={qualifyingForm.eventDate}
                    onChange={(e) => setQualifyingForm({ ...qualifyingForm, eventDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleAddQualifying}
                disabled={addingQualifying}
                className="btn btn-primary flex-1"
              >
                {addingQualifying ? 'Añadiendo...' : 'Añadir Qualifying'}
              </button>
              <button
                onClick={() => {
                  setShowAddQualifying(false)
                  setQualifyingForm({ stake: '', oddsBack: '', oddsLay: '', eventName: '', eventDate: '' })
                }}
                disabled={addingQualifying}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar ganancias rápido */}
      {showQuickProfit && operation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4 w-full">
            <h2 className="text-xl font-bold mb-4">Registrar ganancias freebets</h2>
            <p className="text-gray-400 text-sm mb-4">
              Introduce el total que has ganado con las freebets de {operation.bookmaker.name} (sin igualar).
              <br />
              Valor total de freebets: {formatMoney(operation.bookmaker.maxBonus || operation.bookmaker.numFreebets * (operation.bookmaker.freebetValue || 0))}
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Total ganado (€)</label>
                <input
                  type="number"
                  value={quickProfitAmount}
                  onChange={(e) => setQuickProfitAmount(e.target.value)}
                  className="input text-2xl text-center"
                  placeholder="0.00"
                  step="0.01"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Pon 0 si perdiste todas las freebets</p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleQuickProfit}
                disabled={savingQuickProfit}
                className="btn btn-primary flex-1"
              >
                {savingQuickProfit ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowQuickProfit(false)
                  setQuickProfitAmount('')
                }}
                disabled={savingQuickProfit}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
