'use client'

import { useState, useEffect, useRef } from 'react'

interface AccountingData {
  year: number
  exchange: {
    currentBalance: number
    wins: number
    losses: number
    netResult: number
    pendingBets: number
    totalLiability: number
  }
  commissions: {
    totalDue: number
    totalPaid: number
    pending: number
    byPerson: Array<{
      name: string
      due: number
      paid: number
      operations: number
    }>
  }
  cashFlow: {
    totalBizumSent: number
    totalMoneyReturned: number
    netFlow: number
    byPerson: Array<{
      name: string
      bizumSent: number
      moneyReturned: number
      balance: number
    }>
  }
  summary: {
    totalOperations: number
    completedOperations: number
    pendingOperations: number
  }
  monthlyData: Array<{
    month: string
    exchangeResult: number
    commissionsPaid: number
    bizumSent: number
    moneyReturned: number
  }>
}

export default function AccountingPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<AccountingData | null>(null)
  const [loading, setLoading] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounting?year=${year}`)
      if (res.ok) {
        const accountingData = await res.json()
        setData(accountingData)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const exportToCSV = () => {
    if (!data) return

    const lines: string[] = []

    // Header
    lines.push(`INFORME DE CONTABILIDAD - AÑO ${year}`)
    lines.push('')

    // Exchange
    lines.push('=== BALANCE EN EXCHANGE (BETFAIR) ===')
    lines.push(`Ganancias en Exchange,${data.exchange.wins.toFixed(2)}`)
    lines.push(`Pérdidas en Exchange,${data.exchange.losses.toFixed(2)}`)
    lines.push(`Resultado Neto,${data.exchange.netResult.toFixed(2)}`)
    lines.push(`Saldo Actual,${data.exchange.currentBalance.toFixed(2)}`)
    lines.push('')

    // Commissions
    lines.push('=== INGRESOS POR COMISIONES ===')
    lines.push(`Total Comisiones Cobradas,${data.commissions.totalPaid.toFixed(2)}`)
    lines.push('')
    lines.push('Desglose por Cliente:')
    lines.push('Cliente,Operaciones,Comisión Acordada,Comisión Cobrada')
    for (const person of data.commissions.byPerson) {
      lines.push(`${person.name},${person.operations},${person.due.toFixed(2)},${person.paid.toFixed(2)}`)
    }
    lines.push('')

    // Cash Flow
    lines.push('=== FLUJO DE EFECTIVO ===')
    lines.push(`Total Bizum Enviado,${data.cashFlow.totalBizumSent.toFixed(2)}`)
    lines.push(`Total Bizum Recibido,${data.cashFlow.totalMoneyReturned.toFixed(2)}`)
    lines.push(`Balance Neto,${data.cashFlow.netFlow.toFixed(2)}`)
    lines.push('')
    lines.push('Desglose por Cliente:')
    lines.push('Cliente,Bizum Enviado,Bizum Recibido,Balance')
    for (const person of data.cashFlow.byPerson) {
      lines.push(`${person.name},${person.bizumSent.toFixed(2)},${person.moneyReturned.toFixed(2)},${person.balance.toFixed(2)}`)
    }
    lines.push('')

    // Monthly
    lines.push('=== DATOS MENSUALES ===')
    lines.push('Mes,Resultado Exchange,Comisiones Cobradas,Bizum Enviado,Bizum Recibido')
    for (const month of data.monthlyData) {
      lines.push(`${month.month},${month.exchangeResult.toFixed(2)},${month.commissionsPaid.toFixed(2)},${month.bizumSent.toFixed(2)},${month.moneyReturned.toFixed(2)}`)
    }

    const csvContent = lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `contabilidad_${year}.csv`)
    link.click()
  }

  const exportToPDF = () => {
    window.print()
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Contabilidad</h1>
            <p className="text-gray-400">Informe fiscal para Hacienda</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="select"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={exportToCSV}
              disabled={!data}
              className="btn btn-secondary"
            >
              CSV
            </button>
            <button
              onClick={exportToPDF}
              disabled={!data}
              className="btn btn-primary"
            >
              Imprimir PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p>Cargando datos...</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400">No hay datos disponibles</p>
          </div>
        ) : (
          <div ref={reportRef} className="space-y-8 print:space-y-6">
            {/* Print Header - only visible when printing */}
            <div className="hidden print:block text-center mb-8">
              <h1 className="text-2xl font-bold">INFORME DE CONTABILIDAD</h1>
              <p className="text-lg">Año Fiscal {year}</p>
              <p className="text-sm text-gray-500">Generado el {new Date().toLocaleDateString('es-ES')}</p>
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
              <div className="card">
                <p className="text-sm text-gray-400">Operaciones</p>
                <p className="text-2xl font-bold">{data.summary.totalOperations}</p>
                <p className="text-xs text-muted">{data.summary.completedOperations} completadas</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-400">Resultado Exchange</p>
                <p className={`text-2xl font-bold ${data.exchange.netResult >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatMoney(data.exchange.netResult)}
                </p>
                <p className="text-xs text-muted">Betfair</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-400">Comisiones Cobradas</p>
                <p className="text-2xl font-bold text-profit">{formatMoney(data.commissions.totalPaid)}</p>
                <p className="text-xs text-muted">Ingresos reales</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-400">Flujo Neto</p>
                <p className={`text-2xl font-bold ${data.cashFlow.netFlow >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatMoney(data.cashFlow.netFlow)}
                </p>
                <p className="text-xs text-muted">Recibido - Enviado</p>
              </div>
            </div>

            {/* Sección 1: Balance en Exchange */}
            <div className="card print:break-inside-avoid">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm">1</span>
                Balance en Exchange (Betfair)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Este apartado demuestra que NO tienes ganancias por apuestas.
                El exchange siempre está en negativo porque cuando ganas en la casa, pierdes aquí.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400">Ganancias</p>
                  <p className="text-xl font-bold text-profit">+{formatMoney(data.exchange.wins)}</p>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400">Pérdidas (Liability)</p>
                  <p className="text-xl font-bold text-loss">-{formatMoney(data.exchange.losses)}</p>
                </div>
                <div className={`p-4 rounded-lg ${data.exchange.netResult >= 0 ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <p className="text-sm text-gray-400">Resultado Neto {year}</p>
                  <p className={`text-xl font-bold ${data.exchange.netResult >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatMoney(data.exchange.netResult)}
                  </p>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400">Saldo Actual</p>
                  <p className="text-xl font-bold">{formatMoney(data.exchange.currentBalance)}</p>
                </div>
              </div>

              {data.exchange.pendingBets > 0 && (
                <p className="text-sm text-warning">
                  ⚠️ Hay {data.exchange.pendingBets} apuestas pendientes con {formatMoney(data.exchange.totalLiability)} de liability
                </p>
              )}

              <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/50 print:bg-gray-100">
                <p className="text-sm">
                  <strong>Para Hacienda:</strong> El resultado neto en el exchange es{' '}
                  <span className={data.exchange.netResult >= 0 ? 'text-profit' : 'text-loss'}>
                    {formatMoney(data.exchange.netResult)}
                  </span>
                  {data.exchange.netResult < 0 && (
                    <>, lo que significa que NO hay ganancias de apuestas que declarar.</>
                  )}
                </p>
              </div>
            </div>

            {/* Sección 2: Ingresos por Comisiones */}
            <div className="card print:break-inside-avoid">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">2</span>
                Ingresos por Comisiones (Asesoría)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Este es tu ingreso real por servicios de asesoría. Es lo que debes declarar como actividad económica.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
                  <p className="text-sm text-gray-400">Total Acordado</p>
                  <p className="text-xl font-bold text-commission">{formatMoney(data.commissions.totalDue)}</p>
                </div>
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
                  <p className="text-sm text-gray-400">Total Cobrado</p>
                  <p className="text-xl font-bold text-profit">{formatMoney(data.commissions.totalPaid)}</p>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400">Pendiente de Cobro</p>
                  <p className="text-xl font-bold text-warning">{formatMoney(data.commissions.pending)}</p>
                </div>
              </div>

              {data.commissions.byPerson.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 text-gray-400">Cliente</th>
                        <th className="text-right py-2 text-gray-400">Operaciones</th>
                        <th className="text-right py-2 text-gray-400">Acordado</th>
                        <th className="text-right py-2 text-gray-400">Cobrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.commissions.byPerson.map((person, idx) => (
                        <tr key={idx} className="border-b border-gray-800">
                          <td className="py-2">{person.name}</td>
                          <td className="py-2 text-right">{person.operations}</td>
                          <td className="py-2 text-right text-commission">{formatMoney(person.due)}</td>
                          <td className="py-2 text-right text-profit">{formatMoney(person.paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td className="py-2">TOTAL</td>
                        <td className="py-2 text-right">{data.commissions.byPerson.reduce((s, p) => s + p.operations, 0)}</td>
                        <td className="py-2 text-right text-commission">{formatMoney(data.commissions.totalDue)}</td>
                        <td className="py-2 text-right text-profit">{formatMoney(data.commissions.totalPaid)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-700/50 print:bg-gray-100">
                <p className="text-sm">
                  <strong>Para Hacienda:</strong> Ingresos por actividad de asesoría:{' '}
                  <span className="text-profit font-bold">{formatMoney(data.commissions.totalPaid)}</span>
                </p>
              </div>
            </div>

            {/* Sección 3: Flujo de Efectivo */}
            <div className="card print:break-inside-avoid">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-sm">3</span>
                Flujo de Efectivo con Clientes
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Registro de movimientos Bizum para justificar transferencias bancarias.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-red-900/20 rounded-lg border border-red-700/50">
                  <p className="text-sm text-gray-400">Bizum Enviado</p>
                  <p className="text-xl font-bold text-loss">-{formatMoney(data.cashFlow.totalBizumSent)}</p>
                  <p className="text-xs text-muted">Dinero que envías a clientes</p>
                </div>
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
                  <p className="text-sm text-gray-400">Bizum Recibido</p>
                  <p className="text-xl font-bold text-profit">+{formatMoney(data.cashFlow.totalMoneyReturned)}</p>
                  <p className="text-xs text-muted">Devoluciones de clientes</p>
                </div>
                <div className={`p-4 rounded-lg ${data.cashFlow.netFlow >= 0 ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
                  <p className="text-sm text-gray-400">Balance Neto</p>
                  <p className={`text-xl font-bold ${data.cashFlow.netFlow >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatMoney(data.cashFlow.netFlow)}
                  </p>
                  <p className="text-xs text-muted">Recibido - Enviado</p>
                </div>
              </div>

              {data.cashFlow.byPerson.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 text-gray-400">Cliente</th>
                        <th className="text-right py-2 text-gray-400">Enviado</th>
                        <th className="text-right py-2 text-gray-400">Recibido</th>
                        <th className="text-right py-2 text-gray-400">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cashFlow.byPerson.map((person, idx) => (
                        <tr key={idx} className="border-b border-gray-800">
                          <td className="py-2">{person.name}</td>
                          <td className="py-2 text-right text-loss">-{formatMoney(person.bizumSent)}</td>
                          <td className="py-2 text-right text-profit">+{formatMoney(person.moneyReturned)}</td>
                          <td className={`py-2 text-right font-medium ${person.balance >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatMoney(person.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold">
                        <td className="py-2">TOTAL</td>
                        <td className="py-2 text-right text-loss">-{formatMoney(data.cashFlow.totalBizumSent)}</td>
                        <td className="py-2 text-right text-profit">+{formatMoney(data.cashFlow.totalMoneyReturned)}</td>
                        <td className={`py-2 text-right ${data.cashFlow.netFlow >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatMoney(data.cashFlow.netFlow)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="mt-4 p-4 bg-cyan-900/20 rounded-lg border border-cyan-700/50 print:bg-gray-100">
                <p className="text-sm">
                  <strong>Nota:</strong> El dinero enviado por Bizum es capital circulante que los clientes depositan
                  en sus cuentas de apuestas. Las devoluciones corresponden al dinero que queda en las casas de apuestas
                  una vez completadas las operaciones.
                </p>
              </div>
            </div>

            {/* Resumen Final */}
            <div className="card bg-gray-700 print:break-inside-avoid">
              <h2 className="text-lg font-semibold mb-4">Resumen Fiscal {year}</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-400">Ganancias por apuestas (Exchange)</span>
                  <span className={`font-bold ${data.exchange.netResult >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatMoney(data.exchange.netResult)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-600">
                  <span className="text-gray-400">Ingresos por asesoría (Comisiones)</span>
                  <span className="font-bold text-profit">{formatMoney(data.commissions.totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-lg">
                  <span className="font-semibold">Ingresos totales a declarar</span>
                  <span className="font-bold text-profit">
                    {formatMoney(Math.max(0, data.exchange.netResult) + data.commissions.totalPaid)}
                  </span>
                </div>
              </div>

              {data.exchange.netResult < 0 && (
                <p className="mt-4 text-sm text-gray-400">
                  * Las pérdidas en el exchange ({formatMoney(Math.abs(data.exchange.netResult))}) pueden compensar
                  otras ganancias por juego en la declaración de la renta.
                </p>
              )}
            </div>

            {/* Print footer */}
            <div className="hidden print:block text-center text-sm text-gray-500 mt-8 pt-4 border-t">
              <p>Documento generado automáticamente - MB Asesoría</p>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .card {
            background: white !important;
            border: 1px solid #ddd !important;
            color: black !important;
          }
          .text-gray-400, .text-gray-500, .text-muted {
            color: #666 !important;
          }
          .text-profit {
            color: #059669 !important;
          }
          .text-loss {
            color: #dc2626 !important;
          }
          .text-commission {
            color: #7c3aed !important;
          }
          .text-warning {
            color: #d97706 !important;
          }
          .bg-gray-700, .bg-gray-800 {
            background: #f3f4f6 !important;
          }
          nav, .btn, select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
