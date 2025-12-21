'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthButton from '@/components/AuthButton'

interface DashboardData {
  totalOperations: number
  completedOperations: number
  pendingOperations: number
  totalProfit: number
  totalBizumSent: number
  totalMoneyReturned: number
  totalCommissionPaid: number
  pendingToCollect: number
  totalLiability: number
  personsWithDebt: Array<{ id: string; name: string; balance: number }>
  recentOperations: Array<{
    id: string
    personName: string
    bookmakerName: string
    status: string
    profit: number
    createdAt: string
  }>
  bookmakerSummary: Array<{
    id: string
    name: string
    operationsCount: number
    totalProfit: number
  }>
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exchangeBalance, setExchangeBalance] = useState<number>(0)
  const [editingExchange, setEditingExchange] = useState(false)
  const [exchangeInput, setExchangeInput] = useState('')
  const [savingExchange, setSavingExchange] = useState(false)

  useEffect(() => {
    // Fetch dashboard data
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })

    // Fetch exchange balance
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        setExchangeBalance(settings.exchangeBalance || 0)
        setExchangeInput(settings.exchangeBalance?.toString() || '0')
      })
      .catch(err => console.error(err))
  }, [])

  const handleSaveExchangeBalance = async () => {
    setSavingExchange(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeBalance: parseFloat(exchangeInput) || 0 })
      })
      if (res.ok) {
        const settings = await res.json()
        setExchangeBalance(settings.exchangeBalance)
        setEditingExchange(false)
      }
    } catch (err) {
      console.error(err)
    }
    setSavingExchange(false)
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Matched Betting Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link href="/stats" className="btn btn-secondary">
            Estadísticas
          </Link>
          <Link href="/operations" className="btn btn-secondary">
            Operaciones
          </Link>
          <Link href="/persons" className="btn btn-primary">
            Personas
          </Link>
          <AuthButton />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-400">Beneficio Total</p>
          <p className={`text-2xl font-bold ${(data?.totalProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(data?.totalProfit || 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Operaciones</p>
          <p className="text-2xl font-bold">{data?.completedOperations || 0} / {data?.totalOperations || 0}</p>
          <p className="text-xs text-gray-500">{data?.pendingOperations || 0} pendientes</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Pendiente de Cobro</p>
          <p className={`text-2xl font-bold ${(data?.pendingToCollect || 0) > 0 ? 'positive' : ''}`}>
            {formatMoney(data?.pendingToCollect || 0)}
          </p>
          <p className="text-xs text-gray-500">
            Enviado: {formatMoney(data?.totalBizumSent || 0)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Liability Actual</p>
          <p className="text-2xl font-bold text-yellow-400">
            {formatMoney(data?.totalLiability || 0)}
          </p>
        </div>
        {/* Saldo Exchange (editable) */}
        <div className="card bg-green-900/20 border border-green-800">
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-400">Saldo Exchange</p>
            {!editingExchange && (
              <button
                onClick={() => setEditingExchange(true)}
                className="text-xs text-green-400 hover:underline"
              >
                Editar
              </button>
            )}
          </div>
          {editingExchange ? (
            <div className="mt-2 space-y-2">
              <input
                type="number"
                value={exchangeInput}
                onChange={(e) => setExchangeInput(e.target.value)}
                className="input text-lg w-full"
                step="0.01"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveExchangeBalance}
                  disabled={savingExchange}
                  className="btn btn-success text-xs flex-1"
                >
                  {savingExchange ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setEditingExchange(false)
                    setExchangeInput(exchangeBalance.toString())
                  }}
                  className="btn btn-secondary text-xs flex-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-green-400">
                {formatMoney(exchangeBalance - (data?.totalLiability || 0))}
              </p>
              <p className="text-xs text-gray-500">
                {formatMoney(exchangeBalance)} - {formatMoney(data?.totalLiability || 0)} liability
              </p>
            </>
          )}
        </div>
      </div>

      {/* Money flow summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card bg-blue-900/20">
          <p className="text-sm text-gray-400">Bizum Enviado</p>
          <p className="text-xl font-bold">{formatMoney(data?.totalBizumSent || 0)}</p>
        </div>
        <div className="card bg-green-900/20">
          <p className="text-sm text-gray-400">Dinero Devuelto</p>
          <p className="text-xl font-bold">{formatMoney(data?.totalMoneyReturned || 0)}</p>
        </div>
        <div className="card bg-purple-900/20">
          <p className="text-sm text-gray-400">Comisiones Pagadas</p>
          <p className="text-xl font-bold">{formatMoney(data?.totalCommissionPaid || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personas con saldo */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Saldos Pendientes</h2>
          {data?.personsWithDebt && data.personsWithDebt.length > 0 ? (
            <div className="space-y-2">
              {data.personsWithDebt.map(person => (
                <div key={person.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span>{person.name}</span>
                  <span className={person.balance > 0 ? 'positive' : 'negative'}>
                    {person.balance > 0 ? 'Te debe ' : 'Le debes '}
                    {formatMoney(Math.abs(person.balance))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay saldos pendientes</p>
          )}
        </div>

        {/* Operaciones recientes */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Operaciones Recientes</h2>
          {data?.recentOperations && data.recentOperations.length > 0 ? (
            <div className="space-y-2">
              {data.recentOperations.map(op => (
                <Link
                  href={`/operations/${op.id}`}
                  key={op.id}
                  className="flex justify-between items-center py-2 border-b border-gray-700 hover:bg-gray-700 px-2 rounded"
                >
                  <div>
                    <span className="font-medium">{op.personName}</span>
                    <span className="text-gray-400 text-sm ml-2">{op.bookmakerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${op.status}`}>
                      {op.status === 'pending' ? 'Pendiente' :
                       op.status === 'qualifying' ? 'Qualifying' :
                       op.status === 'freebet' ? 'Freebet' :
                       op.status === 'completed' ? 'Completado' : op.status}
                    </span>
                    {op.profit !== 0 && (
                      <span className={op.profit >= 0 ? 'positive' : 'negative'}>
                        {formatMoney(op.profit)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay operaciones todavía</p>
          )}
          <Link href="/operations" className="block text-center text-blue-400 mt-4 hover:underline">
            Ver todas las operaciones
          </Link>
        </div>

        {/* Resumen por casa de apuestas */}
        {data?.bookmakerSummary && data.bookmakerSummary.length > 0 && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Beneficio por Casa de Apuestas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {data.bookmakerSummary.map(bm => (
                <div key={bm.id} className="p-3 bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium truncate">{bm.name}</p>
                  <p className={`text-lg font-bold ${bm.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                    {formatMoney(bm.totalProfit)}
                  </p>
                  <p className="text-xs text-gray-400">{bm.operationsCount} ops</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
