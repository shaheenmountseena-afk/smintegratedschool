import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllResults, createResultDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const results = await getAllResults()
    return NextResponse.json({ success: true, data: results })
  } catch (err: any) {
    console.error('[Admin Results GET] Error:', err?.message)
    return NextResponse.json({ error: 'Failed to retrieve results' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const { year, name, score, exam, photo, cloudinaryPublicId, isPublished = true } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Student name is required' }, { status: 400 })
    }
    if (!score || typeof score !== 'string' || !score.trim()) {
      return NextResponse.json({ error: 'Score is required (e.g. "680 / 720")' }, { status: 400 })
    }
    if (!exam || typeof exam !== 'string' || !exam.trim()) {
      return NextResponse.json({ error: 'Exam name is required (e.g. "NEET-UG")' }, { status: 400 })
    }
    const parsedYear = Number(year) || new Date().getFullYear()

    const existing = await getAllResults()
    const order = existing.length

    const doc = await createResultDoc({
      year: parsedYear,
      name: name.trim(),
      score: score.trim(),
      exam: exam.trim(),
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
      return NextResponse.json({ error: 'Failed to create result entry in database' }, { status: 500 })
    }

    await markCollectionInitialized(COLLECTIONS.RESULTS).catch(() => {})
    revalidatePath('/results')
    revalidatePath('/gallery')

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err: any) {
    console.error('[Admin Results POST] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Failed to create result entry' },
      { status: 500 }
    )
  }
}
