export type WorkoutType =
  | 'rest_yoga'
  | 'easy_run'
  | 'legs_squat'
  | 'legs_no_squat'
  | 'long_run'
  | 'upper_body'

export type WeekInCycle = 'A' | 'B' | 'C'

export type Feedback = 'too_easy' | 'just_right' | 'too_hard'

export interface SetLog {
  setNumber: number
  reps: number | null
  weight: number | null
  completed: boolean
}

export interface ExerciseLog {
  exerciseId: string
  name: string
  targetSets: number
  targetReps: string
  sets: SetLog[]
}

export interface RunLog {
  distance: number | null   // miles
  durationMinutes: number | null
  durationSeconds: number | null
}

export interface WorkoutLog {
  date: string              // "YYYY-MM-DD"
  workoutType: WorkoutType
  weekInCycle: WeekInCycle
  exercises: ExerciseLog[]
  runData?: RunLog
  yogaCompleted?: boolean
  coreCompleted?: boolean
  feedback?: Feedback
  notes?: string
  completed: boolean
}

export interface Settings {
  email: string
  cycleStartDate: string    // ISO date string "YYYY-MM-DD"
  weightUnit: 'lbs' | 'kg'
}

export interface ExerciseDefinition {
  id: string
  name: string
}

// ─── AI Coach Types ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface MealEntry {
  name: string
  calories?: number
  protein?: number
  description: string
}

export interface MealPlan {
  id: string
  date: string
  name: string
  description: string
  meals: MealEntry[]
  totalCalories?: number
  totalProtein?: number
}

export type CoachAction =
  | { type: 'override_workout'; date: string; workoutType: WorkoutType }
  | { type: 'save_meal_plan'; plan: MealPlan }
  | { type: 'add_workout_note'; date: string; note: string }

// ─── Body Stats / BMR ─────────────────────────────────────────────────────────

export interface BodyStats {
  weightLbs: number | null
  bodyFatPct: number | null
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extra'
}
