'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/live', label: 'En Vivo', icon: '🔴' },
  { href: '/operations', label: 'Ops', icon: '📋' },
  { href: '/persons', label: 'Personas', icon: '👥' },
  { href: '/stats', label: 'Stats', icon: '📊' },
]

const publicPaths = ['/login', '/register', '/pending-approval', '/auth/callback']

export default function BottomNav() {
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

  // No mostrar mientras carga o si no esta autenticado
  if (loading || !isAuthenticated) {
    return null
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(item.href)
                ? 'text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
