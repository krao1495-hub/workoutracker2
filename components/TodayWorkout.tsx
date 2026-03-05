'use client'

import { useEffect, useState } from 'react'
import { WorkoutLog, Settings } from '@/lib/types'
import { getLogs, getLogForDate, saveLog, getSettings, getOverrides } from '@/lib/storage'
import {
  formatDate,
  formatDateDisplay,
  getEffectiveWorkoutType,
  getWeekInCycle,
  getWorkoutDisplayName,
  getWorkoutColors,
  getProgressTip,
  createInitialLog,
} from '@/lib/utils'
import ExerciseLogger from './ExerciseLogger'
import RunLogger from './RunLogger'
import FeedbackPanel from './FeedbackPanel'
import { CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TodayWorkout({ date }: { date?: string }) {
  const [log, setLog] = useState<WorkoutLog | null>(null)
  const [settings, setSettings] = useState<Settings>({
    email: '',
    cycleStartDate: '2026-03-02',
    weightUnit: 'lbs',
  })
  const [allLogs, setAllLogs] = useState<WorkoutLog[]>([])

  const todayStr = formatDate(new Date())
  const targetDate = date || todayStr
  const isToday = targetDate === todayStr

  useEffect(() => {
    const s = getSettings()
    setSettings(s)
    const logs = getLogs()
    setAllLogs(logs)

    const targetDateObj = date ? new Date(date + 'T12:00:00') : new Date()
    const dateStr = date || formatDate(new Date())
    const overrides = getOverrides()
    const workoutType = getEffectiveWorkoutType(targetDateObj, overrides)
    const weekInCycle = getWeekInCycle(targetDateObj, s.cycleStartDate)

    const existing = getLogForDate(dateStr)
    if (existing) {
      setLog(existing)
    } else {
      const fresh = createInitialLog(dateStr, workoutType, weekInCycle)
      setLog(fresh)
      saveLog(fresh)
    }
  }, [date])

  const updateLog = (updated: WorkoutLog) => {
    setLog(updated)
    saveLog(updated)
  }

  const resetLog = () => {
    const targetDateObj = date ? new Date(date + 'T12:00:00') : new Date()
    const overrides = getOverrides()
    const workoutType = getEffectiveWorkoutType(targetDateObj, overrides)
    const weekInCycle = getWeekInCycle(targetDateObj, settings.cycleStartDate)
    const fresh = createInitialLog(targetDate, workoutType, weekInCycle)
    updateLog(fresh)
  }

  if (!log) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-slate-400 text-sm">Loading today's workout...</div>
      </div>
    )
  }

  const { bg, border, text } = getWorkoutColors(log.workoutType)
  const tip = getProgressTip(log.weekInCycle)
  const isStrength =
    log.workoutType === 'legs_squat' ||
    log.workoutType === 'legs_no_squat' ||
    log.workoutType === 'upper_body'
  const isRun = log.workoutType === 'easy_run' || log.workoutType === 'long_run'
  const isYoga = log.workoutType === 'rest_yoga'
  const hasYoga = log.workoutType === 'rest_yoga' || log.workoutType === 'upper_body'
  const hasCore = log.workoutType === 'upper_body' || log.workoutType === 'legs_squat'

  return (
    <div className="space-y-4">
      {/* Back to calendar link (when viewing a different date) */}
      {!isToday && (
        <Link href="/calendar" className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" />
          Back to calendar
        </Link>
      )}

      {/* Date + workout header */}
      <div className={`rounded-xl p-4 border-2 ${bg} ${border}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-60 mb-0.5">
              {formatDateDisplay(log.date)}
            </p>
            <h2 className={`text-xl font-bold ${text}`}>
              {getWorkoutDisplayName(log.workoutType)}
            </h2>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text} border ${border}`}>
              Week {log.weekInCycle}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            {log.completed && (
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            )}
            <button
              onClick={resetLog}
              title="Reset this log"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Progressive overload tip */}
        {isStrength && (
          <p className={`mt-2 text-xs ${text} opacity-75 bg-white/50 rounded-lg px-3 py-1.5`}>
            💡 {tip}
          </p>
        )}
      </div>

      {/* Strength exercises */}
      {isStrength && (
        <ExerciseLogger
          exercises={log.exercises}
          weightUnit={settings.weightUnit}
          allLogs={allLogs}
          currentDate={log.date}
          onChange={exercises => updateLog({ ...log, exercises })}
        />
      )}

      {/* Run logger */}
      {isRun && (
        <RunLogger
          workoutType={log.workoutType}
          runData={log.runData}
          onChange={runData => updateLog({ ...log, runData })}
        />
      )}

      {/* Yoga card */}
      {hasYoga && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-2">
            {isYoga ? 'Yoga Practice' : '30 min Yoga'}
          </h3>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 cursor-pointer">
            <input
              type="checkbox"
              checked={log.yogaCompleted ?? false}
              onChange={e => updateLog({ ...log, yogaCompleted: e.target.checked })}
              className="w-5 h-5 accent-purple-600 cursor-pointer"
            />
            <div>
              <p className="font-medium text-purple-800">30 min Yoga</p>
              <p className="text-sm text-purple-600">
                {isYoga ? 'Rest day — focus on recovery & mobility' : 'Post-workout stretch & recovery'}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Core card */}
      {hasCore && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-2">Core</h3>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 cursor-pointer">
            <input
              type="checkbox"
              checked={log.coreCompleted ?? false}
              onChange={e => updateLog({ ...log, coreCompleted: e.target.checked })}
              className="w-5 h-5 accent-amber-600 cursor-pointer"
            />
            <div>
              <p className="font-medium text-amber-800">10 min Core Circuit</p>
              <p className="text-sm text-amber-600">Planks, dead bugs, hollow holds, or similar</p>
            </div>
          </label>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
        <textarea
          value={log.notes ?? ''}
          onChange={e => updateLog({ ...log, notes: e.target.value })}
          placeholder="PRs, how it felt, anything to remember..."
          rows={2}
          className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Feedback (not on pure rest/yoga) */}
      {!isYoga && (
        <FeedbackPanel
          feedback={log.feedback}
          onChange={feedback => updateLog({ ...log, feedback })}
        />
      )}

      {/* Mark complete */}
      <button
        onClick={() => updateLog({ ...log, completed: !log.completed })}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all active:scale-95 ${
          log.completed
            ? 'bg-green-500 text-white shadow-sm'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
        }`}
      >
        {log.completed ? '✓ Workout Complete!' : 'Mark Workout Complete'}
      </button>

      {/* Spacer so last button isn't hidden behind nav */}
      <div className="h-2" />
    </div>
  )
}
