'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PendingApprovalPage() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || null)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <div className="text-6xl mb-4">
          <span className="inline-block animate-pulse">&#8987;</span>
        </div>
        <h1 className="text-2xl font-bold mb-4">Esperando aprobación</h1>
        <p className="text-gray-400 mb-6">
          Tu cuenta <strong>{email}</strong> está pendiente de aprobación por el administrador.
          <br /><br />
          Te notificaremos cuando tu cuenta sea activada.
        </p>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
