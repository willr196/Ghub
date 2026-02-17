'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function ExercisePage({ params }) {
    const { slug } = params
    const [exercise, setExercise] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchExercise() {
            if (!supabase) {
                setError('Database connection not available')
                setLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('exercises')
                    .select('*')
                    .eq('slug', slug)
                    .single()

                if (error) throw error
                setExercise(data)
            } catch (e) {
                console.error('Error fetching exercise:', e)
                setError('Exercise not found.')
            } finally {
                setLoading(false)
            }
        }

        fetchExercise()
    }, [slug])

    if (loading) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 flex items-center justify-center">
                    <div className="spinner" />
                </main>
            </div>
        )
    }

    if (error || !exercise) {
        return (
            <div className="flex min-h-screen bg-dark-bg">
                <Sidebar />
                <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
                    <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
                        {error || 'Exercise not found'}
                        <Link href="/library" className="block mt-2 underline">Back to Library</Link>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-dark-bg">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
                <div className="max-w-3xl mx-auto animate-fadeIn space-y-6">
                    <Link href="/library" className="text-gray-400 hover:text-white mb-4 block">
                        ← Back to Library
                    </Link>

                    <div className="card space-y-4">
                        <h1 className="font-display text-4xl font-bold">{exercise.name}</h1>

                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-primary/20 text-primary-light rounded-full text-sm">
                                {exercise.category}
                            </span>
                            <span className="px-3 py-1 bg-white/5 text-gray-300 rounded-full text-sm">
                                {exercise.subcategory}
                            </span>
                        </div>

                        <div className="prose prose-invert max-w-none">
                            <h3 className="text-xl font-semibold mt-6 mb-2">Description</h3>
                            <p className="text-gray-300">{exercise.description}</p>

                            {exercise.instructions && (
                                <>
                                    <h3 className="text-xl font-semibold mt-6 mb-2">Instructions</h3>
                                    <ol className="list-decimal pl-5 space-y-2 text-gray-300">
                                        {Array.isArray(exercise.instructions) ? (
                                            exercise.instructions.map((step, i) => <li key={i}>{step}</li>)
                                        ) : (
                                            <li>Follow standard form for {exercise.name}.</li>
                                        )}
                                    </ol>
                                </>
                            )}

                            {exercise.video_url && (
                                <div className="mt-8">
                                    <h3 className="text-xl font-semibold mb-4">Video Demonstration</h3>
                                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-white/10">
                                        <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                            Watch on YouTube ↗
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
