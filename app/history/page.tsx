'use client'

import { useEffect, useState } from 'react'
import { WorkoutLog } from '@/lib/types'
import { getLogs, exportData } from '@/lib/storage'
import { formatDateDisplay, getWorkoutDisplayName, getWorkoutColors } from '@/lib/utils'
import { ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react'

function ExerciseSummary({ log }: { log: WorkoutLog }) {
  if (log.workoutType === 'rest_yoga') {
    return (
      <p className="text-sm text-slate-600">
        Yoga: {log.yogaCompleted ? '✓ completed' : 'not logged'}
      </p>
    )
  }

  if (log.workoutType === 'easy_run' || log.workoutType === 'long_run') {
    const r = log.runData
    if (!r) return <p className="text-sm text-slate-500">No run data logged</p>
    const totalMins = (r.durationMinutes ?? 0) + (r.durationSeconds ?? 0) / 60
    const paceStr = r.distance && totalMins > 0
      ? (() => {
          const p = totalMins / r.distance!
          const m = Math.floor(p)
          const s = Math.round((p - m) * 60)
          return `${m}:${String(s).padStart(2, '0')} /mi`
        })()
      : '--'
    return (
      <div className="text-sm text-slate-600 space-y-0.5">
        <p>{r.distance ?? '--'} miles · {r.durationMinutes ?? '--'}:{String(r.durationSeconds ?? 0).padStart(2, '0')} · {paceStr}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-2">
      {log.exercises.map(ex => {
        const completed = ex.sets.filter(s => s.completed)
        return (
          <div key={ex.exerciseId}>
            <p className="text-sm font-medium text-slate-700">{ex.name}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {ex.sets.map(s => (
                <span
                  key={s.setNumber}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    s.completed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {s.completed
                    ? `${s.weight ?? '?'} × ${s.reps ?? '?'}`
                    : `Set ${s.setNumber} (skipped)`}
                </span>
              ))}
            </div>
            {completed.length > 0 && completed[0].weight && (
              <p className="text-xs text-blue-600 mt-0.5">
                Best: {Math.max(...completed.filter(s => s.weight !== null).map(s => s.weight!))} lbs
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function HistoryCard({ log }: { log: WorkoutLog }) {
  const [expanded, setExpanded] = useState(false)
  const { bg, border, text } = getWorkoutColors(log.workoutType)

  const feedbackEmoji = log.feedback === 'too_easy' ? '😤'
    : log.feedback === 'just_right' ? '💪'
    : log.feedback === 'too_hard' ? '😅'
    : null

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-2"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${bg} ${border} ${text}`}>
              {getWorkoutDisplayName(log.workoutType)}
            </span>
            {log.completed && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
            {feedbackEmoji && <span className="text-base">{feedbackEmoji}</span>}
            <span className={`text-xs font-medium ${text} opacity-70`}>Wk {log.weekInCycle}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{formatDateDisplay(log.date)}</p>
          {log.notes && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">"{log.notes}"</p>
          )}
        </div>
        <div className="shrink-0 text-slate-400 mt-0.5">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <ExerciseSummary log={log} />
          {log.notes && (
            <p className="text-sm text-slate-600 mt-2 italic">"{log.notes}"</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const all = getLogs().sort((a, b) => b.date.localeCompare(a.date))
    setLogs(all)
  }, [])

  const handleExport = () => {
    const data = exportData()
    navigator.clipboard.writeText(data).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">History</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-sm text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Export JSON'}
        </button>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <p className="text-slate-400 text-sm">No workouts logged yet.</p>
          <p className="text-slate-400 text-xs mt-1">Complete a workout to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <HistoryCard key={`${log.date}-${log.workoutType}`} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
