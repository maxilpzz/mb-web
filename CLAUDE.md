# Matched Betting App

## Descripción
Aplicación web para gestionar operaciones de matched betting con múltiples personas. Permite trackear apuestas qualifying y free bets, calcular liability y beneficios, y llevar control de saldos con cada persona.

## Modelo de negocio

### Flujo real de una operación
1. **Captas a una persona (ej: Juan)** para usar su DNI (tú ya quemaste tus bonos)
2. **Tú envías Bizum a Juan** (100€-200€) para que él deposite en la casa de apuestas
3. **Juan abre cuenta con su DNI** y deposita tu dinero
4. **Apuesta Qualifying**: Tú le dices qué apostar, Juan apuesta en su cuenta, tú cubres en tu exchange (Betfair)
5. **Se desbloquea el bono** (freebet)
6. **Apuesta Free Bet**: Juan apuesta el bono, tú cubres en tu exchange
7. **Ajuste de cuentas**: Según dónde quede el dinero, Juan te devuelve o tú le pagas
8. **Pago a Juan**: Le pagas una cantidad fija acordada por prestar su DNI

### Cálculo de saldos
- Si **quedó en la casa** → dinero en cuenta de Juan → **Juan te debe** (ROJO en la app)
- Si **quedó en exchange** → dinero en tu Betfair → mejor para ti (VERDE en la app)

### Estados de una operación
1. `pending` → Operación creada, qualifying sin empezar
2. `qualifying` → Trabajando en qualifying bet(s)
3. `freebet` → Qualifying completadas, trabajando en freebet(s)
4. `completed` → Todas las apuestas resueltas

---

## Casas de apuestas y bonos

### BONOS SIEMPRE (ganes o pierdas la qualifying)

#### 1. DAZN Bet - 200€
| Campo | Valor |
|-------|-------|
| Depósito | Mínimo 5€, máximo 200€ |
| Qualifying | 1 apuesta, cuota mínima 1.50 |
| Bono | 100% de lo apostado en freebet |
| Freebets | 1x hasta 200€ |
| Plazo | 30 días para apostar, freebet caduca en 7 días |
| Extra | +10€ freebet si apuestas 10€+, +1 mes DAZN gratis con 2º depósito |
| Activación | Manual desde "Promociones" antes del 1er depósito |

#### 2. William Hill - 200€
| Campo | Valor |
|-------|-------|
| Depósito | Mínimo 10€ |
| Qualifying | 1 apuesta, cuota mínima 2.00 |
| Bono | 100% de lo apostado hasta 200€ |
| Freebets | 1x hasta 200€ |
| Plazo | Freebet 15 días |
| Código | **BIENVENIDA200** |

#### 3. Sportium - 200€ (2x100€)
| Campo | Valor |
|-------|-------|
| Depósito | 100€ + 100€ (dos depósitos separados) |
| Qualifying | 2 apuestas (una por depósito), cuota mínima 1.50 |
| Bono | 100% de cada depósito |
| Freebets | 2x 100€ (en partidos DISTINTOS) |
| Plazo | 30 días para ambos depósitos, freebet 7 días |
| Código | **JBVIP** |

#### 4. Retabet - 150€
| Campo | Valor |
|-------|-------|
| Depósito | Mínimo 20€, máximo 150€ |
| Qualifying | 1 apuesta, cuota mínima 2.00 |
| Bono | 100% en freebets |
| Freebets | **6x 25€** (se liberan cada 48h, partidos DISTINTOS) |
| Cuota freebet | Mínima 2.00, **máxima 3.50** |
| Plazo | 15 días para depositar, 7 días para apostar |
| Extra | +50 tiradas gratis casino |
| Nota | Requiere más "suerte" por cuota máxima y partidos distintos |

---

### BONOS SOLO SI PIERDES (la qualifying)

#### 5. Winamax - 150€
| Campo | Valor |
|-------|-------|
| Depósito | Mínimo 15€, máximo 100€ |
| Qualifying | Apuestas hasta el importe del depósito |
| Bono | **150% de apuestas PERDIDAS** (hasta 150€) |
| Freebets | Según lo perdido |
| Plazo | 30 días |
| Código | **GOAT** |
| **IMPORTANTE** | Todo desde MISMO DISPOSITIVO (registro, depósito, apuestas) |

