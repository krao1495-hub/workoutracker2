'use client'

import { useEffect, useState } from 'react'
import { Settings } from '@/lib/types'
import { getSettings, saveSettings } from '@/lib/storage'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type EmailStatus = 'idle' | 'sending' | 'success' | 'error'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    email: '',
    cycleStartDate: '2026-03-02',
    weightUnit: 'lbs',
  })
  const [saved, setSaved] = useState(false)
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const handleChange = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const sendTestEmail = async () => {
    if (!settings.email) {
      setEmailError('Enter an email address first.')
      return
    }
    setEmailStatus('sending')
    setEmailError('')
    try {
      const res = await fetch('/api/send-email?test=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: settings.email }),
      })
      if (res.ok) {
        setEmailStatus('success')
        setTimeout(() => setEmailStatus('idle'), 3000)
      } else {
        const data = await res.json().catch(() => ({}))
        setEmailError(data.error ?? 'Failed to send email.')
        setEmailStatus('error')
      }
    } catch {
      setEmailError('Network error. Check your connection.')
      setEmailStatus('error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
      </div>

      {/* Email */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">Daily Reminder Email</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
          <input
            type="email"
            value={settings.email}
            onChange={e => handleChange({ email: e.target.value })}
            placeholder="you@example.com"
            className="w-full border border-slate-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ fontSize: '16px' }}
          />
          <p className="text-xs text-slate-500 mt-1">
            You'll get a 7:30 AM EST daily reminder with your workout schedule.
          </p>
        </div>

        {/* Test email button */}
        <button
          onClick={sendTestEmail}
          disabled={emailStatus === 'sending'}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            emailStatus === 'success'
              ? 'bg-green-100 text-green-700'
              : emailStatus === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          {emailStatus === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
          {emailStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {emailStatus === 'error' && <AlertCircle className="w-4 h-4" />}
          {emailStatus === 'idle' && 'Send Test Email'}
          {emailStatus === 'sending' && 'Sending...'}
          {emailStatus === 'success' && 'Email sent!'}
          {emailStatus === 'error' && 'Send failed — retry?'}
        </button>

        {emailError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{emailError}</p>
        )}
      </div>

      {/* Cycle start date */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">3-Week Cycle</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cycle Week A starts on
          </label>
          <input
            type="date"
            value={settings.cycleStartDate}
            onChange={e => handleChange({ cycleStartDate: e.target.value })}
            className="w-full border border-slate-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ fontSize: '16px' }}
          />
          <p className="text-xs text-slate-500 mt-1">
            Default: March 2, 2026. The app will rotate A→B→C based on weeks from this date.
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-700">Rotation logic:</p>
          <p>Week A → Week B: +1–2 reps per set (or +5 lbs)</p>
          <p>Week B → Week C: +1 set (3× → 4×)</p>
          <p>Week C → Week A: Reset reps, add 5–10 lbs base weight</p>
        </div>
      </div>

      {/* Weight unit */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800">Weight Unit</h2>
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          {(['lbs', 'kg'] as const).map(unit => (
            <button
              key={unit}
              onClick={() => handleChange({ weightUnit: unit })}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                settings.weightUnit === unit
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      {/* Setup info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-amber-800">Deployment Setup</h2>
        <p className="text-sm text-amber-700">
          For daily email reminders, add these to your Vercel environment variables:
        </p>
        <div className="font-mono text-xs bg-amber-100 rounded-lg p-3 space-y-1 text-amber-900">
          <p>RESEND_API_KEY=re_xxxx</p>
          <p>USER_EMAIL=you@example.com</p>
          <p>CYCLE_START_DATE=2026-03-02</p>
        </div>
        <p className="text-xs text-amber-600">
          Get a free API key at resend.com (3k emails/month free).
        </p>
      </div>

      {/* AI Coach setup */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-blue-800">AI Coach Setup</h2>
        <p className="text-sm text-blue-700">
          The AI Coach requires an OpenAI API key. Add this to your <span className="font-mono">.env.local</span> file and Vercel environment variables:
        </p>
        <div className="font-mono text-xs bg-blue-100 rounded-lg p-3 text-blue-900">
          <p>OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx</p>
        </div>
        <p className="text-xs text-blue-600">
          Get an API key at platform.openai.com. The coach uses GPT-4o — check your usage limits.
        </p>
      </div>
    </div>
  )
}
