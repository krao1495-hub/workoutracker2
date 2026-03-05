'use client'

import { useEffect, useState } from 'react'
import { Flame, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { getSettings, getBodyStats, saveBodyStats, getMealPlans } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import { BodyStats } from '@/lib/types'

type ActivityLevel = BodyStats['activityLevel']
type Goal = 'cut' | 'maintenance' | 'bulk'

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; multiplier: number; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary',  multiplier: 1.200, description: 'Desk job, minimal daily movement' },
  { value: 'light',     label: 'Light',      multiplier: 1.375, description: 'Light walks, 1–2 workouts/week' },
  { value: 'moderate',  label: 'Moderate',   multiplier: 1.550, description: 'Active lifestyle, 3–4 workouts/week' },
  { value: 'active',    label: 'Active',     multiplier: 1.725, description: '6–7 workouts/week (your program)' },
  { value: 'extra',     label: 'Extra',      multiplier: 1.900, description: 'Hard daily training + physical job' },
]

const GOAL_OPTIONS: { value: Goal; label: string; offset: number }[] = [
  { value: 'cut',         label: 'Cut',         offset: -500 },
  { value: 'maintenance', label: 'Maintain',    offset:    0 },
  { value: 'bulk',        label: 'Bulk',        offset: +250 },
]

// Fixed weekly rotation: index 0 = Sunday, 6 = Saturday
const WEEKLY_SCHEDULE = [
  { day: 'Sunday',    label: 'Upper Body + Yoga', adjustPct:   0 },
  { day: 'Monday',    label: 'Rest + Yoga',        adjustPct: -15 },
  { day: 'Tuesday',   label: 'Easy Run (4 mi)',    adjustPct:  10 },
  { day: 'Wednesday', label: 'Legs (Squat Day)',   adjustPct:   5 },
  { day: 'Thursday',  label: 'Easy Run (4 mi)',    adjustPct:  10 },
  { day: 'Friday',    label: 'Legs (No Squat)',    adjustPct:   0 },
  { day: 'Saturday',  label: 'Long Run (5–7 mi)',  adjustPct:  25 },
]

