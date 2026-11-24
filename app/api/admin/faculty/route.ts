import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllFaculty, createFacultyDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const faculty = await getAllFaculty()
    return NextResponse.json({ success: true, data: faculty })
  } catch (err: any) {
    console.error('[Admin Faculty GET] Error:', err?.message)
    return NextResponse.json({ error: 'Failed to retrieve faculty members' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const { name, role, group, previous, photo, cloudinaryPublicId, isPublished = true } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!role || typeof role !== 'string' || !role.trim()) {
      return NextResponse.json({ error: 'Role/Designation is required' }, { status: 400 })
    }
    if (group !== 'academic' && group !== 'mentorship') {
      return NextResponse.json({ error: 'Group must be "academic" or "mentorship"' }, { status: 400 })
    }

    const existing = await getAllFaculty()
    const order = existing.length

    const doc = await createFacultyDoc({
      name: name.trim(),
      role: role.trim(),
      group,
      ...(previous && typeof previous === 'string' && previous.trim()
        ? { previous: previous.trim() }
        : {}),
      ...(photo && typeof photo === 'string' && photo.trim()
        ? { photo: photo.trim() }
        : {}),
      ...(cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()
        ? { cloudinaryPublicId: cloudinaryPublicId.trim() }
        : {}),
      order,
      isPublished: Boolean(isPublished),
    })

    if (!doc) {
      return NextResponse.json({ error: 'Failed to create faculty member in database' }, { status: 500 })
    }

    await markCollectionInitialized(COLLECTIONS.FACULTY).catch(() => {})
    revalidatePath('/')
    revalidatePath('/faculty')

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err: any) {
    console.error('[Admin Faculty POST] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Failed to create faculty member' },
      { status: 500 }
    )
  }
}
