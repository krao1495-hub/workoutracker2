'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DataPoint {
  date: string
  maxWeight: number
  totalVolume: number
}

interface ProgressChartProps {
  data: DataPoint[]
  pr: number | null
  weightUnit: 'lbs' | 'kg'
  metric: 'maxWeight' | 'totalVolume'
}

export default function ProgressChart({ data, pr, weightUnit, metric }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-slate-400 text-sm">No data logged yet</p>
      </div>
    )
  }

  const yLabel = metric === 'maxWeight'
    ? `Max Weight (${weightUnit})`
    : `Total Volume (${weightUnit}×reps)`

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {pr !== null && metric === 'maxWeight' && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">PR</span>
          <span className="text-lg font-bold text-blue-600">{pr} {weightUnit}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(val: number) => [
              `${val} ${metric === 'maxWeight' ? weightUnit : `${weightUnit}·reps`}`,
              metric === 'maxWeight' ? 'Max Weight' : 'Volume',
            ]}
          />
          {pr !== null && metric === 'maxWeight' && (
            <ReferenceLine y={pr} stroke="#3b82f6" strokeDasharray="4 4" />
          )}
          <Line
            type="monotone"
            dataKey={metric}
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 text-center mt-1">{yLabel}</p>
    </div>
  )
}
