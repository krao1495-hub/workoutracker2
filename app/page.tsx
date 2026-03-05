'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import TodayWorkout from '@/components/TodayWorkout'

function WorkoutPage() {
  const searchParams = useSearchParams()
  const date = searchParams.get('date') || undefined
  return <TodayWorkout date={date} />
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm text-center py-12">Loading...</div>}>
      <WorkoutPage />
    </Suspense>
  )
}
