import { WeekInCycle, ExerciseDefinition } from './types'

export const exercises: Record<string, ExerciseDefinition> = {
  // Legs
  barbellBackSquat:    { id: 'barbell_back_squat',     name: 'Barbell Back Squat' },
  reverseLunges:       { id: 'reverse_lunges',          name: 'Reverse Lunges' },
  gluteBridges:        { id: 'glute_bridges',           name: 'Glute Bridges' },
  stepUps:             { id: 'step_ups',                name: 'Step Ups' },
  singleLegRDLs:       { id: 'single_leg_rdls',         name: 'Single Leg RDLs' },
  stepDowns:           { id: 'step_downs',              name: 'Step Downs' },
  romanianDeadlift:    { id: 'romanian_deadlift',       name: 'Romanian Deadlift' },
  hipThrust:           { id: 'hip_thrust',              name: 'Hip Thrust' },
  calfRaises:          { id: 'calf_raises',             name: 'Calf Raises' },
  legCurl:             { id: 'leg_curl',                name: 'Leg Curl' },
  // Upper body
  dbChestPress:        { id: 'db_chest_press',          name: 'DB Chest Press' },
  inclineDBPress:      { id: 'incline_db_press',        name: 'Incline DB Press' },
  bentOverBarbellRow:  { id: 'bent_over_barbell_row',   name: 'Bent Over Barbell Row' },
  pullUps:             { id: 'pull_ups',                name: 'Pull-ups' },
  dbLateralRaise:      { id: 'db_lateral_raise',        name: 'DB Lateral Raise' },
  singleArmDBRow:      { id: 'single_arm_db_row',       name: 'Single-Arm DB Row' },
  overheadPress:       { id: 'overhead_press',          name: 'Overhead Press' },
  facePull:            { id: 'face_pull',               name: 'Face Pull' },
  chestSupportedDBRow: { id: 'chest_supported_db_row',  name: 'Chest-Supported DB Row' },
  dbBicepCurl:         { id: 'db_bicep_curl',           name: 'DB Bicep Curl' },
  tricepDip:           { id: 'tricep_dip',              name: 'Tricep Dip' },
}

interface ProgramEntry {
  exercise: ExerciseDefinition
  targetSets: number
  targetReps: string
}

type ProgramKey = 'legs_squat' | 'legs_no_squat' | 'upper_body'

