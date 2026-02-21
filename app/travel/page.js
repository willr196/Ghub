'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'

export default function TravelPage() {
  const { user, isAuthenticated } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('All')
  const [formData, setFormData] = useState({
    country: '',
    city: '',
    description: '',
    highlights: '',
    date_visited: '',
    rating: 5,
    would_return: true,
    is_public: true
  })

  const fetchTrips = useCallback(async () => {
    if (!supabase) {
      setError('Database connection not available')
      setLoading(false)
      return
    }

    try {
      let query = supabase
        .from('travel')
        .select('*')
        .order('date_visited', { ascending: false })
      
      // If not logged in, only show public trips
      if (!user) {
        query = query.eq('is_public', true)
      }
      
      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setTrips(data || [])
      setError(null)
    } catch (e) {
      console.error('Error fetching trips:', e)
      setError('Failed to load travel entries. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !user) {
      setError('You must be logged in to add trips')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('travel')
        .insert([{ ...formData, user_id: user.id }])
      
      if (insertError) throw insertError
      
      await fetchTrips()
      setShowForm(false)
      setFormData({
        country: '',
        city: '',
        description: '',
        highlights: '',
        date_visited: '',
        rating: 5,
        would_return: true,
        is_public: true
      })
    } catch (e) {
      console.error('Error adding trip:', e)
      setError('Failed to add trip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return
    if (!supabase) {
      setError('Database connection not available')
      return
    }

    try {
      const { error: deleteError } = await supabase.from('travel').delete().eq('id', id)
      if (deleteError) throw deleteError
      await fetchTrips()
    } catch (e) {
      console.error('Error deleting trip:', e)
      setError('Failed to delete trip. Please try again.')
    }
  }

  // Get unique countries for filter
  const countries = ['All', ...new Set(trips.map(t => t.country))].filter(Boolean)
  const filteredTrips = filter === 'All' ? trips : trips.filter(t => t.country === filter)
  
  // Stats
  const totalCountries = new Set(trips.map(t => t.country)).size
  const totalCities = trips.length

  const countryFlags = {
    'United Kingdom': '🇬🇧', 'France': '🇫🇷', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Germany': '🇩🇪',
    'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Austria': '🇦🇹',
    'Switzerland': '🇨🇭', 'Ireland': '🇮🇪', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
    'Finland': '🇫🇮', 'Poland': '🇵🇱', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Croatia': '🇭🇷',
    'USA': '🇺🇸', 'Canada': '🇨🇦', 'Mexico': '🇲🇽', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷',
    'Japan': '🇯🇵', 'China': '🇨🇳', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Indonesia': '🇮🇩',
    'Australia': '🇦🇺', 'New Zealand': '🇳🇿', 'South Africa': '🇿🇦', 'Egypt': '🇪🇬', 'Morocco': '🇲🇦',
    'Turkey': '🇹🇷', 'UAE': '🇦🇪', 'India': '🇮🇳', 'Singapore': '🇸🇬', 'Malaysia': '🇲🇾',
    'South Korea': '🇰🇷', 'Philippines': '🇵🇭', 'Iceland': '🇮🇸', 'Russia': '🇷🇺', 'Colombia': '🇨🇴'
  }

  const getFlag = (country) => countryFlags[country] || '🌍'

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

  return (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold">✈️ Travel Journal</h1>
              <p className="text-gray-400 mt-1">Documenting adventures around the world</p>
            </div>
            {isAuthenticated && (
              <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                {showForm ? 'Cancel' : '+ Add Trip'}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
              {error}
              <button onClick={() => setError(null)} className="ml-4 text-error/70 hover:text-error">✕</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <span className="text-3xl block mb-2">🌍</span>
              <span className="text-3xl font-display font-bold gradient-text">{totalCountries}</span>
              <span className="text-gray-400 text-sm block">Countries</span>
            </div>
            <div className="card text-center">
              <span className="text-3xl block mb-2">🏙️</span>
              <span className="text-3xl font-display font-bold gradient-text">{totalCities}</span>
              <span className="text-gray-400 text-sm block">Places</span>
            </div>
            <div className="card text-center">
              <span className="text-3xl block mb-2">⭐</span>
              <span className="text-3xl font-display font-bold gradient-text">
                {trips.length > 0 ? (trips.reduce((a, t) => a + (t.rating || 0), 0) / trips.length).toFixed(1) : '-'}
              </span>
              <span className="text-gray-400 text-sm block">Avg Rating</span>
            </div>
            <div className="card text-center">
              <span className="text-3xl block mb-2">🔄</span>
              <span className="text-3xl font-display font-bold gradient-text">
                {trips.filter(t => t.would_return).length}
              </span>
              <span className="text-gray-400 text-sm block">Would Return</span>
            </div>
          </div>

          {/* Add Trip Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="card space-y-4">
              <h3 className="font-display text-lg font-semibold">Add New Trip</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Country</label>
                  <input 
                    value={formData.country} 
                    onChange={(e) => setFormData({...formData, country: e.target.value})} 
                    placeholder="e.g., France" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City / Place</label>
                  <input 
                    value={formData.city} 
                    onChange={(e) => setFormData({...formData, city: e.target.value})} 
                    placeholder="e.g., Paris" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date Visited</label>
                  <input 
                    type="date" 
                    value={formData.date_visited} 
                    onChange={(e) => setFormData({...formData, date_visited: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Rating</label>
                  <select 
                    value={formData.rating} 
                    onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                  >
                    {[5,4,3,2,1].map(n => (
                      <option key={n} value={n}>{'⭐'.repeat(n)} ({n}/5)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="What was it like? What did you do?" 
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Highlights</label>
                <input 
                  value={formData.highlights} 
                  onChange={(e) => setFormData({...formData, highlights: e.target.value})} 
                  placeholder="Best food, must-see spots, tips..." 
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.would_return} 
                    onChange={(e) => setFormData({...formData, would_return: e.target.checked})} 
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-400">Would visit again</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.is_public} 
                    onChange={(e) => setFormData({...formData, is_public: e.target.checked})} 
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-400">Make public</span>
                </label>
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Trip'}
              </button>
            </form>
          )}

          {/* Country Filter */}
          {countries.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {countries.map(c => (
                <button 
                  key={c} 
                  onClick={() => setFilter(c)} 
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    filter === c 
                      ? 'gradient-bg text-white' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {c !== 'All' && <span className="mr-1">{getFlag(c)}</span>}
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Trips Grid */}
          {filteredTrips.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredTrips.map((trip) => (
                <div key={trip.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getFlag(trip.country)}</span>
                        <div>
                          <h3 className="font-display text-xl font-semibold">{trip.city}</h3>
                          <span className="text-gray-400 text-sm">{trip.country}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-warning">{'⭐'.repeat(trip.rating || 0)}</div>
                      {trip.date_visited && (
                        <span className="text-gray-500 text-xs">
                          {new Date(trip.date_visited).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {trip.description && (
                    <p className="text-gray-300 mb-3">{trip.description}</p>
                  )}
                  
                  {trip.highlights && (
                    <div className="bg-white/5 rounded-lg p-3 mb-3">
                      <span className="text-xs text-accent uppercase tracking-wider">Highlights</span>
                      <p className="text-gray-400 text-sm mt-1">{trip.highlights}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      {trip.would_return && (
                        <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">🔄 Would return</span>
                      )}
                    </div>
                    {user && trip.user_id === user.id && (
                      <button onClick={() => handleDelete(trip.id)} className="text-error hover:text-red-400 text-sm">
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <span className="text-5xl block mb-4">✈️</span>
              <p className="text-gray-400">
                No trips logged yet. {isAuthenticated ? 'Add your first adventure!' : 'Check back soon!'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
