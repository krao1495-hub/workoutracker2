import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { WorkoutLog, Settings, WorkoutType, ChatMessage, CoachAction, AIProvider } from '@/lib/types'
import { toOpenAITools, toAnthropicTools, executeTool } from '@/lib/coach-tools'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayInfo {
  date: string
  workoutType: WorkoutType
  weekInCycle: string
  workoutDisplayName: string
  exercises: unknown[]
  completed: boolean
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
  provider?: AIProvider
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
- Edit exercises in existing workout logs (rename, update weights/reps)

Guidelines:
- Be concise and practical — this is a mobile app, keep responses short and actionable
- When creating meal plans, tailor calories and protein to the workout day (more on heavy lift/run days)
- For workout overrides, state the date and new type clearly in your response
- If asked about progress on a specific exercise, use the get_exercise_progress tool for accurate data
- Do not make up weight data — only reference what is in the provided history
- When a meal plan is saved, confirm it with the user and mention they can view it in the Meals tab

CRITICAL TOOL RULES — always follow these:
- When the user asks for a meal plan (any phrasing: "create", "make", "give me", "what should I eat", etc.) you MUST call the save_meal_plan tool. Never describe a meal plan in text only — always save it via the tool so it appears in the app.
- When the user LOGS what they ate (any phrasing: "I had...", "I ate...", "for lunch I had...", "today I ate...", etc.) you MUST also call the save_meal_plan tool to record it. Use a name like "Food Log — [Date]" and include the meals they described with estimated calories and protein. This way their food intake is saved in the Meals tab for reference.
- When the user asks to change, swap, or reschedule a workout, you MUST call the override_workout tool.
- When the user asks to edit, rename, or update an exercise in a past or today's log, you MUST call edit_workout_log. Always call get_workout_history first to get the exact exerciseId.`

// ─── OpenAI Provider ─────────────────────────────────────────────────────────

// OpenAI function tool call shape
interface FunctionToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

async function callOpenAI(body: CoachRequestBody): Promise<CoachResponseBody> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to your .env.local file or switch to Anthropic in Settings.')
  }

  const openai = new OpenAI({ apiKey })
  const tools = toOpenAITools()
  const pendingActions: CoachAction[] = []

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Current user context:\n${JSON.stringify(
        {
          today: body.context.todayInfo,
          settings: body.context.settings,
          recentLogs: body.context.logs.slice(-14),
          overrides: body.context.overrides,
        },
        null,
        2
      )}`,
    },
    ...body.history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ]

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

    // Process each tool call
    const fnToolCalls = assistantMessage.tool_calls.filter(
      tc => tc.type === 'function'
    ) as FunctionToolCall[]
    for (const toolCall of fnToolCalls) {
      const args = JSON.parse(toolCall.function.arguments)
      const toolResult = executeTool(toolCall.function.name, args, body.context, pendingActions)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      })
    }
  }

  // Extract final text response
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

  return { message: responseText, actions: pendingActions }
}

// ─── Anthropic Provider ──────────────────────────────────────────────────────

async function callAnthropic(body: CoachRequestBody): Promise<CoachResponseBody> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to your .env.local file or switch to OpenAI in Settings.')
  }

  const anthropic = new Anthropic({ apiKey })
  const tools = toAnthropicTools()
  const pendingActions: CoachAction[] = []

  const systemPrompt = SYSTEM_PROMPT + '\n\nCurrent user context:\n' + JSON.stringify(
    {
      today: body.context.todayInfo,
      settings: body.context.settings,
      recentLogs: body.context.logs.slice(-14),
      overrides: body.context.overrides,
    },
    null,
    2
  )

  const messages: Anthropic.MessageParam[] = [
    ...body.history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ]

  // Agentic tool-use loop — max 5 iterations
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: tools as Anthropic.Tool[],
    })

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    // Push assistant message with all content blocks
    messages.push({ role: 'assistant', content: response.content })

    // No tool use → done
    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      const finalText = textBlocks.map(b => b.text).join('\n') ||
        'I had trouble generating a response. Please try again.'
      return { message: finalText, actions: pendingActions }
    }

    // Process tool calls and send results back
    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(toolUse => {
      const result = executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        body.context,
        pendingActions,
      )
      return {
        type: 'tool_result' as const,
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      }
    })

    // Anthropic requires tool results in a 'user' message
    messages.push({ role: 'user', content: toolResults })
  }

  // Fallback if loop exhausted
  return {
    message: 'I had trouble generating a response. Please try again.',
    actions: pendingActions,
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let body: CoachRequestBody
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const provider = body.provider ?? 'openai'

    const result = provider === 'anthropic'
      ? await callAnthropic(body)
      : await callOpenAI(body)

    return Response.json(result)
  } catch (err) {
    console.error('Coach route unhandled error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
