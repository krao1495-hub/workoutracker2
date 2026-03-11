import { NextRequest } from 'next/server'
import { Resend } from 'resend'
import { WorkoutType, WeekInCycle } from '@/lib/types'
import { workoutProgram } from '@/lib/workoutProgram'

// ---------- Helpers (server-side, no localStorage) ----------

function getWorkoutTypeForDate(date: Date): WorkoutType {
  const map: Record<number, WorkoutType> = {
    0: 'upper_body',
    1: 'rest_yoga',
    2: 'easy_run',
    3: 'legs_squat',
    4: 'easy_run',
    5: 'legs_no_squat',
    6: 'long_run',
  }
  return map[date.getDay()]
}

function getWeekInCycle(date: Date, cycleStartDate: string): WeekInCycle {
  const start = new Date(cycleStartDate + 'T12:00:00')
  const startDay = start.getDay()
  const startMonday = new Date(start)
  startMonday.setDate(start.getDate() - ((startDay + 6) % 7))

  const current = new Date(date)
  const currentDay = current.getDay()
  const currentMonday = new Date(current)
  currentMonday.setDate(current.getDate() - ((currentDay + 6) % 7))

  const diffMs = currentMonday.getTime() - startMonday.getTime()
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
  if (diffWeeks < 0) return 'A'
  const idx = diffWeeks % 3
  if (idx === 0) return 'A'
  if (idx === 1) return 'B'
  return 'C'
}

function getWorkoutDisplayName(type: WorkoutType): string {
  switch (type) {
    case 'rest_yoga':     return 'Rest + 30 min Yoga'
    case 'easy_run':      return 'Easy Run — 4 miles @ ~9:00/mi'
    case 'legs_squat':    return 'Legs (Squat Day)'
    case 'legs_no_squat': return 'Legs'
    case 'long_run':      return 'Long Run — 5–7 miles'
    case 'upper_body':    return 'Upper Body + 30 min Yoga'
    case 'custom':        return 'Custom Workout'
  }
}

function buildEmailHtml(
  workoutType: WorkoutType,
  weekInCycle: WeekInCycle,
  date: Date,
  isTest: boolean
): string {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const workoutName = getWorkoutDisplayName(workoutType)
  const isStrength =
    workoutType === 'legs_squat' ||
    workoutType === 'legs_no_squat' ||
    workoutType === 'upper_body'

  let exercisesHtml = ''

  if (isStrength) {
    const key = workoutType as 'legs_squat' | 'legs_no_squat' | 'upper_body'
    const entries = workoutProgram[key][weekInCycle]
    exercisesHtml = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">EXERCISE</th>
            <th style="text-align:center;padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">SETS</th>
            <th style="text-align:center;padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">REPS</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 12px;font-size:15px;color:#1e293b;">${e.exercise.name}</td>
              <td style="padding:10px 12px;text-align:center;font-size:15px;font-weight:600;color:#3b82f6;">${e.targetSets}</td>
              <td style="padding:10px 12px;text-align:center;font-size:15px;color:#1e293b;">${e.targetReps}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
  } else if (workoutType === 'easy_run') {
    exercisesHtml = `
      <div style="background:#fff7ed;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#c2410c;font-size:15px;"><strong>Target:</strong> 4 miles at an easy conversational pace (~9:00 /mi)</p>
      </div>
    `
  } else if (workoutType === 'long_run') {
    exercisesHtml = `
      <div style="background:#fff1f2;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#be123c;font-size:15px;"><strong>Target:</strong> 5–7 miles at an easy, relaxed effort</p>
      </div>
    `
  } else {
    exercisesHtml = `
      <div style="background:#faf5ff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#7e22ce;font-size:15px;">🧘 30 minutes of yoga — rest, recover, and recharge.</p>
      </div>
    `
  }

  const progressTips: Record<WeekInCycle, string> = {
    A: 'Week A: Establish working weights. Note anything that felt easy.',
    B: 'Week B: Try +1–2 reps per set vs. last week, or add ~5 lbs.',
    C: 'Week C: Add one extra set. Next week (A): reset reps & add 5–10 lbs base weight.',
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:24px 16px;">
    ${isTest ? '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">🧪 This is a test email</div>' : ''}

    <div style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <!-- Header -->
      <div style="background:#3b82f6;padding:20px 24px;">
        <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">${dateStr}</p>
        <h1 style="margin:4px 0 0;color:white;font-size:22px;font-weight:700;">${workoutName}</h1>
        ${isStrength ? `<span style="display:inline-block;margin-top:8px;background:rgba(255,255,255,0.2);color:white;font-size:12px;font-weight:600;padding:2px 10px;border-radius:99px;">Week ${weekInCycle} of 3-week cycle</span>` : ''}
      </div>

      <!-- Body -->
      <div style="padding:20px 24px;">
        ${exercisesHtml}

        ${isStrength ? `
        <div style="background:#eff6ff;border-radius:8px;padding:12px 16px;margin-top:8px;">
          <p style="margin:0;color:#1d4ed8;font-size:13px;">💡 ${progressTips[weekInCycle]}</p>
        </div>
        ` : ''}
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #f1f5f9;padding:14px 24px;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
          Open your <strong>Workout Tracker</strong> app to log today's session.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ---------- Route handler ----------

export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}

async function handler(request: NextRequest) {
  const isTest = request.nextUrl.searchParams.get('test') === 'true'

  const apiKey = process.env.RESEND_API_KEY
  const userEmail = process.env.USER_EMAIL
  const cycleStartDate = process.env.CYCLE_START_DATE ?? '2026-03-02'

  if (!apiKey) {
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  // For test calls, allow email override from request body
  let toEmail = userEmail
  if (isTest) {
    try {
      const body = await request.json().catch(() => ({}))
      if (body.email) toEmail = body.email
    } catch {}
  }

  if (!toEmail) {
    return Response.json({ error: 'USER_EMAIL not configured' }, { status: 500 })
  }

  const today = new Date()
  const workoutType = getWorkoutTypeForDate(today)
  const weekInCycle = getWeekInCycle(today, cycleStartDate)
  const html = buildEmailHtml(workoutType, weekInCycle, today, isTest)
  const subject = isTest
    ? `[Test] Workout Tracker — ${getWorkoutDisplayName(workoutType)}`
    : `Today's Workout: ${getWorkoutDisplayName(workoutType)}`

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'Workout Tracker <onboarding@resend.dev>',
    to: toEmail,
    subject,
    html,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, workoutType, weekInCycle })
}
