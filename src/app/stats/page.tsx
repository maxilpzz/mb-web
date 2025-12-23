'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

type Period = 'monthly' | 'yearly' | 'total'

interface StatsData {
  profitByPeriod: Array<{ period: string; profit: number }>
  cumulativeProfit: Array<{ period: string; profit: number; cumulative: number }>
  personsCompleted: Array<{ period: string; count: number }>
  totals: {
    grossProfit: number
    netProfit: number
    commissionsPaid: number
    operations: number
    persons: number
  }
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('monthly')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?period=${period}`)
      if (res.ok) {
        const statsData = await res.json()
        setData(statsData)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
    setLoading(false)
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const periodLabels: Record<Period, string> = {
    monthly: 'Mensual',
    yearly: 'Anual',
    total: 'Total'
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Estadísticas</h1>
        </div>

        {/* Period Toggle */}
        <div className="flex gap-2 mb-8">
          {(['monthly', 'yearly', 'total'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p>Cargando estadísticas...</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400">No hay datos disponibles</p>
          </div>
        ) : (
          <>
            {/* Totals Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="card">
                <p className="text-sm text-gray-400">Beneficio Bruto</p>
                <p className={`text-2xl font-bold ${data.totals.grossProfit >= 0 ? 'text-info' : 'text-loss'}`}>
                  {formatMoney(data.totals.grossProfit)}
                </p>
                <p className="text-xs text-muted mt-1">Ganancias de apuestas</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-400">Comisiones Pagadas</p>
                <p className="text-2xl font-bold text-commission">
                  -{formatMoney(data.totals.commissionsPaid)}
                </p>
                <p className="text-xs text-muted mt-1">Pagado a personas</p>
              </div>
              <div className="card border-2 border-emerald-600">
                <p className="text-sm text-gray-400">Beneficio Neto</p>
                <p className={`text-2xl font-bold ${data.totals.netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatMoney(data.totals.netProfit)}
                </p>
                <p className="text-xs text-muted mt-1">Tu ganancia real</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-400">Operaciones</p>
                <p className="text-2xl font-bold">{data.totals.operations}</p>
                <p className="text-xs text-gray-500 mt-1">Completadas</p>
              </div>
              <div className="card">
                <p className="text-sm text-gray-400">Personas</p>
                <p className="text-2xl font-bold">{data.totals.persons}</p>
                <p className="text-xs text-gray-500 mt-1">Con operaciones</p>
              </div>
            </div>

            {/* Charts */}
            <div className="space-y-8">
              {/* Profit by Period */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-1">
                  Beneficio Bruto por {period === 'monthly' ? 'Mes' : period === 'yearly' ? 'Año' : 'Total'}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Ganancias de las apuestas (sin descontar comisiones)
                </p>
                {data.profitByPeriod.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No hay datos para mostrar</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.profitByPeriod}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="period"
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          tickFormatter={(value) => `${value}€`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: '#F3F4F6' }}
                          formatter={(value) => [formatMoney(value as number), 'Beneficio']}
                        />
                        <Bar
                          dataKey="profit"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                          name="Beneficio"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Cumulative Profit */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-1">Beneficio Bruto Acumulado</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Total acumulado de ganancias de apuestas a lo largo del tiempo
                </p>
                {data.cumulativeProfit.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No hay datos para mostrar</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.cumulativeProfit}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="period"
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          tickFormatter={(value) => `${value}€`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: '#F3F4F6' }}
                          formatter={(value, name) => [
                            formatMoney(value as number),
                            name === 'cumulative' ? 'Acumulado' : 'Período'
                          ]}
                        />
                        <Legend
                          formatter={(value) => value === 'cumulative' ? 'Acumulado' : 'Período'}
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulative"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                          name="cumulative"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Persons Completed */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-1">
                  Personas Completadas por {period === 'monthly' ? 'Mes' : period === 'yearly' ? 'Año' : 'Total'}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Número de personas que completaron su primera operación
                </p>
                {data.personsCompleted.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No hay datos para mostrar</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.personsCompleted}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="period"
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: '#F3F4F6' }}
                          formatter={(value) => [value, 'Personas']}
                        />
                        <Bar
                          dataKey="count"
                          fill="#8B5CF6"
                          radius={[4, 4, 0, 0]}
                          name="Personas"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
