import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RevolutTransaction {
  Type: string
  Product: string
  'Started Date': string
  'Completed Date': string
  Description: string
  Amount: string
  Fee: string
  Currency: string
  State: string
  Balance: string
}

// POST: Importar CSV de Revolut
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { csvData } = body

    if (!csvData) {
      return NextResponse.json({ error: 'No se proporcionaron datos' }, { status: 400 })
    }

    // Parsear CSV
    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''))

    const transactions: RevolutTransaction[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === headers.length) {
        const transaction: Record<string, string> = {}
        headers.forEach((header: string, index: number) => {
          transaction[header] = values[index]
        })
        transactions.push(transaction as unknown as RevolutTransaction)
      }
    }

    // Filtrar solo Bizums (buscar en descripción)
    const bizumTransactions = transactions.filter(t => {
      const desc = t.Description?.toLowerCase() || ''
      return desc.includes('bizum') || t.Type?.toLowerCase().includes('transfer')
    })

    // Obtener personas existentes para hacer match
    const persons = await prisma.person.findMany()

    let imported = 0
    let skipped = 0
    const newTransactions = []

    for (const t of bizumTransactions) {
      // Crear ID único para evitar duplicados
      const revolutId = `${t['Started Date']}-${t.Amount}-${t.Description}`.replace(/[^a-zA-Z0-9]/g, '')

      // Verificar si ya existe
      const existing = await prisma.transaction.findUnique({
        where: { revolutId }
      })

      if (existing) {
        skipped++
        continue
      }

      // Intentar encontrar la persona por nombre en la descripción
      const description = t.Description || ''
      let matchedPerson = null

      for (const person of persons) {
        if (description.toLowerCase().includes(person.name.toLowerCase())) {
          matchedPerson = person
          break
        }
        // También buscar por teléfono si existe
        if (person.phone && description.includes(person.phone)) {
          matchedPerson = person
          break
        }
      }

      // Determinar tipo de transacción
      const amount = parseFloat(t.Amount?.replace(',', '.') || '0')
      const type = amount > 0 ? 'bizum_in' : 'bizum_out'

      // Crear transacción
      const newTransaction = await prisma.transaction.create({
        data: {
          personId: matchedPerson?.id || null,
          type,
          amount: Math.abs(amount),
          description,
          date: t['Completed Date'] ? new Date(t['Completed Date']) : new Date(),
          revolutId
        }
      })

      newTransactions.push({
        ...newTransaction,
        personName: matchedPerson?.name || 'Sin asignar'
      })
      imported++
    }

    return NextResponse.json({
      message: `Importación completada`,
      imported,
      skipped,
      total: bizumTransactions.length,
      transactions: newTransactions
    })
  } catch (error) {
    console.error('Error importing CSV:', error)
    return NextResponse.json({ error: 'Error al importar CSV' }, { status: 500 })
  }
}

// Función para parsear línea CSV (maneja comillas)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}
