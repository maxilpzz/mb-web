'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  href: string
  label: string
  icon: string
  showBadge?: boolean
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/live', label: 'En Vivo', icon: '🔴', showBadge: true },
  { href: '/operations', label: 'Ops', icon: '📋' },
  { href: '/persons', label: 'Personas', icon: '👥' },
  { href: '/stats', label: 'Stats', icon: '📊' },
]

const publicPaths = ['/login', '/register', '/pending-approval', '/auth/callback']

export default function BottomNav() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pendingBetsCount, setPendingBetsCount] = useState(0)

  // Fetch pending bets count
  const fetchPendingBets = async () => {
    try {
      const res = await fetch('/api/bets/pending')
      if (res.ok) {
        const bets = await res.json()
        setPendingBetsCount(Array.isArray(bets) ? bets.length : 0)
      }
    } catch {
      // Silently fail
    }
  }

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

  // Fetch pending bets on mount and every 30 seconds
  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingBets()
      const interval = setInterval(fetchPendingBets, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

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
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive(item.href)
                ? 'text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
            {item.showBadge && pendingBetsCount > 0 && (
              <span className="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingBetsCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
