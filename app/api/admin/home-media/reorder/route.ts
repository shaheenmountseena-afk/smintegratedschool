import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { reorderHomeMediaDocs } from '@/lib/firebase/firestore'
import { verifyCsrfOrigin, checkPayloadSize, validateOrderedIds, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 })
    }

    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rateLimit = adminMutationLimiter.check(auth.user.uid)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateLimit.retryAfterSeconds || 60} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    if (!checkPayloadSize(request, 51200)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = await request.json().catch(() => ({}))
    const validation = validateOrderedIds(body?.orderedIds, 200)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const success = await reorderHomeMediaDocs(validation.ids)
    if (!success) {
      return NextResponse.json({ error: 'Failed to reorder home media' }, { status: 500 })
    }

    revalidatePath('/')

    return NextResponse.json({ success: true, message: 'Home media order updated successfully' })
  } catch (err: any) {
    return safeErrorResponse('Admin Home Media Reorder', err, 'Failed to update home media order')
  }
}
