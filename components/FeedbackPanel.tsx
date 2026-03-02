'use client'

import { Feedback } from '@/lib/types'

interface FeedbackPanelProps {
  feedback: Feedback | undefined
  onChange: (feedback: Feedback) => void
}

const options: { value: Feedback; label: string; emoji: string; activeClass: string; inactiveClass: string }[] = [
  {
    value: 'too_easy',
    label: 'Too Easy',
    emoji: '😤',
    activeClass: 'bg-green-500 text-white border-green-500',
    inactiveClass: 'bg-white text-green-700 border-green-300 hover:bg-green-50',
  },
  {
    value: 'just_right',
    label: 'Just Right',
    emoji: '💪',
    activeClass: 'bg-blue-500 text-white border-blue-500',
    inactiveClass: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50',
  },
  {
    value: 'too_hard',
    label: 'Too Hard',
    emoji: '😅',
    activeClass: 'bg-orange-500 text-white border-orange-500',
    inactiveClass: 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50',
  },
]

export default function FeedbackPanel({ feedback, onChange }: FeedbackPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-700 mb-3">How did it feel?</p>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
              feedback === opt.value ? opt.activeClass : opt.inactiveClass
            }`}
          >
            <span className="text-xl">{opt.emoji}</span>
            <span className="text-xs">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
