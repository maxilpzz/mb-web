'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  totalOperations: number
  completedOperations: number
  pendingOperations: number
  totalProfit: number
  totalBizumReceived: number
  totalPaid: number
  pendingToCollect: number
  totalLiability: number
  personsWithDebt: Array<{ id: string; name: string; balance: number }>
  recentOperations: Array<{
    id: string
    personName: string
    bookmaker: string
    status: string
    profit: number
    createdAt: string
  }>
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

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
        <div className="flex gap-4">
          <Link href="/operations/new" className="btn btn-primary">
            + Nueva Operación
          </Link>
          <Link href="/persons" className="btn btn-secondary">
            Personas
          </Link>
          <Link href="/import" className="btn btn-secondary">
            Importar CSV
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Liability Actual</p>
          <p className="text-2xl font-bold text-yellow-400">
            {formatMoney(data?.totalLiability || 0)}
          </p>
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
                    <span className="text-gray-400 text-sm ml-2">{op.bookmaker}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${op.status}`}>
                      {op.status === 'pending' ? 'Pendiente' :
                       op.status === 'in_progress' ? 'En curso' :
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
      </div>
    </div>
  )
}
