'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ImportResult {
  message: string
  imported: number
  skipped: number
  total: number
  transactions: Array<{
    id: string
    type: string
    amount: number
    description: string
    personName: string
    date: string
  }>
}

export default function ImportPage() {
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCsvText(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError('Por favor, sube un archivo CSV o pega el contenido')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText })
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Error al importar')
      }
    } catch {
      setError('Error de conexión')
    }

    setLoading(false)
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Importar CSV de Revolut</h1>
          <Link href="/" className="btn btn-secondary">
            ← Volver
          </Link>
        </div>

        {/* Instrucciones */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-2">Cómo exportar el CSV de Revolut</h2>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Abre Revolut en tu móvil</li>
            <li>Ve a tu cuenta principal</li>
            <li>Pulsa en <strong>Extractos</strong> (icono de documento)</li>
            <li>Selecciona el período que quieras</li>
            <li>Elige formato <strong>CSV</strong></li>
            <li>Te llegará al email, descárgalo y súbelo aquí</li>
          </ol>
        </div>

        {/* Upload */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Subir archivo</h2>

          <div className="mb-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                cursor-pointer"
            />
          </div>

          <p className="text-gray-400 text-sm mb-2">O pega el contenido del CSV directamente:</p>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            className="input font-mono text-sm"
            placeholder="Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance..."
          />

          {error && (
            <p className="text-red-400 mt-2">{error}</p>
          )}

          <button
            onClick={handleImport}
            disabled={loading || !csvText.trim()}
            className="btn btn-primary mt-4"
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>

        {/* Resultados */}
        {result && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Resultado de la importación</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{result.imported}</p>
                <p className="text-sm text-gray-400">Importados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                <p className="text-sm text-gray-400">Duplicados (omitidos)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-sm text-gray-400">Total Bizums</p>
              </div>
            </div>

            {result.transactions.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Transacciones importadas:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.transactions.map(t => (
                    <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-sm text-gray-400">
                          {t.personName} · {new Date(t.date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className={t.type === 'bizum_in' ? 'positive' : 'negative'}>
                        {t.type === 'bizum_in' ? '+' : '-'}{formatMoney(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
