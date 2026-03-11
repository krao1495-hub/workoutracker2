'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X, ArrowRightLeft } from 'lucide-react'
import { WorkoutType, WeekInCycle } from '@/lib/types'
import { getLogForDate, getOverrides, setOverride, removeOverride, getSettings } from '@/lib/storage'
import {
  formatDate,
  getWorkoutTypeForDate,
  getEffectiveWorkoutType,
  getWeekInCycle,
  getWorkoutDisplayName,
  getWorkoutColors,
} from '@/lib/utils'
import { workoutProgram } from '@/lib/workoutProgram'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SHORT_LABELS: Record<WorkoutType, string> = {
  rest_yoga:    'yoga',
  easy_run:     'run',
  long_run:     'long',
  legs_squat:   'squat',
  legs_no_squat:'legs',
  upper_body:   'upper',
  custom:       'cstm',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const router = useRouter()
  const today = new Date()
  const todayStr = formatDate(today)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [overrides, setOverrides] = useState<Record<string, WorkoutType>>({})
  const [cycleStartDate, setCycleStartDate] = useState('2026-03-02')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    function loadData() {
      setOverrides(getOverrides())
      const s = getSettings()
      setCycleStartDate(s.cycleStartDate)
    }

    loadData()

    window.addEventListener('workout-updated', loadData)
    return () => window.removeEventListener('workout-updated', loadData)
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build day cells for the grid
  const firstDayOfMonth = new Date(year, month, 1)
  // Mon-first: (getDay() + 6) % 7  → Mon=0 … Sun=6
  const firstDayOffset = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function dateStr(day: number) {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  function handleDayClick(day: number) {
    setSelectedDate(dateStr(day))
    setIsMoving(false)
  }

  function closeSheet() {
    setSelectedDate(null)
    setIsMoving(false)
  }

  function handleRemoveOverride() {
    if (!selectedDate) return
    removeOverride(selectedDate)
    setOverrides(getOverrides())
  }

  function handleMoveWorkout(targetDateStr: string) {
    if (!selectedDate || targetDateStr === selectedDate) return

    const sourceDate = new Date(selectedDate + 'T12:00:00')
    const targetDate = new Date(targetDateStr + 'T12:00:00')

    // Get current effective types for both dates
    const sourceType = getEffectiveWorkoutType(sourceDate, overrides)
    const targetType = getEffectiveWorkoutType(targetDate, overrides)

    // Get default types (without overrides) to check if override is needed
    const sourceDefault = getWorkoutTypeForDate(sourceDate)
    const targetDefault = getWorkoutTypeForDate(targetDate)

    // Swap: source gets target's type, target gets source's type
    if (targetType === sourceDefault) {
      removeOverride(selectedDate)
    } else {
      setOverride(selectedDate, targetType)
    }

    if (sourceType === targetDefault) {
      removeOverride(targetDateStr)
    } else {
      setOverride(targetDateStr, sourceType)
    }

    setOverrides(getOverrides())
    setIsMoving(false)
  }

  // Get the surrounding days for the move picker (Mon-Sun of the selected date's week)
  function getWeekDays(dateStr: string): { date: string; dayName: string; dayNum: number }[] {
    const d = new Date(dateStr + 'T12:00:00')
    const dayOfWeek = d.getDay() // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(d)
    monday.setDate(d.getDate() + mondayOffset)

    const days: { date: string; dayName: string; dayNum: number }[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push({
        date: formatDate(day),
        dayName: DAY_NAMES[day.getDay()],
        dayNum: day.getDate(),
      })
    }
    return days
  }

  // ── Selected day detail ───────────────────────────────────────────────────
  let sheetDate: Date | null = null
  let sheetWorkoutType: WorkoutType | null = null
  let sheetDefaultType: WorkoutType | null = null
  let sheetWeek: WeekInCycle | null = null
  let sheetIsOverridden = false
  let sheetLog = null as ReturnType<typeof getLogForDate>

  if (selectedDate) {
    sheetDate = new Date(selectedDate + 'T12:00:00')
    sheetDefaultType = getWorkoutTypeForDate(sheetDate)
    sheetLog = getLogForDate(selectedDate)
    // If there's a custom workout log, show it as custom instead of the scheduled type
    sheetWorkoutType = (sheetLog?.workoutType === 'custom') ? 'custom' : getEffectiveWorkoutType(sheetDate, overrides)
    sheetIsOverridden = !!overrides[selectedDate]
    sheetWeek = getWeekInCycle(sheetDate, cycleStartDate)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">
            {MONTH_NAMES[month]} {year}
          </h1>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />

            const ds = dateStr(day)
            const cellDate = new Date(year, month, day)
            const log = getLogForDate(ds)
            // If there's a custom workout log for this date, show it as custom
            const workoutType = (log?.workoutType === 'custom') ? 'custom' : getEffectiveWorkoutType(cellDate, overrides)
            const colors = getWorkoutColors(workoutType)
            const isToday = ds === todayStr
            const isOverridden = !!overrides[ds]
            const isCompleted = log?.completed === true

            return (
              <button
                key={ds}
                onClick={() => handleDayClick(day)}
                className={`relative flex flex-col items-center justify-start rounded-xl pt-1.5 pb-1 min-h-[64px] border transition-all active:scale-95 ${
                  isToday
                    ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent'
                    : 'border-slate-200'
                } bg-white`}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold leading-none ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                  {day}
                </span>

                {/* Workout type pill */}
                <span className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                  {SHORT_LABELS[workoutType]}
                </span>

                {/* Completed badge (top-right) */}
                {isCompleted && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
                )}

                {/* Override dot (bottom-right) */}
                {isOverridden && (
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Completed</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Rescheduled</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded ring-2 ring-blue-500 inline-block" /> Today</span>
        </div>
      </div>

      {/* Bottom sheet overlay */}
      {selectedDate && sheetDate && sheetWorkoutType && sheetWeek && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[55]"
            onClick={closeSheet}
          />

          {/* Sheet — z-[60] to sit above BottomNav (z-50) and CoachButton */}
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="max-w-md mx-auto w-full px-4 pt-4 flex-shrink-0">
              {/* Handle bar */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

              {/* Close button */}
              <button onClick={closeSheet} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10">
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="mb-3">
                <p className="text-sm text-slate-500 mb-0.5">
                  {sheetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getWorkoutColors(sheetWorkoutType).text}`}>
                    {sheetLog?.customName ?? getWorkoutDisplayName(sheetWorkoutType)}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getWorkoutColors(sheetWorkoutType).badge}`}>
                    Week {sheetWeek}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="max-w-md mx-auto w-full px-4">
                {/* Override banner */}
                {sheetIsOverridden && sheetDefaultType && (
                  <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                    <span className="text-base">⚠️</span>
                    <span>Rescheduled — default was <strong>{getWorkoutDisplayName(sheetDefaultType)}</strong></span>
                  </div>
                )}

                {/* Workout detail */}
                <WorkoutDetail workoutType={sheetWorkoutType} week={sheetWeek} dateStr={selectedDate ?? undefined} />

                {/* Move workout picker */}
                {isMoving && selectedDate && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Swap with:</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {getWeekDays(selectedDate).map(wd => {
                        const isCurrent = wd.date === selectedDate
                        const wdDate = new Date(wd.date + 'T12:00:00')
                        const wdType = getEffectiveWorkoutType(wdDate, overrides)
                        const wdColors = getWorkoutColors(wdType)
                        return (
                          <button
                            key={wd.date}
                            disabled={isCurrent}
                            onClick={() => handleMoveWorkout(wd.date)}
                            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border-2 text-xs transition-all ${
                              isCurrent
                                ? 'border-blue-400 bg-blue-50 opacity-60'
                                : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95'
                            }`}
                          >
                            <span className="font-semibold text-slate-600">{wd.dayName}</span>
                            <span className="text-slate-500">{wd.dayNum}</span>
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${wdColors.badge}`}>
                              {SHORT_LABELS[wdType]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 space-y-2 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                  {!isMoving && (
                    <button
                      onClick={() => setIsMoving(true)}
                      className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Move this workout
                    </button>
                  )}

                  {sheetIsOverridden && (
                    <button
                      onClick={handleRemoveOverride}
                      className="w-full py-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-sm transition-colors"
                    >
                      Reset to default schedule
                    </button>
                  )}

                  <button
                    onClick={() => {
                      closeSheet()
                      router.push(selectedDate === todayStr ? '/' : `/?date=${selectedDate}`)
                    }}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                  >
                    Log this workout →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Workout detail sub-component ─────────────────────────────────────────────

function WorkoutDetail({ workoutType, week, dateStr }: { workoutType: WorkoutType; week: WeekInCycle; dateStr?: string }) {
  const isStrength = workoutType === 'legs_squat' || workoutType === 'legs_no_squat' || workoutType === 'upper_body'
  const isCustom = workoutType === 'custom'
  const isEasyRun = workoutType === 'easy_run'
  const isLongRun = workoutType === 'long_run'
  const isYoga = workoutType === 'rest_yoga'

  if (isCustom && dateStr) {
    const log = getLogForDate(dateStr)
    if (log && log.exercises.length > 0) {
      return (
        <div className="space-y-2">
          <div className="bg-indigo-50 rounded-xl p-3 space-y-1.5">
            {log.exercises.map(e => (
              <div key={e.exerciseId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{e.name}</span>
                <span className="font-semibold text-slate-900">{e.targetSets} × {e.targetReps}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800">
        <p className="font-semibold">Custom Workout</p>
        <p className="text-xs mt-0.5 opacity-75">Coach-designed program</p>
      </div>
    )
  }

  if (isStrength) {
    const key = workoutType as 'legs_squat' | 'legs_no_squat' | 'upper_body'
    const entries = workoutProgram[key][week]
    const hasCore = workoutType === 'upper_body' || workoutType === 'legs_squat'
    return (
      <div className="space-y-2">
        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
          {entries.map(e => (
            <div key={e.exercise.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{e.exercise.name}</span>
              <span className="font-semibold text-slate-900">{e.targetSets} × {e.targetReps}</span>
            </div>
          ))}
        </div>
        {hasCore && (
          <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
            <span className="font-semibold">10 min Core Circuit</span>
            <span className="text-amber-600 text-xs ml-2">Planks · Dead bugs · Hollow holds</span>
          </div>
        )}
      </div>
    )
  }

  if (isEasyRun) {
    return (
      <div className="bg-orange-50 rounded-xl p-3 text-sm text-orange-800">
        <p className="font-semibold">Easy Run — 4 miles</p>
        <p className="text-xs mt-0.5 opacity-75">Conversational pace · Zone 2 effort</p>
      </div>
    )
  }

  if (isLongRun) {
    return (
      <div className="bg-rose-50 rounded-xl p-3 text-sm text-rose-800">
        <p className="font-semibold">Long Run — 5–7 miles</p>
        <p className="text-xs mt-0.5 opacity-75">Easy aerobic pace · Build time on feet</p>
      </div>
    )
  }

  if (isYoga) {
    return (
      <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-800">
        <p className="font-semibold">Rest + 30 min Yoga</p>
        <p className="text-xs mt-0.5 opacity-75">Focus on recovery & mobility</p>
      </div>
    )
  }

  return null
}
