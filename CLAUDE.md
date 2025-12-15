# Matched Betting App

## Descripción
Aplicación web para gestionar operaciones de matched betting con múltiples personas. Permite trackear apuestas qualifying y free bets, calcular liability y beneficios, y llevar control de saldos con cada persona.

## Stack
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Base de datos**: PostgreSQL en Supabase
- **ORM**: Prisma 5
- **Deploy**: Vercel (auto-deploy desde GitHub)
- **Repo**: https://github.com/maxilpzz/mb-web

## Estructura del proyecto
```
src/
├── app/
│   ├── api/
│   │   ├── bets/[id]/      # Actualizar resultado de apuestas
│   │   ├── dashboard/      # Estadísticas generales
│   │   ├── import/         # Importar CSV de Revolut
│   │   ├── operations/     # CRUD operaciones
│   │   └── persons/        # CRUD personas
│   ├── import/             # Página importar CSV
│   ├── operations/         # Lista y detalle de operaciones
│   │   ├── [id]/           # Detalle de operación
│   │   └── new/            # Nueva operación
│   ├── persons/            # Lista de personas
│   └── page.tsx            # Dashboard principal
├── lib/
│   ├── calculations.ts     # Fórmulas de matched betting
│   └── db.ts               # Cliente Prisma
prisma/
└── schema.prisma           # Modelos de base de datos
```

## Modelos de datos
- **Person**: Personas con las que haces MB
- **Operation**: Cada operación de bono (persona + casa de apuestas)
- **Bet**: Apuestas individuales (qualifying o freebet)
- **Transaction**: Bizums importados de Revolut
- **Bookmaker**: Casas de apuestas disponibles

## Flujo de uso
1. Añadir personas en /persons
2. Crear operación en /operations/new (seleccionar persona, casa, añadir apuestas)
3. Cuando termine el evento, marcar resultado (ganó/perdió en casa)
4. La app calcula automáticamente beneficio y saldos

## Variables de entorno (.env)
```
DATABASE_URL=postgresql://... (Supabase pooler con pgbouncer)
DIRECT_URL=postgresql://... (Supabase directo para migraciones)
NEXT_PUBLIC_SUPABASE_URL=https://gpgnwlyiudrfyogijnzz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Comandos útiles
```bash
npm run dev          # Desarrollo local
npm run build        # Build (incluye prisma generate)
npx prisma studio    # Ver/editar datos en navegador
npx prisma migrate dev --name nombre  # Nueva migración
```

## URLs importantes
- **Supabase Dashboard**: https://supabase.com/dashboard/project/gpgnwlyiudrfyogijnzz
- **GitHub Repo**: https://github.com/maxilpzz/mb-web
- **Vercel Dashboard**: https://vercel.com (buscar proyecto mb-web)

## Estado actual
- [x] App funcional con todas las features básicas
- [x] Base de datos en Supabase
- [x] Repositorio en GitHub
- [ ] Deploy en Vercel (en proceso)
- [ ] Configurar auto-deploy en Vercel

## Próximas mejoras posibles
- Autenticación (login) con Supabase Auth
- Gráficos de beneficios
- Exportar datos a Excel
- Notificaciones de eventos próximos
- Calculadora de apuestas integrada
- Mejoras de UI con v0.dev

## MCP Servers configurados
Ver ~/.claude/settings.json:
- context7: Documentación de librerías
- github: Gestión de repos
- memory: Memoria persistente
- playwright: Automatización de navegador
