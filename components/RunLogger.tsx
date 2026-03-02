'use client'

import { WorkoutType, RunLog } from '@/lib/types'
import { formatPace } from '@/lib/utils'

interface RunLoggerProps {
  workoutType: WorkoutType
  runData: RunLog | undefined
  onChange: (runData: RunLog) => void
}

const targets = {
  easy_run: { label: 'Target', detail: '4 miles @ ~9:00 /mi' },
  long_run:  { label: 'Target', detail: '5–7 miles (easy effort)' },
}

export default function RunLogger({ workoutType, runData, onChange }: RunLoggerProps) {
  const data: RunLog = runData ?? { distance: null, durationMinutes: null, durationSeconds: null }

  const update = (patch: Partial<RunLog>) => onChange({ ...data, ...patch })

  const totalMinutes =
    (data.durationMinutes ?? 0) + (data.durationSeconds ?? 0) / 60
  const pace = data.distance && data.distance > 0 && totalMinutes > 0
    ? formatPace(totalMinutes, data.distance)
    : '--'

  const target = targets[workoutType as keyof typeof targets]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Target */}
      {target && (
        <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
          <p className="text-sm font-medium text-orange-800">{target.label}: {target.detail}</p>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Distance */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Distance (miles)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="4.0"
            value={data.distance ?? ''}
            onChange={e => update({ distance: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full border border-slate-300 rounded-lg px-3 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                inputMode="numeric"
                placeholder="36"
                value={data.durationMinutes ?? ''}
                onChange={e => update({ durationMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-3 text-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-slate-500 text-center mt-1">min</p>
            </div>
            <span className="text-2xl text-slate-400 pb-5">:</span>
            <div className="flex-1">
              <input
                type="number"
                inputMode="numeric"
                placeholder="00"
                min={0}
                max={59}
                value={data.durationSeconds ?? ''}
                onChange={e => update({ durationSeconds: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-3 text-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-slate-500 text-center mt-1">sec</p>
            </div>
          </div>
        </div>

        {/* Calculated pace */}
        <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-600">Avg Pace</span>
          <span className="text-xl font-bold text-slate-800">{pace}</span>
        </div>
      </div>
    </div>
  )
}