export default function StatsPage() {
  const [weightInput, setWeightInput]     = useState('')
  const [bodyFatInput, setBodyFatInput]   = useState('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('active')
  const [goal, setGoal]                   = useState<Goal>('maintenance')
  const [weightUnit, setWeightUnit]       = useState<'lbs' | 'kg'>('lbs')
  const [todayDow, setTodayDow]           = useState(0)
  const [todayIntake, setTodayIntake]     = useState<number | null>(null)

  useEffect(() => {
    const settings = getSettings()
    setWeightUnit(settings.weightUnit)
    setTodayDow(new Date().getDay())

    const stats = getBodyStats()
    if (stats.weightLbs !== null) {
      const display =
        settings.weightUnit === 'kg'
          ? (stats.weightLbs / 2.2046).toFixed(1)
          : stats.weightLbs.toFixed(1)
      setWeightInput(display)
    }
    if (stats.bodyFatPct !== null) setBodyFatInput(stats.bodyFatPct.toString())
    setActivityLevel(stats.activityLevel)

    // Load today's food log calories
    const todayStr = formatDate(new Date())
    const plans = getMealPlans().filter(p => p.date === todayStr)
    if (plans.length > 0) {
      const total = plans.reduce((sum, p) => {
        // Use plan total if available, otherwise sum individual meals
        if (p.totalCalories != null) return sum + p.totalCalories
        return sum + p.meals.reduce((ms, m) => ms + (m.calories ?? 0), 0)
      }, 0)
      setTodayIntake(total > 0 ? total : null)
    }
  }, [])

  const persist = (
    wInput: string,
    bfInput: string,
    activity: ActivityLevel,
    unit: 'lbs' | 'kg'
  ) => {
    const w = parseFloat(wInput)
    const bf = parseFloat(bfInput)
    saveBodyStats({
      weightLbs: isNaN(w) ? null : unit === 'kg' ? w * 2.2046 : w,
      bodyFatPct: isNaN(bf) ? null : bf,
      activityLevel: activity,
    })
  }

  const handleWeight = (v: string) => {
    setWeightInput(v)
    persist(v, bodyFatInput, activityLevel, weightUnit)
  }
  const handleBodyFat = (v: string) => {
    setBodyFatInput(v)
    persist(weightInput, v, activityLevel, weightUnit)
  }
  const handleActivity = (v: ActivityLevel) => {
    setActivityLevel(v)
    persist(weightInput, bodyFatInput, v, weightUnit)
  }

  // ── Calculations ──────────────────────────────────────────────────────────

  const weightNum  = parseFloat(weightInput)
  const bodyFatNum = parseFloat(bodyFatInput)
  const valid =
    !isNaN(weightNum) && weightNum > 0 &&
    !isNaN(bodyFatNum) && bodyFatNum > 0 && bodyFatNum < 100

  const weightKg  = valid ? (weightUnit === 'kg' ? weightNum : weightNum / 2.2046) : 0
  const weightLbs = valid ? (weightUnit === 'lbs' ? weightNum : weightNum * 2.2046) : 0
  const lbmKg     = valid ? weightKg  * (1 - bodyFatNum / 100) : 0
  const lbmLbs    = valid ? weightLbs * (1 - bodyFatNum / 100) : 0
  const bmr       = valid ? 370 + 21.6 * lbmKg : 0
  const mult      = ACTIVITY_OPTIONS.find(o => o.value === activityLevel)!.multiplier
  const tdee      = valid ? bmr * mult : 0

  const goalOffset  = GOAL_OPTIONS.find(g => g.value === goal)!.offset
  const targetCals  = Math.round(tdee + goalOffset)
  const proteinG    = Math.round(lbmLbs)                            // 1g / lb LBM
  const fatG        = Math.round((targetCals * 0.30) / 9)
  const carbsG      = Math.max(0, Math.round((targetCals - proteinG * 4 - fatG * 9) / 4))

  const actDesc = ACTIVITY_OPTIONS.find(o => o.value === activityLevel)!.description

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Body Stats</h1>

      {/* ── Inputs ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="font-semibold text-slate-800">Your Measurements</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Weight ({weightUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="50"
              max="500"
              value={weightInput}
              onChange={e => handleWeight(e.target.value)}
              placeholder={weightUnit === 'lbs' ? '165' : '75'}
              className="w-full border border-slate-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ fontSize: '16px' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Body Fat %
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="3"
              max="60"
              value={bodyFatInput}
              onChange={e => handleBodyFat(e.target.value)}
              placeholder="18"
              className="w-full border border-slate-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {valid && (
          <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600">
            Lean Body Mass:{' '}
            <span className="font-semibold text-slate-800">
              {weightUnit === 'lbs'
                ? `${lbmLbs.toFixed(1)} lbs (${lbmKg.toFixed(1)} kg)`
                : `${lbmKg.toFixed(1)} kg (${lbmLbs.toFixed(1)} lbs)`}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Activity Level
          </label>
          <div className="grid grid-cols-5 gap-1">
            {ACTIVITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleActivity(opt.value)}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                  activityLevel === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{actDesc}</p>
        </div>
      </div>

      {/* ── Results (shown only when inputs are valid) ── */}
      {valid ? (
        <>
          {/* BMR hero card */}
          <div className="bg-blue-600 rounded-xl p-5 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Basal Metabolic Rate</span>
            </div>
            <div className="text-5xl font-bold tracking-tight">
              {Math.round(bmr).toLocaleString()}
            </div>
            <div className="text-sm opacity-75 mt-1">kcal/day · Katch-McArdle formula</div>
            <div className="mt-4 bg-white/15 rounded-lg px-4 py-2 inline-block">
              <span className="text-sm opacity-90">TDEE </span>
              <span className="text-lg font-bold">{Math.round(tdee).toLocaleString()} kcal/day</span>
            </div>
          </div>

          {/* Daily calorie balance */}
          {(() => {
            const todaySchedule = WEEKLY_SCHEDULE[todayDow]
            const todayExpenditure = Math.round(tdee * (1 + todaySchedule.adjustPct / 100))
            const balance = todayIntake != null ? todayExpenditure - todayIntake : null
            const isDeficit = balance != null && balance > 0
            const isSurplus = balance != null && balance < 0

            return (
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <h2 className="font-semibold text-slate-800">Today&apos;s Balance</h2>
                <p className="text-xs text-slate-500">
                  {todaySchedule.day} — {todaySchedule.label}
                  {todaySchedule.adjustPct !== 0 && ` (${todaySchedule.adjustPct > 0 ? '+' : ''}${todaySchedule.adjustPct}%)`}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {/* Expenditure */}
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-red-600">{todayExpenditure.toLocaleString()}</div>
                    <div className="text-xs text-red-500 font-medium">Burn</div>
                  </div>

                  {/* Intake */}
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {todayIntake != null ? todayIntake.toLocaleString() : '—'}
                    </div>
                    <div className="text-xs text-green-500 font-medium">Intake</div>
                  </div>

                  {/* Net */}
                  <div className={`rounded-xl p-3 text-center ${
                    balance == null ? 'bg-slate-50' : isDeficit ? 'bg-blue-50' : 'bg-amber-50'
                  }`}>
                    <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
                      balance == null ? 'text-slate-400' : isDeficit ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {balance == null ? (
                        '—'
                      ) : (
                        <>
                          {isDeficit ? <TrendingDown className="w-4 h-4" /> : isSurplus ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          {Math.abs(balance).toLocaleString()}
                        </>
                      )}
                    </div>
                    <div className={`text-xs font-medium ${
                      balance == null ? 'text-slate-400' : isDeficit ? 'text-blue-500' : 'text-amber-500'
                    }`}>
                      {balance == null ? 'Net' : isDeficit ? 'Deficit' : isSurplus ? 'Surplus' : 'Even'}
                    </div>
                  </div>
                </div>

                {todayIntake == null && (
                  <p className="text-xs text-slate-400 text-center">
                    Log your meals via the AI Coach to see your balance.
                  </p>
                )}
              </div>
            )
          })()}

          {/* Goal toggle + macros */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold text-slate-800">Daily Targets</h2>

            {/* 3-pill goal toggle */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {GOAL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    goal === opt.value
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                  <div className="text-xs font-normal opacity-75">
                    {opt.offset > 0 ? `+${opt.offset}` : opt.offset < 0 ? `${opt.offset}` : '±0'} kcal
                  </div>
                </button>
              ))}
            </div>

            {/* Target calories */}
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-800">
                {targetCals.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500">kcal / day</div>
            </div>

            {/* Macro breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Protein', value: proteinG, kcal: proteinG * 4,        color: 'text-blue-600'   },
                { label: 'Carbs',   value: carbsG,   kcal: carbsG * 4,           color: 'text-orange-500' },
                { label: 'Fat',     value: fatG,     kcal: fatG * 9,             color: 'text-yellow-600' },
              ].map(m => (
                <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${m.color}`}>{m.value}g</div>
                  <div className="text-xs text-slate-500 font-medium">{m.label}</div>
                  <div className="text-xs text-slate-400">{m.kcal} kcal</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center">
              Protein = 1g/lb lean mass · Fat = 30% of calories · Carbs = remainder
            </p>
          </div>

          {/* Per-day schedule */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h2 className="font-semibold text-slate-800">Per-Day Targets</h2>
            <p className="text-xs text-slate-500">
              Adjusted by workout intensity relative to your weekly average.
            </p>
            <div className="space-y-2">
              {WEEKLY_SCHEDULE.map((entry, i) => {
                const dayCals  = Math.round(tdee * (1 + entry.adjustPct / 100) + goalOffset)
                const isToday  = i === todayDow
                return (
                  <div
                    key={entry.day}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                      isToday
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                          {entry.day}
                        </span>
                        {isToday && (
                          <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-medium">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{entry.label}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>
                        {dayCals.toLocaleString()} kcal
                      </div>
                      {entry.adjustPct !== 0 && (
                        <div className="text-xs text-slate-400">
                          {entry.adjustPct > 0 ? '+' : ''}{entry.adjustPct}% vs avg
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Flame className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">Enter your measurements above</p>
          <p className="text-sm text-slate-400 mt-1">
            Your BMR, TDEE, and daily calorie targets will appear here.
          </p>
        </div>
      )}
    </div>
  )
}
