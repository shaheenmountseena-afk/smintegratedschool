import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllHomeMedia, createHomeMediaDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const media = await getAllHomeMedia()
    return NextResponse.json({ success: true, data: media })
  } catch (err: any) {
    console.error('[Admin Home Media GET] Error:', err?.message)
    return NextResponse.json({ error: 'Failed to retrieve home media' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const { type, title, caption, url, thumbnail, cloudinaryPublicId, isPublished = true } = body

    if (type !== 'video' && type !== 'poster') {
      return NextResponse.json({ error: 'Type must be "video" or "poster"' }, { status: 400 })
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const existing = await getAllHomeMedia()
    const order = existing.length

    const doc = await createHomeMediaDoc({
      type,
      title: title.trim(),
      ...(caption && typeof caption === 'string' && caption.trim()
        ? { caption: caption.trim() }
        : {}),
      url: url.trim(),
      thumbnail: thumbnail && typeof thumbnail === 'string' && thumbnail.trim() ? thumbnail.trim() : url.trim(),
      ...(cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()
        ? { cloudinaryPublicId: cloudinaryPublicId.trim() }
        : {}),
      order,
      isPublished: Boolean(isPublished),
    })

    if (!doc) {
      return NextResponse.json({ error: 'Failed to create home media in database' }, { status: 500 })
    }

    await markCollectionInitialized(COLLECTIONS.HOME_MEDIA).catch(() => {})
    revalidatePath('/')

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err: any) {
    console.error('[Admin Home Media POST] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Failed to create home media' },
      { status: 500 }
    )
  }
}
