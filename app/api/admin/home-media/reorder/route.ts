import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { reorderHomeMediaDocs } from '@/lib/firebase/firestore'

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { orderedIds } = await request.json().catch(() => ({}))
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds must be a non-empty array of IDs' }, { status: 400 })
  }

  const success = await reorderHomeMediaDocs(orderedIds)
  if (!success) {
    return NextResponse.json({ error: 'Failed to reorder home media' }, { status: 500 })
  }

  revalidatePath('/')

  return NextResponse.json({ success: true, message: 'Home media order updated successfully' })
}
