'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          code: secretCode,
        })
      })

      const registerResult = await registerResponse.json().catch(() => ({}))

      if (!registerResponse.ok || !registerResult.success) {
        setError(registerResult.error || 'Unable to create account right now.')
        setLoading(false)
        return
      }

      router.push('/login?registered=true')
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="fixed bottom-0 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-10">
          <span className="text-4xl">💪</span>
          <span className="font-display text-3xl font-bold gradient-text">GHUB</span>
        </Link>

        {/* Register Card */}
        <div className="card">
          <h1 className="font-display text-2xl font-bold text-center mb-2">
            🎄 Create Your Account
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Enter the secret code to register
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                🔑 Secret Registration Code
              </label>
              <input
                type="text"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Enter your secret code"
                required
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                This code was given to you by the person who made this site
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>

            {error && (
              <div className="text-error text-sm bg-error/10 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" />
                  Creating account...
                </span>
              ) : (
                'Create Account 🎁'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link href="/" className="hover:text-white transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}
