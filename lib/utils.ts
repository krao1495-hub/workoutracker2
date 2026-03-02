import { WorkoutType, WeekInCycle, WorkoutLog, ExerciseLog, SetLog } from './types'
import { workoutProgram } from './workoutProgram'

// Day-of-week → workout type (0 = Sunday)
export const DAY_WORKOUT_MAP: Record<number, WorkoutType> = {
  0: 'upper_body',
  1: 'rest_yoga',
  2: 'easy_run',
  3: 'legs_squat',
  4: 'easy_run',
  5: 'legs_no_squat',
  6: 'long_run',
}

export function getWorkoutTypeForDate(date: Date): WorkoutType {
  return DAY_WORKOUT_MAP[date.getDay()]
}

export function getEffectiveWorkoutType(
  date: Date,
  overrides: Record<string, WorkoutType>
): WorkoutType {
  return overrides[formatDate(date)] ?? getWorkoutTypeForDate(date)
}

export function getWeekInCycle(date: Date, cycleStartDate: string): WeekInCycle {
  // Find the Monday of the cycle-start week
  const start = new Date(cycleStartDate + 'T12:00:00')
  const startDay = start.getDay()
  const startMonday = new Date(start)
  startMonday.setDate(start.getDate() - ((startDay + 6) % 7))

  // Find the Monday of the current week
  const current = new Date(date)
  const currentDay = current.getDay()
  const currentMonday = new Date(current)
  currentMonday.setDate(current.getDate() - ((currentDay + 6) % 7))

  const diffMs = currentMonday.getTime() - startMonday.getTime()
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))

  if (diffWeeks < 0) return 'A'  // Before cycle start → default to A

  const idx = diffWeeks % 3
  if (idx === 0) return 'A'
  if (idx === 1) return 'B'
  return 'C'
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getWorkoutDisplayName(type: WorkoutType): string {
  switch (type) {
    case 'rest_yoga':     return 'Rest + 30 min Yoga'
    case 'easy_run':      return 'Easy Run — 4 mi'
    case 'legs_squat':    return 'Legs (Squat Day)'
    case 'legs_no_squat': return 'Legs'
    case 'long_run':      return 'Long Run — 5–7 mi'
    case 'upper_body':    return 'Upper Body + Yoga'
  }
}

export function getWorkoutColors(type: WorkoutType): {
  bg: string; border: string; text: string; badge: string
} {
  switch (type) {
    case 'rest_yoga':
      return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' }
    case 'easy_run':
      return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' }
    case 'long_run':
      return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-700' }
    case 'legs_squat':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' }
    case 'legs_no_squat':
      return { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', badge: 'bg-teal-100 text-teal-700' }
    case 'upper_body':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' }
  }
}

export function getProgressTip(week: WeekInCycle): string {
  switch (week) {
    case 'A': return 'Week A: Establish your working weights. Note any movements that felt easy.'
    case 'B': return 'Week B: Try to add 1–2 reps per set vs. last week, or +5 lbs if reps were maxed.'
    case 'C': return 'Week C: One extra set today. Next week (A) reset rep scheme & add 5–10 lbs base weight.'
  }
}

export function createInitialLog(
  date: string,
  workoutType: WorkoutType,
  weekInCycle: WeekInCycle
): WorkoutLog {
  const exercises: ExerciseLog[] = []

  const isStrength =
    workoutType === 'legs_squat' ||
    workoutType === 'legs_no_squat' ||
    workoutType === 'upper_body'

  if (isStrength) {
    const key = workoutType as 'legs_squat' | 'legs_no_squat' | 'upper_body'
    const programEntries = workoutProgram[key][weekInCycle]

    for (const entry of programEntries) {
      const sets: SetLog[] = []
      for (let i = 1; i <= entry.targetSets; i++) {
        sets.push({ setNumber: i, reps: null, weight: null, completed: false })
      }
      exercises.push({
        exerciseId: entry.exercise.id,
        name: entry.exercise.name,
        targetSets: entry.targetSets,
        targetReps: entry.targetReps,
        sets,
      })
    }
  }

  return {
    date,
    workoutType,
    weekInCycle,
    exercises,
    completed: false,
  }
}

// Get the max weight logged for an exercise across all past logs
export function getPreviousMaxWeight(
  exerciseId: string,
  allLogs: WorkoutLog[],
  excludeDate?: string
): number | null {
  const relevant = allLogs
    .filter(l => l.date !== excludeDate)
    .filter(l => l.exercises.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date))

  for (const log of relevant) {
    const ex = log.exercises.find(e => e.exerciseId === exerciseId)
    if (!ex) continue
    const weights = ex.sets
      .filter(s => s.completed && s.weight !== null)
      .map(s => s.weight as number)
    if (weights.length > 0) return Math.max(...weights)
  }
  return null
}

// Build chart data for progress page
export function buildChartData(
  exerciseId: string,
  allLogs: WorkoutLog[]
): { date: string; maxWeight: number; totalVolume: number }[] {
  return allLogs
    .filter(l => l.exercises.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(log => {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId)!
      const completedSets = ex.sets.filter(s => s.completed && s.weight !== null && s.reps !== null)
      const maxWeight = completedSets.length > 0
        ? Math.max(...completedSets.map(s => s.weight as number))
        : 0
      const totalVolume = completedSets.reduce(
        (sum, s) => sum + (s.weight as number) * (s.reps as number),
        0
      )
      return { date: formatDateShort(log.date), maxWeight, totalVolume }
    })
    .filter(d => d.maxWeight > 0)
}

export function getPR(exerciseId: string, allLogs: WorkoutLog[]): number | null {
  const data = buildChartData(exerciseId, allLogs)
  if (data.length === 0) return null
  return Math.max(...data.map(d => d.maxWeight))
}

export function formatPace(totalMinutes: number, distanceMiles: number): string {
  if (!distanceMiles || distanceMiles === 0) return '--'
  const paceMinPerMile = totalMinutes / distanceMiles
  const mins = Math.floor(paceMinPerMile)
  const secs = Math.round((paceMinPerMile - mins) * 60)
  return `${mins}:${String(secs).padStart(2, '0')} /mi`
}
