'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const publicPaths = ['/login', '/register', '/pending-approval', '/auth/callback']
const hideFabPaths = ['/operations/new', '/admin']

export default function FloatingActionButton() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // No mostrar en paginas publicas
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  // No mostrar en paginas donde no tiene sentido (ya estas creando)
  if (hideFabPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  // No mostrar mientras carga o si no esta autenticado
  if (loading || !isAuthenticated) {
    return null
  }

  return (
    <Link
      href="/operations/new"
      className="fixed z-50 bottom-20 md:bottom-6 right-4 md:right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center text-white text-2xl font-bold transition-all hover:scale-110 active:scale-95"
      title="Nueva operacion"
    >
      +
    </Link>
  )
}
