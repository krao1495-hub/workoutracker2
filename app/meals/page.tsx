'use client'

import { useEffect, useState } from 'react'
import { MealPlan } from '@/lib/types'
import { getMealPlans, deleteMealPlan } from '@/lib/storage'
import { formatDateDisplay } from '@/lib/utils'
import { Trash2, UtensilsCrossed, MessageCircle } from 'lucide-react'

export default function MealsPage() {
  const [plans, setPlans] = useState<MealPlan[]>([])

  useEffect(() => {
    setPlans(getMealPlans().sort((a, b) => b.date.localeCompare(a.date)))
  }, [])

  const handleDelete = (id: string) => {
    deleteMealPlan(id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Meal Plans</h1>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <UtensilsCrossed className="w-10 h-10 text-slate-200" />
          <div>
            <p className="text-slate-500 font-medium">No meal plans yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Ask the AI Coach to create one for you.
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Tap the chat button and say &quot;create a high protein meal plan&quot;</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Plan header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-800">{plan.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateDisplay(plan.date)}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-snug">{plan.description}</p>
                </div>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg
                             transition-colors shrink-0"
                  title="Delete plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Meals list */}
              <div className="divide-y divide-slate-50">
                {plan.meals.map((meal, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="font-medium text-sm text-slate-800">{meal.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {meal.calories != null && (
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            {meal.calories} kcal
                          </span>
                        )}
                        {meal.protein != null && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {meal.protein}g protein
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-snug">{meal.description}</p>
                  </div>
                ))}
              </div>

              {/* Totals footer */}
              {(plan.totalCalories != null || plan.totalProtein != null) && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-5">
                  {plan.totalCalories != null && (
                    <div>
                      <p className="text-xs text-slate-500">Total Calories</p>
                      <p className="font-bold text-slate-800">{plan.totalCalories}</p>
                    </div>
                  )}
                  {plan.totalProtein != null && (
                    <div>
                      <p className="text-xs text-slate-500">Total Protein</p>
                      <p className="font-bold text-blue-600">{plan.totalProtein}g</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
