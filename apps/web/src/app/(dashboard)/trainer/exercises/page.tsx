import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExerciseLibrary from '@/components/trainer/exercise-library'

export default async function ExercisesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch initial page of exercises server-side
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, category, level, primary_muscles, secondary_muscles, equipment, images')
    .order('name', { ascending: true })
    .limit(50)

  // Fetch unique muscle groups for filters
  const { data: muscleRows } = await supabase
    .from('exercises')
    .select('primary_muscles')
    .limit(500)

  const allMuscles = Array.from(
    new Set((muscleRows ?? []).flatMap((r: any) => r.primary_muscles ?? []))
  ).sort() as string[]

  return (
    <ExerciseLibrary
      initialExercises={exercises ?? []}
      allMuscles={allMuscles}
    />
  )
}
