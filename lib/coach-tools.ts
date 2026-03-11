import OpenAI from 'openai'
import { WorkoutLog, WorkoutType, MealPlan, CoachAction, Settings, SetLog, ExerciseLog, WeekInCycle } from './types'

// ─── Provider-neutral tool definition ────────────────────────────────────────

interface ToolParameter {
  type: string
  description?: string
  enum?: string[]
  items?: Record<string, unknown>
  properties?: Record<string, ToolParameter>
  required?: string[]
}

interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required: string[]
  }
}

// ─── Canonical tool definitions ──────────────────────────────────────────────

export const COACH_TOOLS: ToolDefinition[] = [
  {
    name: 'get_workout_history',
    description: "Search the user's logged workout history by exercise name or date range. Use this to look up past performance before giving advice.",
    parameters: {
      type: 'object',
      properties: {
        exerciseName: {
          type: 'string',
          description: 'Optional: filter by exercise name (partial match, case-insensitive)',
        },
        fromDate: {
          type: 'string',
          description: 'Optional: start of date range in YYYY-MM-DD format',
        },
        toDate: {
          type: 'string',
          description: 'Optional: end of date range in YYYY-MM-DD format',
        },
        limit: {
          type: 'number',
          description: 'Max number of logs to return. Default 10.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_today_workout',
    description: "Get today's scheduled workout type, week in cycle, and any exercises already logged.",
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'override_workout',
    description: 'Schedule a different workout type for a specific date, overriding the default rotation. Use when the user explicitly asks to swap, change, or reschedule a workout.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to override in YYYY-MM-DD format',
        },
        workoutType: {
          type: 'string',
          enum: ['rest_yoga', 'easy_run', 'legs_squat', 'legs_no_squat', 'long_run', 'upper_body'],
          description: 'The workout type to schedule for that date',
        },
      },
      required: ['date', 'workoutType'],
    },
  },
  {
    name: 'save_meal_plan',
    description: 'Create and save a structured meal plan for a specific date. Use when the user asks for a meal plan, nutrition advice, or help eating around their workouts.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: "The date this meal plan is for in YYYY-MM-DD format. Default to today's date if not specified.",
        },
        name: {
          type: 'string',
          description: 'Short descriptive name, e.g. "Leg Day Fuel" or "High Protein Recovery"',
        },
        description: {
          type: 'string',
          description: 'Brief overview of the nutrition strategy for this plan',
        },
        meals: {
          type: 'array',
          description: 'List of meals throughout the day',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'e.g. "Breakfast", "Pre-workout snack", "Dinner"' },
              calories: { type: 'number', description: 'Approximate calories' },
              protein: { type: 'number', description: 'Protein in grams' },
              description: { type: 'string', description: 'What to eat — specific foods and portions' },
            },
            required: ['name', 'description'],
          },
        },
        totalCalories: { type: 'number', description: 'Sum of calories across all meals' },
        totalProtein: { type: 'number', description: 'Sum of protein in grams across all meals' },
      },
      required: ['date', 'name', 'description', 'meals'],
    },
  },
  {
    name: 'get_exercise_progress',
    description: 'Compute progression data for a specific exercise: max weight over time, volume trend, and personal record. Use when the user asks about strength gains, plateaus, or progress on a specific lift.',
    parameters: {
      type: 'object',
      properties: {
        exerciseId: {
          type: 'string',
          description: "The exercise ID from the workout program. Common IDs: 'barbell_back_squat', 'db_chest_press', 'pull_ups', 'romanian_deadlift', 'hip_thrust', 'overhead_press', 'bent_over_barbell_row'. Use get_workout_history first if you're not sure of the exact ID.",
        },
      },
      required: ['exerciseId'],
    },
  },
  {
    name: 'edit_workout_log',
    description: 'Edit an exercise entry in an existing workout log. Use to rename exercises, correct weights/reps, or update set completion. Call get_workout_history first to get the exact exerciseId and current data.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date of the workout log to edit in YYYY-MM-DD format',
        },
        exerciseId: {
          type: 'string',
          description: 'The exerciseId of the exercise to edit (from get_workout_history)',
        },
        name: {
          type: 'string',
          description: 'New display name for the exercise (optional)',
        },
        sets: {
          type: 'array',
          description: 'Full replacement set data (optional). Provide all sets, not just changed ones.',
          items: {
            type: 'object',
            properties: {
              setNumber: { type: 'number' },
              reps: { type: 'number' },
              weight: { type: 'number' },
              completed: { type: 'boolean' },
            },
          },
        },
      },
      required: ['date', 'exerciseId'],
    },
  },
  {
    name: 'create_custom_workout',
    description: 'Create a fully custom workout with arbitrary exercises for a specific date. Use when the user asks for a new workout, training program, or custom exercise plan. The workout will appear in the app ready to log. For multi-day programs, call this tool once per day.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date for this workout in YYYY-MM-DD format',
        },
        name: {
          type: 'string',
          description: 'Display name for the workout, e.g. "Arms & Shoulders", "Push Day", "Deload — Upper"',
        },
        exercises: {
          type: 'array',
          description: 'List of exercises for this workout',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Exercise name, e.g. "Barbell Bench Press", "Lateral Raises"' },
              targetSets: { type: 'number', description: 'Number of sets (e.g. 3, 4)' },
              targetReps: { type: 'string', description: 'Target rep range, e.g. "8-10", "12", "12 ea"' },
              suggestedWeight: { type: 'number', description: 'Optional: pre-fill weight from user history. Look up their recent working weights via get_workout_history first.' },
            },
            required: ['name', 'targetSets', 'targetReps'],
          },
        },
        weekInCycle: {
          type: 'string',
          enum: ['A', 'B', 'C'],
          description: 'Optional: week in cycle. Defaults to A.',
        },
      },
      required: ['date', 'name', 'exercises'],
    },
  },
]

