import { NextResponse } from 'next/server'
import { isFirebaseAdminConfigured } from '@/lib/firebase/admin'
import { createEnquiryDoc } from '@/lib/firebase/firestore'

// ============================================================================
// RATE LIMITING ARCHITECTURE & SERVERLESS CONSIDERATIONS
// ============================================================================
//
// [Architecture Note for Production Serverless Deployments (e.g., Vercel / AWS Lambda)]:
//
// 1. LIMITATIONS OF IN-MEMORY RATE LIMITING IN SERVERLESS:
//    - Instance Isolation: In serverless hosting (Vercel, AWS Lambda, Cloud Run), requests
//      are routed across multiple ephemeral container instances. An in-memory Map is
//      local to a single container and is NOT shared across instances.
//    - Ephemeral Lifecycles: Containers spin up, freeze, and terminate dynamically.
//      Cold starts reset in-memory state.
//    - Background Timers: Timers like setInterval() freeze when serverless contexts idle.
//
// 2. PRODUCTION-GRADE REPLACEMENT PATH:
//    - When migrating to high-volume production, replace this local adapter with a
//      distributed store (e.g., Upstash Redis via @upstash/ratelimit or a Firestore
//      distributed counter) by implementing the RateLimiter interface below.
//    - No external dependency is added today; this implementation provides immediate local
//      burst protection and passive memory reclamation without dangling timers.
// ============================================================================

export interface RateLimiterResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

export interface RateLimiter {
  check(identifier: string): Promise<RateLimiterResult> | RateLimiterResult
}

class InMemoryRateLimiter implements RateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 5, windowMinutes = 5) {
    this.maxRequests = maxRequests
    this.windowMs = windowMinutes * 60 * 1000
  }

  check(identifier: string): RateLimiterResult {
    const now = Date.now()
    const record = this.cache.get(identifier)

    // Passive garbage collection: clean stale entries on access if cache grows large
    if (this.cache.size > 500) {
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key)
        }
      }
    }

    if (!record || now > record.expiresAt) {
      this.cache.set(identifier, { count: 1, expiresAt: now + this.windowMs })
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    if (record.count >= this.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.expiresAt - now) / 1000))
      return { allowed: false, remaining: 0, retryAfterSeconds }
    }

    record.count += 1
    return { allowed: true, remaining: this.maxRequests - record.count }
  }
}

// Active rate limiter instance (can be swapped for DistributedRateLimiter in production)
const enquiryRateLimiter: RateLimiter = new InMemoryRateLimiter(5, 5) // 5 submissions per 5 minutes per IP

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    // 1. Abuse Protection: Request size limit (50 KB max)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 50000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    // 2. Abuse Protection: Rate limiting by client IP
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    const rateLimit = await enquiryRateLimiter.check(clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        },
      )
    }

    const data = await request.json()

    // 3. Honeypot Protection: Traps naive bots that fill hidden fields
    if (data.website) {
      // Silently return 200 without database write
      return NextResponse.json({ success: true, message: 'Enquiry received' })
    }

    // 4. Server-Side Validation: Student Name
    const studentName = typeof data.studentName === 'string' ? data.studentName.trim() : ''
    if (!studentName || studentName.length < 2 || studentName.length > 100) {
      return NextResponse.json(
        { error: 'Please enter a valid student name (2–100 characters).' },
        { status: 400 },
      )
    }

    // 5. Server-Side Validation: Mobile Phone Number (10 digits)
    const rawPhone = typeof data.phone === 'string' ? data.phone : ''
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 },
      )
    }

    // 6. Server-Side Validation: Email (Optional)
    const email = typeof data.email === 'string' ? data.email.trim() : ''
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Sanitize optional inputs
    const parentName = typeof data.parentName === 'string' ? data.parentName.trim().slice(0, 100) : ''
    const programme = typeof data.programme === 'string' ? data.programme.trim().slice(0, 100) : ''
    const group = typeof data.group === 'string' ? data.group.trim().slice(0, 100) : ''
    const message = typeof data.message === 'string' ? data.message.trim().slice(0, 2000) : ''

    // 7. Persistence to Firestore
    if (isFirebaseAdminConfigured()) {
      try {
        const docId = await createEnquiryDoc({
          studentName,
          parentName,
          phone: cleanPhone,
          email,
          programme,
          group,
          message,
        })

        if (!docId) {
          throw new Error('Database returned empty document ID')
        }

        return NextResponse.json({
          success: true,
          persisted: true,
          id: docId,
          message: 'Enquiry received and recorded successfully',
        })
      } catch (dbErr) {
        console.error('[API /api/enquiry] Firestore write error:', dbErr)
        // Never falsely report success if database write fails when configured
        return NextResponse.json(
          { error: 'Failed to record enquiry in database. Please call us directly.' },
          { status: 500 },
        )
      }
    }

    // Fallback when Firebase Admin is not yet configured (e.g. initial dev setup)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[API /api/enquiry] Received enquiry (Firebase unconfigured):', {
        studentName,
        phone: cleanPhone,
      })
    }

    return NextResponse.json({
      success: true,
      persisted: false,
      message: 'Enquiry received (database not yet configured)',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid enquiry payload' }, { status: 400 })
  }
}

// 8. Public Security: Deny GET/PUT/DELETE requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Enquiries cannot be read through public endpoints.' },
    { status: 405 },
  )
}
