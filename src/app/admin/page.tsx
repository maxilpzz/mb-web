'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  supabaseId: string
  email: string
  isAdmin: boolean
  isApproved: boolean
  createdAt: string
  stats: {
    operations: number
    persons: number
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 403) {
        router.push('/')
        return
      }
      if (!res.ok) throw new Error('Error al cargar usuarios')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError('No tienes permisos de administrador')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string, approve: boolean) => {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: approve })
      })
      if (res.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, isApproved: approve } : u
        ))
      }
    } catch (err) {
      console.error(err)
    }
    setActionLoading(null)
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`¿Eliminar usuario ${email}? Esta acción no se puede deshacer.`)) return

    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
      }
    } catch (err) {
      console.error(err)
    }
    setActionLoading(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="btn btn-secondary">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  const pendingUsers = users.filter(u => !u.isApproved)
  const approvedUsers = users.filter(u => u.isApproved)

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <Link href="/" className="btn btn-secondary">Volver al Dashboard</Link>
      </div>

      {/* Usuarios pendientes */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Usuarios Pendientes de Aprobación
          {pendingUsers.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-yellow-600 text-sm rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </h2>

        {pendingUsers.length === 0 ? (
          <p className="text-gray-500">No hay usuarios pendientes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-left py-2 px-4">Registrado</th>
                  <th className="text-right py-2 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4 text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(user.id, true)}
                        disabled={actionLoading === user.id}
                        className="btn btn-success text-sm"
                      >
                        {actionLoading === user.id ? '...' : 'Aprobar'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={actionLoading === user.id}
                        className="btn btn-danger text-sm"
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usuarios aprobados */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">
          Usuarios Activos
          <span className="ml-2 text-gray-400 text-sm font-normal">
            ({approvedUsers.length})
          </span>
        </h2>

        {approvedUsers.length === 0 ? (
          <p className="text-gray-500">No hay usuarios aprobados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-4">Email</th>
                  <th className="text-center py-2 px-4">Rol</th>
                  <th className="text-center py-2 px-4">Personas</th>
                  <th className="text-center py-2 px-4">Operaciones</th>
                  <th className="text-left py-2 px-4">Registrado</th>
                  <th className="text-right py-2 px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      {user.email}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.isAdmin ? (
                        <span className="px-2 py-1 bg-purple-600 text-xs rounded-full">Admin</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-600 text-xs rounded-full">Usuario</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{user.stats.persons}</td>
                    <td className="py-3 px-4 text-center">{user.stats.operations}</td>
                    <td className="py-3 px-4 text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="btn btn-secondary text-sm"
                      >
                        Ver datos
                      </Link>
                      {!user.isAdmin && (
                        <button
                          onClick={() => handleApprove(user.id, false)}
                          disabled={actionLoading === user.id}
                          className="btn btn-warning text-sm"
                        >
                          Suspender
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