#### 6. Marca Apuestas - 200€
| Campo | Valor |
|-------|-------|
| Depósito | Mínimo 10€ |
| Qualifying | 1 apuesta, cuota mínima 1.50 |
| Bono | **100% SI PIERDES** (hasta 200€) |
| Freebets | 1x hasta 200€ |
| Cuota máx freebet | 10.00 |
| Plazo | 7 días para 1ª apuesta, freebet 7 días |
| Código | **BONO** |
| Activación | 48h para activar tras depósito |

---

## Stack técnico
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
│   │   ├── bookmakers/     # Lista de casas de apuestas
│   │   ├── dashboard/      # Estadísticas generales
│   │   ├── import/         # Importar CSV de Revolut
│   │   ├── operations/     # CRUD operaciones
│   │   │   └── [id]/       # Operación individual (GET, PATCH, DELETE)
│   │   └── persons/        # CRUD personas
│   ├── import/             # Página importar CSV
│   ├── operations/         # Lista y detalle de operaciones
│   │   ├── [id]/           # Detalle de operación con progreso visual
│   │   └── new/            # Nueva operación (auto-rellena según bookmaker)
│   ├── persons/            # Lista de personas con comisión
│   └── page.tsx            # Dashboard principal
├── lib/
│   ├── calculations.ts     # Fórmulas de matched betting
│   └── db.ts               # Cliente Prisma
prisma/
├── schema.prisma           # Modelos de base de datos
└── seed.ts                 # Precarga 6 casas de apuestas
```

## Modelos de datos
- **Person**: Personas con las que haces MB (incluye comisión acordada)
- **Bookmaker**: Casas de apuestas con toda su configuración de bonos
- **Operation**: Cada operación de bono (persona + bookmaker)
- **Deposit**: Depósitos por operación (Sportium necesita 2)
- **Bet**: Apuestas individuales (qualifying o freebet, con betNumber para múltiples)
- **Transaction**: Bizums importados de Revolut

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
npm run seed         # Precargar casas de apuestas
npx prisma studio    # Ver/editar datos en navegador
npx prisma migrate dev --name nombre  # Nueva migración
```

## URLs importantes
- **App en producción**: https://mb-web-iq9e.vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/gpgnwlyiudrfyogijnzz
- **GitHub Repo**: https://github.com/maxilpzz/mb-web
- **Vercel Dashboard**: https://vercel.com (buscar proyecto mb-web)

## Estado actual (15 Dic 2024)
- [x] App funcional con features básicas
- [x] Base de datos en Supabase
- [x] Repositorio en GitHub con auto-deploy a Vercel
- [x] **Soporte múltiples qualifying/freebets** (Sportium 2+2, Retabet 1+6)
- [x] **Modelo Bookmaker** con configuración completa de bonos
- [x] **6 casas precargadas** con sus bonos y códigos
- [x] **Campos corregidos**: bizumSent, moneyReturned, commissionPaid
- [x] **Formulario inteligente**: auto-rellena según casa seleccionada
- [x] **Progreso visual**: barras de progreso qualifying/freebet
- [x] **Flujo de estados**: pending → qualifying → freebet → completed
- [x] **Colores correctos**: exchange=verde (bueno), casa=rojo (malo)
- [x] **Eliminar operación** con confirmación

## Próximas mejoras posibles
- Calculadora de cuotas integrada
- Autenticación con Supabase Auth
- Gráficos de beneficios
- Exportar datos a Excel
- Importar CSV de Revolut para reconciliar bizums
- Notificaciones cuando caducan freebets

## MCP Servers configurados
Ver ~/.claude/settings.json:
- context7: Documentación de librerías
- github: Gestión de repos
- memory: Memoria persistente
- playwright: Automatización de navegador

---

## Última sesión (15 Dic 2024)

### Cambios realizados:
1. **Nuevo modelo de datos** con Bookmaker, Deposit, y campos corregidos
2. **Seed de 6 casas de apuestas** con toda su configuración
3. **Formulario de nueva operación** que auto-genera campos según la casa
4. **Página de detalle mejorada** con:
   - Barras de progreso para qualifying y freebet
   - Secciones separadas para cada tipo de apuesta
   - Botones bloqueados hasta completar fase anterior
   - Colores: exchange=verde, casa=rojo
   - Botón eliminar operación con confirmación
5. **Flujo de estados automático**: el estado cambia según las apuestas resueltas

### Para continuar:
- La app está funcional y desplegada
- Puedes crear operaciones, marcar resultados, ver progreso
- Para añadir nueva casa: editar `prisma/seed.ts` y ejecutar `npm run seed`
