'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserStatus {
  isAdmin: boolean
  isApproved: boolean
}

interface NavLink {
  href: string
  label: string
  showBadge?: boolean
}

const navLinks: NavLink[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/live', label: 'En Vivo', showBadge: true },
  { href: '/operations', label: 'Operaciones' },
  { href: '/persons', label: 'Personas' },
  { href: '/stats', label: 'Stats' },
]

const publicPaths = ['/login', '/register', '/pending-approval', '/auth/callback']

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
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
      setUser(user)
      setLoading(false)
    })

    fetch('/api/auth/sync')
      .then(res => res.ok ? res.json() : null)
      .then(data => setUserStatus(data))
      .catch(() => {})

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch pending bets on mount and every 30 seconds
  useEffect(() => {
    if (user) {
      fetchPendingBets()
      const interval = setInterval(fetchPendingBets, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // No mostrar navbar en paginas publicas
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  // Mientras carga, no mostrar nada
  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16" />
      </nav>
    )
  }

  // Si no hay usuario, no mostrar
  if (!user) {
    return null
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-white">
            MB
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
                {link.showBadge && pendingBetsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white animate-pulse">
                    {pendingBetsCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {userStatus?.isAdmin && (
              <Link href="/admin" className="btn btn-warning text-sm">
                Admin
              </Link>
            )}
            <span className="text-sm text-gray-400">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary text-sm"
            >
              Salir
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
                {link.showBadge && pendingBetsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {pendingBetsCount}
                  </span>
                )}
              </Link>
            ))}

            {userStatus?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-yellow-400 hover:bg-gray-800/50"
              >
                Admin
              </Link>
            )}

            <div className="border-t border-gray-800 pt-3 mt-3">
              <p className="px-3 py-2 text-sm text-gray-500">{user.email}</p>
              <button
                onClick={() => {
                  setIsOpen(false)
                  handleLogout()
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-400 hover:bg-gray-800/50"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
