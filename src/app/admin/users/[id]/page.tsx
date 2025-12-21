'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

interface UserData {
  user: {
    id: string
    supabaseId: string
    email: string
    isAdmin: boolean
    isApproved: boolean
    createdAt: string
  }
  stats: {
    totalOperations: number
    completedOperations: number
    totalProfit: number
    profitInExchange: number
    profitInBookmaker: number
    pendingToCollect: number
    personsCount: number
  }
  recentOperations: Array<{
    id: string
    personName: string
    bookmakerName: string
    status: string
    profit: number
    createdAt: string
  }>
  persons: Array<{
    id: string
    name: string
    commission: number
    commissionPaid: number
  }>
}

export default function AdminUserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchUserData()
    }
  }, [params.id])

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/admin/users/${params.id}`)
      if (res.status === 403) {
        router.push('/')
        return
      }
      if (res.status === 404) {
        setError('Usuario no encontrado')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Error al cargar datos')
      const userData = await res.json()
      setData(userData)
    } catch (err) {
      setError('Error al cargar datos del usuario')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <p className="text-red-400 mb-4">{error || 'Error desconocido'}</p>
          <Link href="/admin" className="btn btn-secondary">Volver al panel</Link>
        </div>
      </div>
    )
  }

  const { user, stats, recentOperations, persons } = data

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/admin" className="text-gray-400 hover:text-white mb-2 inline-block">
            &larr; Volver al panel
          </Link>
          <h1 className="text-3xl font-bold">{user.email}</h1>
          <div className="flex items-center gap-2 mt-2">
            {user.isAdmin && (
              <span className="px-2 py-1 bg-purple-600 text-xs rounded-full">Admin</span>
            )}
            {user.isApproved ? (
              <span className="px-2 py-1 bg-green-600 text-xs rounded-full">Aprobado</span>
            ) : (
              <span className="px-2 py-1 bg-yellow-600 text-xs rounded-full">Pendiente</span>
            )}
            <span className="text-gray-400 text-sm">
              Registrado: {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-400">Beneficio Total</p>
          <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(stats.totalProfit)}
          </p>
          {stats.totalProfit > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
              <div className="flex justify-between text-green-400">
                <span>Exchange:</span>
                <span>{formatMoney(stats.profitInExchange)} ({((stats.profitInExchange / stats.totalProfit) * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Casas:</span>
                <span>{formatMoney(stats.profitInBookmaker)} ({((stats.profitInBookmaker / stats.totalProfit) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Operaciones</p>
          <p className="text-2xl font-bold">
            {stats.completedOperations} / {stats.totalOperations}
          </p>
          <p className="text-xs text-gray-500">completadas</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Pendiente de Cobro</p>
          <p className={`text-2xl font-bold ${stats.pendingToCollect > 0 ? 'positive' : ''}`}>
            {formatMoney(stats.pendingToCollect)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400">Personas</p>
          <p className="text-2xl font-bold">{stats.personsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personas */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Personas ({persons.length})</h2>
          {persons.length === 0 ? (
            <p className="text-gray-500">No tiene personas registradas</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {persons.map(person => (
                <div
                  key={person.id}
                  className="flex justify-between items-center py-2 border-b border-gray-700"
                >
                  <span>{person.name}</span>
                  <div className="text-right text-sm">
                    <span className="text-gray-400">Comisión: {formatMoney(person.commission)}</span>
                    {person.commissionPaid > 0 && (
                      <span className="text-green-400 ml-2">(pagado: {formatMoney(person.commissionPaid)})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operaciones recientes */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Operaciones Recientes</h2>
          {recentOperations.length === 0 ? (
            <p className="text-gray-500">No tiene operaciones</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentOperations.map(op => (
                <div
                  key={op.id}
                  className="flex justify-between items-center py-2 border-b border-gray-700"
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
