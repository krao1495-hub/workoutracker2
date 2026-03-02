'use client'

import { useEffect, useState } from 'react'
import { WorkoutLog } from '@/lib/types'
import { getLogs, getSettings } from '@/lib/storage'
import { buildChartData, getPR } from '@/lib/utils'
import { allExercises } from '@/lib/workoutProgram'
import ProgressChart from '@/components/ProgressChart'

export default function ProgressPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [selectedId, setSelectedId] = useState(allExercises[0]?.id ?? '')
  const [metric, setMetric] = useState<'maxWeight' | 'totalVolume'>('maxWeight')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')

  useEffect(() => {
    setLogs(getLogs())
    setWeightUnit(getSettings().weightUnit)
  }, [])

  // Only show exercises that have been logged at least once
  const loggedExerciseIds = new Set(
    logs.flatMap(l => l.exercises.map(e => e.exerciseId))
  )
  const availableExercises = allExercises.filter(e => loggedExerciseIds.has(e.id))

  const chartData = selectedId ? buildChartData(selectedId, logs) : []
  const pr = selectedId ? getPR(selectedId, logs) : null

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Progress</h1>

      {availableExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <p className="text-slate-400 text-sm">No exercise data yet.</p>
          <p className="text-slate-400 text-xs mt-1">Log some workouts to see your progress.</p>
        </div>
      ) : (
        <>
          {/* Exercise selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Exercise</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800"
              style={{ fontSize: '16px' }}
            >
              {availableExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {/* Metric toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            {(['maxWeight', 'totalVolume'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  metric === m
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'maxWeight' ? 'Max Weight' : 'Total Volume'}
              </button>
            ))}
          </div>

          {/* Chart */}
          <ProgressChart
            data={chartData}
            pr={pr}
            weightUnit={weightUnit}
            metric={metric}
          />

          {/* Summary stats */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Sessions</p>
                <p className="text-xl font-bold text-slate-800">{chartData.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">PR ({weightUnit})</p>
                <p className="text-xl font-bold text-blue-600">{pr ?? '—'}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Last ({weightUnit})</p>
                <p className="text-xl font-bold text-slate-800">
                  {chartData.at(-1)?.maxWeight ?? '—'}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
