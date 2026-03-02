'use client'

import { ExerciseLog, WorkoutLog } from '@/lib/types'
import { getPreviousMaxWeight } from '@/lib/utils'
import SetRow from './SetRow'

interface ExerciseLoggerProps {
  exercises: ExerciseLog[]
  weightUnit: 'lbs' | 'kg'
  allLogs: WorkoutLog[]
  currentDate: string
  onChange: (exercises: ExerciseLog[]) => void
}

export default function ExerciseLogger({
  exercises,
  weightUnit,
  allLogs,
  currentDate,
  onChange,
}: ExerciseLoggerProps) {
  const updateExercise = (idx: number, updated: ExerciseLog) => {
    const next = [...exercises]
    next[idx] = updated
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise, exIdx) => {
        const prevWeight = getPreviousMaxWeight(exercise.exerciseId, allLogs, currentDate)
        const completedSets = exercise.sets.filter(s => s.completed).length
        const allDone = completedSets === exercise.sets.length && exercise.sets.length > 0

        return (
          <div
            key={exercise.exerciseId}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {/* Exercise header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">{exercise.name}</h3>
                <p className="text-sm text-slate-500">
                  {exercise.targetSets} × {exercise.targetReps} reps
                  {prevWeight !== null && (
                    <span className="ml-2 text-blue-500">· prev best: {prevWeight} {weightUnit}</span>
                  )}
                </p>
              </div>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-full ${
                  allDone
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {completedSets}/{exercise.sets.length}
              </span>
            </div>

            {/* Set rows */}
            <div className="p-3 space-y-2">
              {exercise.sets.map((set, setIdx) => (
                <SetRow
                  key={set.setNumber}
                  set={set}
                  weightUnit={weightUnit}
                  prevWeight={prevWeight}
                  onChange={updatedSet => {
                    const nextSets = [...exercise.sets]
                    nextSets[setIdx] = updatedSet
                    updateExercise(exIdx, { ...exercise, sets: nextSets })
                  }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
