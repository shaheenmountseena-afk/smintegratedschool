import 'server-only'
import { NextResponse } from 'next/server'

/**
 * Validates that an incoming mutation request (POST, PUT, PATCH, DELETE) originates
 * from the same host, preventing Cross-Site Request Forgery (CSRF).
 */
export function verifyCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    // If origin header is absent, check referer header
    const referer = request.headers.get('referer')
    if (!referer) {
      // Standard for same-origin non-browser or direct requests; allow if no origin or referer
      return true
    }
    try {
      const refererUrl = new URL(referer)
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
      if (!host) return true
      return refererUrl.host.toLowerCase() === host.toLowerCase()
    } catch {
      return false
    }
  }

  try {
    const originUrl = new URL(origin)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (!host) return true
    return originUrl.host.toLowerCase() === host.toLowerCase()
  } catch {
    return false
  }
}

/**
 * Validates a Firestore document identifier.
 * Must be 1-128 characters, alphanumeric with hyphens or underscores.
 * Disallows path traversal, slashes, backslashes, dots, and null bytes.
 */
export function isValidDocId(id: unknown): id is string {
  if (typeof id !== 'string') return false
  const trimmed = id.trim()
  if (!trimmed || trimmed.length > 128) return false
  // Reject path navigation or separator characters
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..') || trimmed.includes('\0')) {
    return false
  }
  return /^[a-zA-Z0-9_-]+$/.test(trimmed)
}

/**
 * Validates that a URL is safe to store and render in public DOM/media tags.
 * Only permits https://, http://, or root-relative paths (/...).
 * Strictly rejects javascript:, data:, vbscript:, and control characters.
 */
export function isSafeUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed || trimmed.length > 2048) return false

  // Reject dangerous schemes or control characters
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    /[\x00-\x1f\x7f]/.test(trimmed)
  ) {
    return false
  }

  // Allow root-relative paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Validates and sanitizes a string within length bounds.
 */
export function cleanString(val: unknown, minLen = 1, maxLen = 500): string | null {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  if (trimmed.length < minLen || trimmed.length > maxLen) return null
  return trimmed
}

/**
 * Validates an array of ordered document IDs for reorder endpoints.
 * Ensures non-empty array of valid document IDs, max 200 items, and no duplicates.
 */
export function validateOrderedIds(
  ids: unknown,
  maxCount = 200
): { valid: true; ids: string[] } | { valid: false; error: string } {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { valid: false, error: 'orderedIds must be a non-empty array of IDs' }
  }

  if (ids.length > maxCount) {
    return { valid: false, error: `Too many IDs. Maximum allowed is ${maxCount}` }
  }

  const seen = new Set<string>()
  const sanitized: string[] = []

  for (const item of ids) {
    if (!isValidDocId(item)) {
      return { valid: false, error: `Invalid document ID: '${String(item)}'` }
    }
    if (seen.has(item)) {
      return { valid: false, error: `Duplicate document ID detected: '${item}'` }
    }
    seen.add(item)
    sanitized.push(item)
  }

  return { valid: true, ids: sanitized }
}

/**
 * Checks incoming request payload size against a maximum byte threshold.
 */
export function checkPayloadSize(request: Request, maxBytes = 51200): boolean {
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    const bytes = parseInt(contentLength, 10)
    if (!isNaN(bytes) && bytes > maxBytes) {
      return false
    }
  }
  return true
}

/**
 * Formats a safe JSON error response without exposing stack traces or internal server details.
 */
export function safeErrorResponse(
  context: string,
  error: unknown,
  fallbackMessage = 'An internal server error occurred. Please try again.',
  status = 500
): NextResponse {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[Security Guard: ${context}]`, message)

  return NextResponse.json(
    {
      error: fallbackMessage,
    },
    { status }
  )
}
