'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date'
import { exerciseCatalog } from '@/lib/exerciseCatalog'
import { useAuth } from '@/components/AuthProvider'
import RequireAuth from '@/components/RequireAuth'
import Sidebar from '@/components/Sidebar'

const templateGoals = ['Muscle gain', 'Cardio']
const templateMuscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body']
const templateCardioModes = ['Treadmill', 'Bike', 'Rower', 'Stairmaster', 'Elliptical', 'Other']

import Link from 'next/link'

export default function WorkoutLibraryPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const exerciseTabs = Object.keys(exerciseCatalog)
  const [exerciseTab, setExerciseTab] = useState(exerciseTabs[0] || 'Chest')
  // Database search state
  const [dbSearchResults, setDbSearchResults] = useState([])

  const [exerciseSubTab, setExerciseSubTab] = useState(() => {
    const firstCat = exerciseTabs[0]
    const subs = firstCat ? Object.keys(exerciseCatalog[firstCat] || {}) : []
    return subs[0] || ''
  })
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal: 'Muscle gain',
    muscle_group: 'Full body',
    cardio_mode: 'Treadmill',
    estimated_duration: 30,
    exercises: [{ name: '', sets: 3, reps: 10, notes: '' }]
  })

  // Debounced search for database exercises
  useEffect(() => {
    const query = exerciseQuery.trim()
    if (query.length < 2) {
      setDbSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, slug, category')
        .ilike('name', `%${query}%`)
        .limit(10)

      if (!error && data) {
        setDbSearchResults(data)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [exerciseQuery])

  const fetchWorkouts = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('workout_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setWorkouts(data || [])
      setError(null)
    } catch (e) {
      console.error('Error fetching workout library:', e)
      setError('Failed to load workout library. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { if (user) fetchWorkouts() }, [user, fetchWorkouts])

  useEffect(() => {
    // Keep subcategory valid if the user switches main tabs.
    const subs = Object.keys(exerciseCatalog[exerciseTab] || {})
    if (!subs.includes(exerciseSubTab)) setExerciseSubTab(subs[0] || '')
  }, [exerciseTab, exerciseSubTab])

  const addExerciseFromCatalog = (exerciseName) => {
    if (!exerciseName) return

    if (!showForm) setShowForm(true)

    setFormData((prev) => {
      const next = { ...prev }
      const list = Array.isArray(next.exercises) ? [...next.exercises] : []

      // Prefer filling an existing blank row.
      const blankIdx = list.findIndex((ex) => !String(ex?.name || '').trim())
      if (blankIdx >= 0) {
        list[blankIdx] = { ...list[blankIdx], name: exerciseName }
      } else {
        list.push({ name: exerciseName, sets: 3, reps: 10, notes: '' })
      }

      next.exercises = list
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase) {
      setError('Database connection not available')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const workoutData = {
        name: formData.name,
        description: formData.description,
        goal: formData.goal,
        muscle_group: formData.goal === 'Muscle gain' ? formData.muscle_group : null,
        cardio_mode: formData.goal === 'Cardio' ? formData.cardio_mode : null,
        estimated_duration: parseInt(formData.estimated_duration) || 30,
        exercises: formData.exercises.filter(ex => ex.name.trim() !== ''),
        user_id: user.id
      }

      if (editingId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('workout_library')
          .update(workoutData)
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('workout_library')
          .insert([workoutData])

        if (insertError) throw insertError
      }

      await fetchWorkouts()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        goal: 'Muscle gain',
        muscle_group: 'Full body',
        cardio_mode: 'Treadmill',
        estimated_duration: 30,
        exercises: [{ name: '', sets: 3, reps: 10, notes: '' }]
      })
    } catch (e) {
      console.error('Error saving workout:', e)
      setError('Failed to save workout. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (workout) => {
    setEditingId(workout.id)
    setFormData({
      name: workout.name,
      description: workout.description || '',
      goal: workout.goal || 'Muscle gain',
      muscle_group: workout.muscle_group || 'Full body',
      cardio_mode: workout.cardio_mode || 'Treadmill',
      estimated_duration: workout.estimated_duration || 30,
      exercises: workout.exercises && workout.exercises.length > 0
        ? workout.exercises
        : [{ name: '', sets: 3, reps: 10, notes: '' }]
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this workout template?')) return
    if (!supabase) {
      setError('Database connection not available')
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('workout_library')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchWorkouts()
    } catch (e) {
      console.error('Error deleting workout:', e)
      setError('Failed to delete workout. Please try again.')
    }
  }

  const addExercise = () => {
    setFormData({
      ...formData,
      exercises: [...formData.exercises, { name: '', sets: 3, reps: 10, notes: '' }]
    })
  }

  const removeExercise = (index) => {
    setFormData({
      ...formData,
      exercises: formData.exercises.filter((_, i) => i !== index)
    })
  }

  const updateExercise = (index, field, value) => {
    const updated = [...formData.exercises]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, exercises: updated })
  }

  const startFromTemplate = async (workout) => {
    if (!confirm('Start a workout using this template? This will create a workout log for today.')) return
    if (!supabase) {
      setError('Database connection not available')
      return
    }

    try {
      const goal = workout.goal || 'Muscle gain'
      const type = goal === 'Cardio' ? 'Cardio' : 'Strength'
      const tags = goal === 'Cardio'
        ? `#cardio${workout.cardio_mode ? ` #${String(workout.cardio_mode).toLowerCase()}` : ''}`
        : `#muscle-gain${workout.muscle_group ? ` #${String(workout.muscle_group).toLowerCase().replace(/\\s+/g, '-')}` : ''}`

      const { error: insertError } = await supabase
        .from('workouts')
        .insert([{
          user_id: user.id,
          name: workout.name,
          type,
          duration: workout.estimated_duration,
          calories: 0,
          exercises: workout.exercises,
          date: getLocalDateString(),
          notes: `From template: ${workout.name} ${tags}`.trim()
        }])

      if (insertError) throw insertError
      alert('Workout started! Check your workout log.')
    } catch (e) {
      console.error('Error starting workout:', e)
      setError('Failed to start workout. Please try again.')
    }
  }

  const content = loading ? (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 flex items-center justify-center">
        <div className="spinner" />
      </main>
    </div>
  ) : (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto animate-fadeIn space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-bold">📚 Workout Library</h1>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setFormData({
                  name: '',
                  description: '',
                  goal: 'Muscle gain',
                  muscle_group: 'Full body',
                  cardio_mode: 'Treadmill',
                  estimated_duration: 30,
                  exercises: [{ name: '', sets: 3, reps: 10, notes: '' }]
                })
              }}
              className="btn-primary"
            >
              {showForm ? 'Cancel' : '+ Create Template'}
            </button>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
              {error}
              <button onClick={() => setError(null)} className="ml-4 text-error/70 hover:text-error">✕</button>
            </div>
          )}

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-lg font-semibold">Exercise Library</h3>
                <p className="text-sm text-gray-400">
                  Pick a muscle group, then click an exercise to add it to your template.
                </p>
              </div>
              <input
                value={exerciseQuery}
                onChange={(e) => setExerciseQuery(e.target.value)}
                placeholder="Search (e.g., bench, row, leg press)"
                className="w-full sm:w-80"
              />
            </div>

            {/* Database Search Results */}
            {dbSearchResults.length > 0 && (exerciseQuery.trim().length >= 2) && (
              <div className="mb-6 animate-fadeIn">
                <h4 className="text-sm font-semibold text-accent mb-2">Search Results</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {dbSearchResults.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-white/10 rounded-lg flex items-center justify-between gap-3 group"
                    >
                      <Link href={`/library/${ex.slug}`} className="font-medium hover:text-primary transition-colors flex-1 truncate">
                        {ex.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => addExerciseFromCatalog(ex.name)}
                        className="text-xs bg-primary/20 text-primary-light px-2 py-1 rounded hover:bg-primary/30"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-b border-white/5 my-4" />
              </div>
            )}


            <div className="flex flex-wrap gap-2">
              {exerciseTabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setExerciseTab(t)}
                  className={exerciseTab === t ? 'btn-primary text-sm px-3 py-2' : 'btn-secondary text-sm px-3 py-2'}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.keys(exerciseCatalog[exerciseTab] || {}).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setExerciseSubTab(st)}
                  className={exerciseSubTab === st ? 'btn-primary text-xs px-3 py-1.5' : 'btn-secondary text-xs px-3 py-1.5'}
                >
                  {st.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(
                (exerciseCatalog[exerciseTab]?.[exerciseSubTab] || [])
                  .filter((name) => {
                    const q = String(exerciseQuery || '').trim().toLowerCase()
                    if (!q) return true
                    return String(name).toLowerCase().includes(q)
                  })
              ).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addExerciseFromCatalog(name)}
                  className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Add to template exercises"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-gray-400">Add</span>
                  </div>
                </button>
              ))}
            </div>

            {exerciseQuery.trim() && (
              <p className="text-xs text-gray-500">
                Showing matches in {exerciseTab} / {exerciseSubTab.replace(/([a-z])([A-Z])/g, '$1 $2')}.
              </p>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="card space-y-4">
              <h3 className="font-display text-lg font-semibold">
                {editingId ? 'Edit Workout Template' : 'Create New Workout Template'}
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Workout Name</label>
                  <input
                    id="workout-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Upper Body Strength"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Goal</label>
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  >
                    {templateGoals.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {formData.goal === 'Muscle gain' ? (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Muscle Group</label>
                    <select
                      value={formData.muscle_group}
                      onChange={(e) => setFormData({ ...formData, muscle_group: e.target.value })}
                    >
                      {templateMuscleGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cardio Mode</label>
                    <select
                      value={formData.cardio_mode}
                      onChange={(e) => setFormData({ ...formData, cardio_mode: e.target.value })}
                    >
                      {templateCardioModes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Estimated Duration (min)</label>
                  <input
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    min="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this workout..."
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm text-gray-400">Exercises</label>
                  <button type="button" onClick={addExercise} className="btn-secondary text-sm py-1">
                    + Add Exercise
                  </button>
                </div>

                {formData.exercises.map((exercise, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Exercise {index + 1}</span>
                      {formData.exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExercise(index)}
                          className="text-error text-sm hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <input
                          value={exercise.name}
                          onChange={(e) => updateExercise(index, 'name', e.target.value)}
                          placeholder="Exercise name (e.g., Bench Press)"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value) || 0)}
                          placeholder="Sets"
                          min="1"
                        />
                        <input
                          type="number"
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value) || 0)}
                          placeholder="Reps"
                          min="1"
                        />
                      </div>
                    </div>
                    <input
                      value={exercise.notes || ''}
                      onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                      placeholder="Notes (e.g., RPE 8, 60 sec rest)"
                    />
                  </div>
                ))}
              </div>

              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editingId ? 'Update Template' : 'Save Template'}
              </button>
            </form>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {workouts.map((workout) => (
              <div key={workout.id} className="card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{workout.name}</h3>
                    {workout.description && (
                      <p className="text-gray-400 text-sm mt-1">{workout.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-primary/20 text-primary-light rounded">
                        {workout.goal || 'Muscle gain'}
                      </span>
                      {workout.goal === 'Muscle gain' && workout.muscle_group && (
                        <span className="text-xs px-2 py-1 bg-white/5 text-gray-300 rounded">
                          {workout.muscle_group}
                        </span>
                      )}
                      {workout.goal === 'Cardio' && workout.cardio_mode && (
                        <span className="text-xs px-2 py-1 bg-white/5 text-gray-300 rounded">
                          {workout.cardio_mode}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-accent">⏱️ {workout.estimated_duration} min</span>
                </div>

                <div className="space-y-2">
                  {workout.exercises && workout.exercises.map((exercise, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <span className="font-medium">{exercise.name}</span>
                        {exercise.notes && (
                          <span className="text-xs text-gray-500 block">{exercise.notes}</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {exercise.sets} × {exercise.reps}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startFromTemplate(workout)}
                    className="btn-primary flex-1"
                  >
                    ▶️ Start Workout
                  </button>
                  <button
                    onClick={() => handleEdit(workout)}
                    className="btn-secondary"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    className="btn-secondary text-error"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {workouts.length === 0 && !showForm && (
            <div className="card text-center py-12">
              <span className="text-4xl block mb-4">📚</span>
              <p className="text-gray-400">
                No workout templates yet. Create your first template above!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )

  return <RequireAuth>{content}</RequireAuth>
}
