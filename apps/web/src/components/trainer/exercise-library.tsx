'use client'

import { useState, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useDebounce } from '@/lib/utils/use-debounce'
import Link from 'next/link'

interface Exercise {
  id: string
  name: string
  category: string
  level: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string | null
  images: string[]
}

interface Props {
  initialExercises: Exercise[]
  allMuscles: string[]
}

const CATEGORIES = ['Strength', 'Cardio', 'Stretching', 'Plyometrics', 'Powerlifting', 'Olympic Weightlifting']
const LEVELS = ['beginner', 'intermediate', 'expert']

export default function ExerciseLibrary({ initialExercises, allMuscles }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)
  const [search, setSearch] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserSupabaseClient()

  const debouncedSearch = useDebounce(search, 300)

  const fetchExercises = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('exercises')
      .select('id, name, category, level, primary_muscles, secondary_muscles, equipment, images')
      .order('name', { ascending: true })
      .limit(100)

    if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`)
    if (selectedMuscle) query = query.contains('primary_muscles', [selectedMuscle])
    if (selectedCategory) query = query.eq('category', selectedCategory)
    if (selectedLevel) query = query.eq('level', selectedLevel)

    const { data } = await query
    setExercises(data ?? [])
    setLoading(false)
  }, [debouncedSearch, selectedMuscle, selectedCategory, selectedLevel])

  // Trigger search on filter change
  useState(() => { fetchExercises() })

  return (
    <div className="space-y-6">
      <h1 className="text-display">Exercise Library</h1>
      <p className="text-body text-foreground/60">{exercises.length} exercises</p>

      {/* Filters */}
      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); fetchExercises() }}
          placeholder="Search exercises…"
          className="input w-full max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {/* Muscle chips */}
          {allMuscles.slice(0, 12).map((m) => (
            <button
              key={m}
              onClick={() => { setSelectedMuscle(selectedMuscle === m ? null : m); fetchExercises() }}
              className={`badge cursor-pointer capitalize transition-colors ${
                selectedMuscle === m
                  ? 'bg-accent text-black'
                  : 'bg-surface-alt hover:bg-accent/20'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); fetchExercises() }}
              className={`badge cursor-pointer ${selectedCategory === cat ? 'bg-accent text-black' : 'bg-surface-alt'}`}
            >
              {cat}
            </button>
          ))}
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => { setSelectedLevel(selectedLevel === lvl ? null : lvl); fetchExercises() }}
              className={`badge cursor-pointer capitalize ${selectedLevel === lvl ? 'bg-accent text-black' : 'bg-surface-alt'}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {exercises.map((ex) => (
            <div key={ex.id} className="card-compact space-y-2">
              {/* Thumbnail */}
              {ex.images?.[0] ? (
                <img
                  src={ex.images[0]}
                  alt={ex.name}
                  className="w-full h-32 object-cover rounded-lg bg-surface-alt"
                />
              ) : (
                <div className="w-full h-32 rounded-lg bg-surface-alt flex items-center justify-center text-foreground/20">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4.5 12h15m-7.5-7.5v15" />
                  </svg>
                </div>
              )}

              <div>
                <p className="text-label font-medium leading-snug">{ex.name}</p>
                <p className="text-caption text-foreground/50 capitalize mt-0.5">
                  {ex.category} · {ex.level}
                </p>
              </div>

              {ex.primary_muscles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ex.primary_muscles.slice(0, 3).map((m) => (
                    <span key={m} className="badge bg-accent/10 text-accent capitalize text-[10px]">
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {ex.equipment && (
                <p className="text-caption text-foreground/40 capitalize">{ex.equipment}</p>
              )}
            </div>
          ))}

          {exercises.length === 0 && (
            <div className="col-span-full text-center py-16 text-foreground/40">
              No exercises found. Try different filters.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
