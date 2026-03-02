import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { WorkoutLog, Settings, WorkoutType, ChatMessage, MealPlan, CoachAction } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayInfo {
  date: string
  workoutType: WorkoutType
  weekInCycle: string
  workoutDisplayName: string
  exercises: unknown[]
  completed: boolean
}

// OpenAI function tool call shape
interface FunctionToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface CoachRequestBody {
  message: string
  history: ChatMessage[]
  context: {
    logs: WorkoutLog[]
    settings: Settings
    todayInfo: TodayInfo
    overrides: Record<string, WorkoutType>
  }
}

interface CoachResponseBody {
  message: string
  actions: CoachAction[]
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI fitness coach integrated into a personal workout tracker app.

The user follows a structured program:
- 6-day weekly rotation: Sunday=Upper Body+Yoga, Monday=Rest+Yoga, Tuesday=Easy Run (4 miles), Wednesday=Legs (Squat Day), Thursday=Easy Run (4 miles), Friday=Legs (no squat), Saturday=Long Run (5-7 miles)
- Strength weeks rotate A→B→C over 3 weeks:
  - Week A: establish working weights (8-10 reps)
  - Week B: add 1-2 reps per set or +5 lbs
  - Week C: add one extra set (3x→4x), then Week A resets with +5-10 lbs base weight
- Weight unit preference is in the user's settings (lbs or kg)

You have access to the user's complete workout history, today's schedule, and settings via tools.

Your capabilities:
- Answer questions about their training, progress, recovery, and nutrition
- Look up specific exercise history and compute progression trends
- Schedule workout overrides (e.g. swap rest day and leg day)
- Create structured meal plans tailored to their training days
- Add notes to workout logs

Guidelines:
- Be concise and practical — this is a mobile app, keep responses short and actionable
- When creating meal plans, tailor calories and protein to the workout day (more on heavy lift/run days)
- For workout overrides, state the date and new type clearly in your response
- If asked about progress on a specific exercise, use the get_exercise_progress tool for accurate data
- Do not make up weight data — only reference what is in the provided history
- When a meal plan is saved, confirm it with the user and mention they can view it in the Meals tab

CRITICAL TOOL RULES — always follow these:
- When the user asks for a meal plan (any phrasing: "create", "make", "give me", "what should I eat", etc.) you MUST call the save_meal_plan tool. Never describe a meal plan in text only — always save it via the tool so it appears in the app.
- When the user asks to change, swap, or reschedule a workout, you MUST call the override_workout tool.`

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
      name: 'get_today_workout',
      description: "Get today's scheduled workout type, week in cycle, and any exercises already logged.",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
  {
    type: 'function',
    function: {
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
  },
]

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
    )
  }

  let body: CoachRequestBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { message, history, context } = body
  const openai = new OpenAI({ apiKey })

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Current user context:\n${JSON.stringify(
        {
          today: context.todayInfo,
          settings: context.settings,
          recentLogs: context.logs.slice(-14),
          overrides: context.overrides,
        },
        null,
        2
      )}`,
    },
    ...history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const pendingActions: CoachAction[] = []

  // Agentic tool-use loop — max 5 iterations
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.7,
    })

    const assistantMessage = response.choices[0].message
    messages.push(assistantMessage)

    // No tool calls → final response
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      break
    }

    // Process each tool call (filter to standard function tool calls only)
    const fnToolCalls = assistantMessage.tool_calls.filter(
      tc => tc.type === 'function'
    ) as FunctionToolCall[]
    for (const toolCall of fnToolCalls) {
      const args = JSON.parse(toolCall.function.arguments)
      let toolResult: unknown

      switch (toolCall.function.name) {

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
          toolResult = filtered
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, (args.limit as number) ?? 10)
          break
        }

        case 'get_today_workout': {
          toolResult = context.todayInfo
          break
        }

        case 'override_workout': {
          const action: CoachAction = {
            type: 'override_workout',
            date: args.date as string,
            workoutType: args.workoutType as WorkoutType,
          }
          pendingActions.push(action)
          toolResult = {
            success: true,
            message: `Scheduled ${args.workoutType} for ${args.date}`,
          }
          break
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
          toolResult = {
            success: true,
            planId: plan.id,
            message: `Meal plan "${plan.name}" saved for ${plan.date}`,
          }
          break
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

          toolResult = {
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
          break
        }

        default:
          toolResult = { error: `Unknown tool: ${toolCall.function.name}` }
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      })
    }
  }

  // Extract final text response from the last assistant message without tool calls
  const lastAssistant = [...messages]
    .reverse()
    .find(
      m =>
        m.role === 'assistant' &&
        !('tool_calls' in m &&
          (m as OpenAI.Chat.ChatCompletionAssistantMessageParam).tool_calls?.length)
    ) as OpenAI.Chat.ChatCompletionAssistantMessageParam | undefined

  const responseText =
    (lastAssistant?.content as string | null) ??
    'I had trouble generating a response. Please try again.'

  const result: CoachResponseBody = {
    message: responseText,
    actions: pendingActions,
  }

  return Response.json(result)
  } catch (err) {
    console.error('Coach route unhandled error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
