'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MessageCircle, X, Send, Loader2, Trash2, UtensilsCrossed } from 'lucide-react'
import {
  getLogs,
  getSettings,
  getOverrides,
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  saveMealPlan,
  setOverride,
  saveLog,
  getLogForDate,
  getAIProvider,
  saveAIProvider,
} from '@/lib/storage'
import {
  getEffectiveWorkoutType,
  getWeekInCycle,
  formatDate,
  getWorkoutDisplayName,
} from '@/lib/utils'
import { ChatMessage, CoachAction, AIProvider } from '@/lib/types'

function buildContext() {
  const logs = getLogs()
  const settings = getSettings()
  const overrides = getOverrides()
  const today = new Date()
  const todayStr = formatDate(today)
  const workoutType = getEffectiveWorkoutType(today, overrides)
  const weekInCycle = getWeekInCycle(today, settings.cycleStartDate)
  const todayLog = getLogForDate(todayStr)

  return {
    logs,
    settings,
    todayInfo: {
      date: todayStr,
      workoutType,
      weekInCycle,
      workoutDisplayName: getWorkoutDisplayName(workoutType),
      exercises: todayLog?.exercises ?? [],
      completed: todayLog?.completed ?? false,
    },
    overrides,
  }
}

function applyActions(actions: CoachAction[]) {
  for (const action of actions) {
    switch (action.type) {
      case 'override_workout':
        setOverride(action.date, action.workoutType)
        break
      case 'save_meal_plan':
        saveMealPlan(action.plan)
        break
      case 'add_workout_note': {
        const log = getLogForDate(action.date)
        if (log) {
          saveLog({ ...log, notes: action.note })
        }
        break
      }
      case 'edit_workout_log': {
        const log = getLogForDate(action.date)
        if (log) {
          const exIdx = log.exercises.findIndex(e => e.exerciseId === action.exerciseId)
          if (exIdx >= 0) {
            const updatedExercises = [...log.exercises]
            updatedExercises[exIdx] = { ...log.exercises[exIdx], ...action.updates }
            saveLog({ ...log, exercises: updatedExercises })
          }
        }
        break
      }
      case 'save_custom_workout':
        saveLog(action.workout)
        break
    }
  }
}

export default function CoachButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<AIProvider>('openai')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setMessages(getChatHistory())
    setProvider(getAIProvider())
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputText])

  async function handleSend() {
    if (!inputText.trim() || isLoading) return
    setError(null)

    const userMsg: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setInputText('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages,
          context: buildContext(),
          provider,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Coach request failed')
      }

      const data = await res.json() as { message: string; actions: CoachAction[] }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      }

      const finalHistory = [...updatedHistory, assistantMsg]
      setMessages(finalHistory)
      saveChatHistory(finalHistory)

      if (data.actions?.length > 0) {
        applyActions(data.actions)
        window.dispatchEvent(new Event('workout-updated'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClear() {
    clearChatHistory()
    setMessages([])
    setError(null)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[84px] right-4 z-[60] w-14 h-14 bg-blue-600 text-white rounded-full
                   shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95
                   transition-all"
        aria-label="Open AI Coach"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-up sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-[70] flex flex-col bg-white rounded-t-2xl
                       shadow-2xl"
            style={{ maxHeight: '92dvh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-800">AI Coach</span>
                <button
                  onClick={() => {
                    const next: AIProvider = provider === 'openai' ? 'anthropic' : 'openai'
                    setProvider(next)
                    saveAIProvider(next)
                  }}
                  className="text-xs px-2 py-0.5 rounded-full border transition-colors
                             hover:bg-slate-50 active:scale-95"
                  style={{
                    borderColor: provider === 'openai' ? '#10a37f' : '#d97706',
                    color: provider === 'openai' ? '#10a37f' : '#d97706',
                  }}
                  title="Click to switch AI provider"
                >
                  {provider === 'openai' ? 'GPT-4o' : 'Claude'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/meals"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 text-xs text-blue-600 font-medium
                             px-2.5 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Meals
                </Link>
                <button
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-center gap-1">
                  <MessageCircle className="w-8 h-8 text-slate-200 mb-1" />
                  <p className="text-slate-400 text-sm font-medium">Your AI fitness coach</p>
                  <p className="text-slate-400 text-xs">Ask about workouts, progress, or get a meal plan.</p>
                </div>
              )}

              {/* Suggestion chips — shown when no messages */}
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "What's my workout today?",
                    'Create a high protein meal plan',
                    'How is my squat progressing?',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setInputText(suggestion)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div
              className="px-4 py-3 border-t border-slate-100 bg-white shrink-0"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask your coach..."
                  rows={1}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  style={{ fontSize: '16px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputText.trim()}
                  className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center
                             disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
