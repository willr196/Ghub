import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 10
const RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000

const getRateStore = () => {
  if (!globalThis.__ghubRegisterRateStore) {
    globalThis.__ghubRegisterRateStore = new Map()
  }
  return globalThis.__ghubRegisterRateStore
}

const normalize = (value) => (typeof value === 'string' ? value.trim() : '')

const codesMatch = (submitted, expected) => {
  const left = Buffer.from(submitted.toLowerCase())
  const right = Buffer.from(expected.toLowerCase())
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

const getClientIp = (request) => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim() || 'unknown'
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  return 'unknown'
}

const getRateEntry = (key) => {
  const store = getRateStore()
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    const fresh = { count: 0, windowStart: now, blockedUntil: 0 }
    store.set(key, fresh)
    return fresh
  }

  return existing
}

const getRateLimitState = (key) => {
  const now = Date.now()
  const entry = getRateEntry(key)

  if (entry.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    }
  }

  return { blocked: false, retryAfterSeconds: 0 }
}

const markFailedAttempt = (key) => {
  const store = getRateStore()
  const now = Date.now()
  const entry = getRateEntry(key)

  entry.count += 1
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.blockedUntil = now + RATE_LIMIT_BLOCK_MS
  }
  store.set(key, entry)

  if (entry.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    }
  }

  return { blocked: false, retryAfterSeconds: 0 }
}

const clearFailedAttempts = (key) => {
  const store = getRateStore()
  store.delete(key)
}

const failWithRateLimitTracking = (keys, error, status = 400) => {
  let retryAfterSeconds = 0
  for (const key of keys) {
    const state = markFailedAttempt(key)
    retryAfterSeconds = Math.max(retryAfterSeconds, state.retryAfterSeconds)
  }

  const response = NextResponse.json({ success: false, error }, { status })
  if (retryAfterSeconds > 0) {
    response.headers.set('Retry-After', String(retryAfterSeconds))
  }

  return response
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    const email = normalize(body?.email).toLowerCase()
    const password = normalize(body?.password)
    const submittedCode = normalize(body?.code)
    const ip = getClientIp(request)
    const attemptKeys = [`ip:${ip}`]
    if (email) {
      attemptKeys.push(`ip-email:${ip}:${email}`)
    }

    let activeRetryAfter = 0
    for (const key of attemptKeys) {
      const state = getRateLimitState(key)
      if (state.blocked) {
        activeRetryAfter = Math.max(activeRetryAfter, state.retryAfterSeconds)
      }
    }

    if (activeRetryAfter > 0) {
      const response = NextResponse.json(
        { success: false, error: 'Too many attempts. Try again later.' },
        { status: 429 }
      )
      response.headers.set('Retry-After', String(activeRetryAfter))
      return response
    }

    if (!email || !password || !submittedCode) {
      return failWithRateLimitTracking(
        attemptKeys,
        'Email, password, and code are required',
        400
      )
    }

    if (!emailPattern.test(email)) {
      return failWithRateLimitTracking(
        attemptKeys,
        'Enter a valid email address',
        400
      )
    }

    if (password.length < 6) {
      return failWithRateLimitTracking(
        attemptKeys,
        'Password must be at least 6 characters',
        400
      )
    }

    const validSecretCode = normalize(process.env.SECRET_CODE)
    const supabaseUrl = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const serviceRoleKey = normalize(process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (!validSecretCode || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server is not configured for registration' },
        { status: 500 }
      )
    }

    if (!codesMatch(submittedCode, validSecretCode)) {
      return failWithRateLimitTracking(attemptKeys, 'Invalid secret code', 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) {
      const message = String(error.message || 'Unable to create account')
      if (/already|exists|registered/i.test(message)) {
        return failWithRateLimitTracking(
          attemptKeys,
          'An account with this email already exists',
          409
        )
      }
      return failWithRateLimitTracking(attemptKeys, message, 400)
    }

    if (data?.user?.id) {
      const fallbackName = email.split('@')[0] || null
      const { error: profileError } = await admin
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            email: data.user.email,
            display_name: fallbackName,
            onboarding_completed: false,
            onboarding_hide_until: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (profileError) {
        console.error('Profile upsert failed after registration:', profileError)
      }
    }

    for (const key of attemptKeys) {
      clearFailedAttempts(key)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Registration route error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