// ─── Conversion functions ────────────────────────────────────────────────────

export function toOpenAITools(): OpenAI.Chat.ChatCompletionTool[] {
  return COACH_TOOLS.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

export function toAnthropicTools() {
  return COACH_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Record<string, unknown>,
  }))
}

// ─── Tool executor ───────────────────────────────────────────────────────────

interface ToolContext {
  logs: WorkoutLog[]
  settings: Settings
  todayInfo: {
    date: string
    workoutType: WorkoutType
    weekInCycle: string
    workoutDisplayName: string
    exercises: unknown[]
    completed: boolean
  }
  overrides: Record<string, WorkoutType>
}

export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext,
  pendingActions: CoachAction[],
): unknown {
  switch (toolName) {
    case 'get_workout_history': {
      let filtered = context.logs
      if (args.exerciseName) {
        const query = (args.exerciseName as string).toLowerCase()
        filtered = filtered.filter(log =>
          log.exercises.some(e => e.name.toLowerCase().includes(query))
        )
      }
      if (args.fromDate) {
        filtered = filtered.filter(log => log.date >= (args.fromDate as string))
      }
      if (args.toDate) {
        filtered = filtered.filter(log => log.date <= (args.toDate as string))
      }
      return filtered
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, (args.limit as number) ?? 10)
    }

    case 'get_today_workout': {
      return context.todayInfo
    }

    case 'override_workout': {
      const action: CoachAction = {
        type: 'override_workout',
        date: args.date as string,
        workoutType: args.workoutType as WorkoutType,
      }
      pendingActions.push(action)
      return {
        success: true,
        message: `Scheduled ${args.workoutType} for ${args.date}`,
      }
    }

    case 'save_meal_plan': {
      const plan: MealPlan = {
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: args.date as string,
        name: args.name as string,
        description: args.description as string,
        meals: args.meals as MealPlan['meals'],
        totalCalories: args.totalCalories as number | undefined,
        totalProtein: args.totalProtein as number | undefined,
      }
      const action: CoachAction = { type: 'save_meal_plan', plan }
      pendingActions.push(action)
      return {
        success: true,
        planId: plan.id,
        message: `Meal plan "${plan.name}" saved for ${plan.date}`,
      }
    }

    case 'get_exercise_progress': {
      const exerciseId = args.exerciseId as string
      const relevantLogs = context.logs
        .filter(log => log.exercises.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => a.date.localeCompare(b.date))

      const progressData = relevantLogs.map(log => {
        const ex = log.exercises.find(e => e.exerciseId === exerciseId)!
        const completedSets = ex.sets.filter(
          s => s.completed && s.weight != null && s.reps != null
        )
        const maxWeight =
          completedSets.length > 0
            ? Math.max(...completedSets.map(s => s.weight!))
            : null
        const totalVolume = completedSets.reduce(
          (sum, s) => sum + s.weight! * s.reps!,
          0
        )
        return {
          date: log.date,
          weekInCycle: log.weekInCycle,
          maxWeight,
          totalVolume,
          sets: completedSets.length,
        }
      })

      const pr =
        progressData.length > 0
          ? Math.max(...progressData.map(d => d.maxWeight ?? 0))
          : null

      return {
        exerciseId,
        weightUnit: context.settings.weightUnit,
        sessions: progressData.length,
        personalRecord: pr,
        history: progressData,
        trend:
          progressData.length >= 2
            ? (progressData.at(-1)!.maxWeight ?? 0) > (progressData[0].maxWeight ?? 0)
              ? 'improving'
              : 'plateaued'
            : 'insufficient_data',
      }
    }

    case 'edit_workout_log': {
      const action: CoachAction = {
        type: 'edit_workout_log',
        date: args.date as string,
        exerciseId: args.exerciseId as string,
        updates: {
          ...(args.name ? { name: args.name as string } : {}),
          ...(args.sets ? { sets: args.sets as SetLog[] } : {}),
        },
      }
      pendingActions.push(action)
      return {
        success: true,
        message: `Updated exercise "${args.exerciseId}" on ${args.date}`,
      }
    }

    case 'create_custom_workout': {
      const exerciseInputs = args.exercises as Array<{
        name: string
        targetSets: number
        targetReps: string
        suggestedWeight?: number
      }>

      const exercises: ExerciseLog[] = exerciseInputs.map(ex => {
        // Create a slug-style exerciseId from the name
        const exerciseId = ex.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')

        const sets: SetLog[] = []
        for (let i = 1; i <= ex.targetSets; i++) {
          sets.push({
            setNumber: i,
            reps: null,
            weight: ex.suggestedWeight ?? null,
            completed: false,
          })
        }

        return {
          exerciseId,
          name: ex.name,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          sets,
        }
      })

      const workout: WorkoutLog = {
        date: args.date as string,
        workoutType: 'custom',
        weekInCycle: (args.weekInCycle as WeekInCycle) ?? 'A',
        exercises,
        completed: false,
        customName: args.name as string,
      }

      pendingActions.push({ type: 'save_custom_workout', workout })
      return {
        success: true,
        message: `Custom workout "${args.name}" created for ${args.date} with ${exercises.length} exercises`,
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