export const workoutProgram: Record<ProgramKey, Record<WeekInCycle, ProgramEntry[]>> = {
  legs_squat: {
    A: [
      { exercise: exercises.barbellBackSquat,  targetSets: 3, targetReps: '8' },
      { exercise: exercises.reverseLunges,     targetSets: 3, targetReps: '10 ea' },
      { exercise: exercises.romanianDeadlift,  targetSets: 3, targetReps: '10' },
      { exercise: exercises.gluteBridges,      targetSets: 3, targetReps: '12' },
      { exercise: exercises.stepUps,           targetSets: 3, targetReps: '10 ea' },
      { exercise: exercises.calfRaises,        targetSets: 3, targetReps: '15' },
    ],
    B: [
      { exercise: exercises.barbellBackSquat,  targetSets: 3, targetReps: '10' },
      { exercise: exercises.stepUps,           targetSets: 3, targetReps: '12 ea' },
      { exercise: exercises.singleLegRDLs,     targetSets: 3, targetReps: '10 ea' },
      { exercise: exercises.hipThrust,         targetSets: 3, targetReps: '12' },
      { exercise: exercises.legCurl,           targetSets: 3, targetReps: '12' },
      { exercise: exercises.calfRaises,        targetSets: 3, targetReps: '15' },
    ],
    C: [
      { exercise: exercises.barbellBackSquat,  targetSets: 4, targetReps: '8' },
      { exercise: exercises.stepDowns,         targetSets: 4, targetReps: '8 ea' },
      { exercise: exercises.reverseLunges,     targetSets: 4, targetReps: '8 ea' },
      { exercise: exercises.romanianDeadlift,  targetSets: 3, targetReps: '10' },
      { exercise: exercises.hipThrust,         targetSets: 3, targetReps: '10' },
      { exercise: exercises.gluteBridges,      targetSets: 3, targetReps: '12' },
      { exercise: exercises.calfRaises,        targetSets: 3, targetReps: '15' },
    ],
  },
  legs_no_squat: {
    A: [
      { exercise: exercises.reverseLunges,     targetSets: 3, targetReps: '10 ea' },
      { exercise: exercises.stepUps,           targetSets: 3, targetReps: '10 ea' },
      { exercise: exercises.romanianDeadlift,  targetSets: 3, targetReps: '10' },
      { exercise: exercises.gluteBridges,      targetSets: 3, targetReps: '12' },
      { exercise: exercises.legCurl,           targetSets: 3, targetReps: '12' },
      { exercise: exercises.calfRaises,        targetSets: 3, targetReps: '15' },
    ],
    B: [
      { exercise: exercises.singleLegRDLs,    targetSets: 3, targetReps: '12 ea' },
      { exercise: exercises.stepDowns,         targetSets: 3, targetReps: '12 ea' },
      { exercise: exercises.hipThrust,         targetSets: 3, targetReps: '12' },
      { exercise: exercises.gluteBridges,      targetSets: 3, targetReps: '12' },
      { exercise: exercises.legCurl,           targetSets: 3, targetReps: '12' },
      { exercise: exercises.calfRaises,        targetSets: 3, targetReps: '15' },
    ],
    C: [
      { exercise: exercises.stepUps,           targetSets: 4, targetReps: '8 ea' },
      { exercise: exercises.reverseLunges,     targetSets: 4, targetReps: '8 ea' },
      { exercise: exercises.singleLegRDLs,    targetSets: 4, targetReps: '8 ea' },
      { exercise: exercises.hipThrust,         targetSets: 3, targetReps: '10' },
      { exercise: exercises.romanianDeadlift,  targetSets: 3, targetReps: '10' },
      { exercise: exercises.gluteBridges,      targetSets: 3, targetReps: '12' },
      { exercise: exercises.calfRaises,        targetSets: 3, targetReps: '15' },
    ],
  },
  upper_body: {
    A: [
      { exercise: exercises.dbChestPress,       targetSets: 3, targetReps: '10' },
      { exercise: exercises.bentOverBarbellRow,  targetSets: 3, targetReps: '10' },
      { exercise: exercises.pullUps,            targetSets: 3, targetReps: '8' },
      { exercise: exercises.overheadPress,      targetSets: 3, targetReps: '10' },
      { exercise: exercises.dbLateralRaise,     targetSets: 3, targetReps: '12' },
      { exercise: exercises.dbBicepCurl,        targetSets: 3, targetReps: '12' },
    ],
    B: [
      { exercise: exercises.dbChestPress,       targetSets: 3, targetReps: '12' },
      { exercise: exercises.singleArmDBRow,     targetSets: 3, targetReps: '12 ea' },
      { exercise: exercises.pullUps,            targetSets: 3, targetReps: '10' },
      { exercise: exercises.overheadPress,      targetSets: 3, targetReps: '10' },
      { exercise: exercises.facePull,           targetSets: 3, targetReps: '15' },
      { exercise: exercises.tricepDip,          targetSets: 3, targetReps: '12' },
    ],
    C: [
      { exercise: exercises.dbChestPress,        targetSets: 4, targetReps: '8' },
      { exercise: exercises.chestSupportedDBRow, targetSets: 4, targetReps: '8' },
      { exercise: exercises.pullUps,             targetSets: 4, targetReps: '8' },
      { exercise: exercises.inclineDBPress,      targetSets: 3, targetReps: '10' },
      { exercise: exercises.dbLateralRaise,      targetSets: 3, targetReps: '12' },
      { exercise: exercises.dbBicepCurl,         targetSets: 3, targetReps: '10' },
      { exercise: exercises.tricepDip,           targetSets: 3, targetReps: '10' },
    ],
  },
}

// All exercises that can appear in progress charts
export const allExercises: ExerciseDefinition[] = Object.values(exercises)
