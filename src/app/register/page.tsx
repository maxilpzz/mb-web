'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('Signup response:', { data, error })

      if (error) {
        setError(error.message === 'User already registered'
          ? 'Este email ya está registrado'
          : error.message)
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Signup error:', err)
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold mb-4">¡Revisa tu email!</h1>
          <p className="text-gray-400 mb-6">
            Te hemos enviado un enlace de confirmación a <strong>{email}</strong>.
            <br />
            Haz click en el enlace para activar tu cuenta.
          </p>
          <Link href="/login" className="btn btn-secondary">
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Matched Betting App</h1>
        <h2 className="text-lg text-gray-400 text-center mb-8">Crear cuenta</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="label">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
