import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getEnquiries } from '@/lib/firebase/firestore'

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status') as any

  const enquiries = await getEnquiries({
    status: statusParam || undefined,
  })

  return NextResponse.json({ success: true, data: enquiries })
}
