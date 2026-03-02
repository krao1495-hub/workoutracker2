import { WorkoutLog, Settings, WorkoutType, ChatMessage, MealPlan, BodyStats } from './types'

const LOGS_KEY = 'workout_logs'
const SETTINGS_KEY = 'workout_settings'
const OVERRIDES_KEY = 'workout_overrides'
const MEAL_PLANS_KEY = 'coach_meal_plans'
const CHAT_HISTORY_KEY = 'coach_chat_history'
const BODY_STATS_KEY = 'body_stats'

const DEFAULT_BODY_STATS: BodyStats = {
  weightLbs: null,
  bodyFatPct: null,
  activityLevel: 'active',
}

const DEFAULT_SETTINGS: Settings = {
  email: '',
  cycleStartDate: '2026-03-02',
  weightUnit: 'lbs',
}

export function getLogs(): WorkoutLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveLog(log: WorkoutLog): void {
  if (typeof window === 'undefined') return
  const logs = getLogs()
  const idx = logs.findIndex(l => l.date === log.date && l.workoutType === log.workoutType)
  if (idx >= 0) {
    logs[idx] = log
  } else {
    logs.push(log)
  }
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs))
}

export function getLogForDate(date: string): WorkoutLog | null {
  const logs = getLogs()
  // Return the most recent log for this date
  return logs.filter(l => l.date === date).sort((a, b) => {
    // Prefer completed logs
    if (a.completed && !b.completed) return -1
    if (!a.completed && b.completed) return 1
    return 0
  })[0] ?? null
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function getOverrides(): Record<string, WorkoutType> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setOverride(date: string, type: WorkoutType): void {
  if (typeof window === 'undefined') return
  const overrides = getOverrides()
  overrides[date] = type
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

export function removeOverride(date: string): void {
  if (typeof window === 'undefined') return
  const overrides = getOverrides()
  delete overrides[date]
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
}

export function exportData(): string {
  const logs = getLogs()
  const settings = getSettings()
  return JSON.stringify({ logs, settings, exportedAt: new Date().toISOString() }, null, 2)
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────

export function getMealPlans(): MealPlan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MEAL_PLANS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMealPlan(plan: MealPlan): void {
  if (typeof window === 'undefined') return
  const plans = getMealPlans()
  const idx = plans.findIndex(p => p.id === plan.id)
  if (idx >= 0) {
    plans[idx] = plan
  } else {
    plans.push(plan)
  }
  localStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(plans))
}

export function deleteMealPlan(id: string): void {
  if (typeof window === 'undefined') return
  const plans = getMealPlans().filter(p => p.id !== id)
  localStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(plans))
}

// ─── Chat History ─────────────────────────────────────────────────────────────

export function getChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  const trimmed = messages.slice(-100)
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed))
}

export function clearChatHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CHAT_HISTORY_KEY)
}

// ─── Body Stats ────────────────────────────────────────────────────────────────

export function getBodyStats(): BodyStats {
  if (typeof window === 'undefined') return DEFAULT_BODY_STATS
  try {
    const raw = localStorage.getItem(BODY_STATS_KEY)
    return raw ? { ...DEFAULT_BODY_STATS, ...JSON.parse(raw) } : DEFAULT_BODY_STATS
  } catch {
    return DEFAULT_BODY_STATS
  }
}

export function saveBodyStats(stats: BodyStats): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BODY_STATS_KEY, JSON.stringify(stats))
}
