import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { updateEnquiryStatus } from '@/lib/firebase/firestore'
import { verifyCsrfOrigin, checkPayloadSize, isValidDocId, cleanString, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

const VALID_STATUSES = ['new', 'contacted', 'resolved', 'archived'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!checkPayloadSize(request, 20480)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const { id } = await params
    if (!isValidDocId(id)) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { status, notes } = body

    if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Valid status is required ("new", "contacted", "resolved", "archived")' }, { status: 400 })
    }

    const cleanNotes = notes ? cleanString(notes, 0, 2000) : undefined

    const success = await updateEnquiryStatus(id, status, cleanNotes || undefined)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Enquiry updated successfully' })
  } catch (err: any) {
    return safeErrorResponse('Admin Enquiry PATCH', err, 'Failed to update enquiry')
  }
}
