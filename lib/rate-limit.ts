import 'server-only'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

export class SimpleRateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowSeconds * 1000
  }

  check(identifier: string): RateLimitResult {
    const now = Date.now()
    const record = this.cache.get(identifier)

    // Passive garbage collection: clean stale entries on access if cache grows large
    if (this.cache.size > 1000) {
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

// Pre-configured rate limiter instances for sensitive endpoints
export const authSessionLimiter = new SimpleRateLimiter(10, 60) // 10 login / token exchanges per minute per IP
export const cloudinarySignLimiter = new SimpleRateLimiter(30, 60) // 30 upload signatures per minute
export const cloudinaryDeleteLimiter = new SimpleRateLimiter(20, 60) // 20 asset deletions per minute
export const seedLimiter = new SimpleRateLimiter(5, 600) // 5 sync operations per 10 minutes
export const adminMutationLimiter = new SimpleRateLimiter(60, 60) // 60 admin create/update/delete requests per minute

/**
 * Extracts a client IP address safely from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
