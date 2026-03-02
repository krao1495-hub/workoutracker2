'use client'

import { SetLog } from '@/lib/types'
import { Check } from 'lucide-react'

interface SetRowProps {
  set: SetLog
  weightUnit: 'lbs' | 'kg'
  prevWeight: number | null
  onChange: (set: SetLog) => void
}

export default function SetRow({ set, weightUnit, prevWeight, onChange }: SetRowProps) {
  const update = (patch: Partial<SetLog>) => onChange({ ...set, ...patch })

  const toggleComplete = () => {
    const nowComplete = !set.completed
    // Auto-fill reps from target if completing and reps is null
    update({ completed: nowComplete })
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        set.completed ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
      }`}
    >
      {/* Set label */}
      <span className={`text-sm font-semibold w-10 shrink-0 ${set.completed ? 'text-green-700' : 'text-slate-500'}`}>
        Set {set.setNumber}
      </span>

      {/* Weight input */}
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          inputMode="decimal"
          placeholder={prevWeight !== null ? String(prevWeight) : '0'}
          value={set.weight ?? ''}
          onChange={e => update({ weight: e.target.value === '' ? null : Number(e.target.value) })}
          className={`w-full min-w-0 text-center text-base font-medium border rounded-lg py-2 px-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            set.completed ? 'border-green-300 bg-white' : 'border-slate-300 bg-white'
          }`}
          style={{ fontSize: '16px' }} // Prevent iOS zoom
        />
        <span className="text-xs text-slate-500 shrink-0">{weightUnit}</span>
      </div>

      {/* Reps input */}
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={set.reps ?? ''}
          onChange={e => update({ reps: e.target.value === '' ? null : Number(e.target.value) })}
          className={`w-full min-w-0 text-center text-base font-medium border rounded-lg py-2 px-1 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            set.completed ? 'border-green-300 bg-white' : 'border-slate-300 bg-white'
          }`}
          style={{ fontSize: '16px' }}
        />
        <span className="text-xs text-slate-500 shrink-0">reps</span>
      </div>

      {/* Complete toggle */}
      <button
        onClick={toggleComplete}
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${
          set.completed
            ? 'bg-green-500 text-white'
            : 'bg-white border-2 border-slate-300 text-slate-400 hover:border-green-400'
        }`}
        aria-label={set.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        <Check className="w-5 h-5" />
      </button>
    </div>
  )
}
