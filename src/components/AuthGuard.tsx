'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface UserStatus {
  id: string
  email: string
  isAdmin: boolean
  isApproved: boolean
}

// Rutas que no requieren aprobación
const PUBLIC_PATHS = ['/login', '/register', '/auth/callback', '/pending-approval']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'loading' | 'approved' | 'pending' | 'unauthenticated'>('loading')
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)

  useEffect(() => {
    // Si estamos en una ruta pública, no verificar
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      setStatus('approved')
      return
    }

    checkUserStatus()
  }, [pathname])

  const checkUserStatus = async () => {
    try {
      const res = await fetch('/api/auth/sync')

      if (res.status === 401) {
        // No autenticado, redirigir a login
        router.push('/login')
        return
      }

      if (!res.ok) {
        console.error('Error checking user status')
        setStatus('approved') // En caso de error, permitir acceso
        return
      }

      const data: UserStatus = await res.json()
      setUserStatus(data)

      if (data.isApproved || data.isAdmin) {
        setStatus('approved')
      } else {
        // Usuario no aprobado, redirigir a pending-approval
        router.push('/pending-approval')
        setStatus('pending')
      }
    } catch (err) {
      console.error('Error checking user status:', err)
      setStatus('approved') // En caso de error, permitir acceso
    }
  }

  // Mientras carga, mostrar loading
  if (status === 'loading' && !PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Verificando acceso...</div>
      </div>
    )
  }

  // Si está pendiente, no mostrar nada (ya redirigió)
  if (status === 'pending') {
    return null
  }

  return <>{children}</>
}

// Hook para obtener el estado del usuario actual
export function useUserStatus() {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/sync')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUserStatus(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { userStatus, loading, isAdmin: userStatus?.isAdmin ?? false }
}
