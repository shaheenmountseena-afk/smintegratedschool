import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { updateEnquiryStatus } from '@/lib/firebase/firestore'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const { status, notes } = await request.json().catch(() => ({}))

  if (!status || !['new', 'contacted', 'resolved', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
  }

  const success = await updateEnquiryStatus(id, status, notes)
  if (!success) {
    return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Enquiry updated successfully' })
}
