import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getEnquiries } from '@/lib/firebase/firestore'
import { safeErrorResponse } from '@/lib/security'

const VALID_STATUSES = ['new', 'contacted', 'resolved', 'archived'] as const

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const rawStatus = searchParams.get('status')
    const statusParam = rawStatus && (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as (typeof VALID_STATUSES)[number])
      : undefined

    const enquiries = await getEnquiries({
      status: statusParam,
    })

    return NextResponse.json({ success: true, data: enquiries })
  } catch (err: any) {
    return safeErrorResponse('Admin Enquiries GET', err, 'Failed to retrieve enquiries')
  }
}
