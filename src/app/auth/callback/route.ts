import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Obtener el usuario actual y crear/actualizar registro en nuestra BD
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await prisma.user.upsert({
          where: { supabaseId: user.id },
          update: { email: user.email || '' },
          create: {
            supabaseId: user.id,
            email: user.email || '',
            isApproved: false,
            isAdmin: false
          }
        })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
