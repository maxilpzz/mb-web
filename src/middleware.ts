import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/login', '/register', '/auth/callback']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Verificar si existe alguna cookie de Supabase Auth
  const hasAuthCookie = request.cookies.getAll().some(cookie =>
    cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
  )

  if (!hasAuthCookie) {
    // No hay cookie de auth, redirigir a login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
