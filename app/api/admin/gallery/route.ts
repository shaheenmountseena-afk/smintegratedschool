import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllGallery, createGalleryDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('type') as 'photo' | 'poster' | 'video' | null

    const items = await getAllGallery(typeParam || undefined)
    return NextResponse.json({ success: true, data: items })
  } catch (err: any) {
    console.error('[Admin Gallery GET] Error:', err?.message)
    return NextResponse.json({ error: 'Failed to retrieve gallery items' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const { type, category, year, title, caption, url, thumbnail, cloudinaryPublicId, isPublished = true } = body

    if (type !== 'photo' && type !== 'poster' && type !== 'video') {
      return NextResponse.json({ error: 'Type must be "photo", "poster", or "video"' }, { status: 400 })
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json({ error: 'Category is required (e.g. "Campus", "Events", "Hostel")' }, { status: 400 })
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    const parsedYear = Number(year) || new Date().getFullYear()

    const existing = await getAllGallery()
    const order = existing.length

    const doc = await createGalleryDoc({
      type,
      category: category.trim(),
      year: parsedYear,
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
      return NextResponse.json({ error: 'Failed to create gallery item in database' }, { status: 500 })
    }

    await markCollectionInitialized(COLLECTIONS.GALLERY).catch(() => {})
    revalidatePath('/gallery')

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err: any) {
    console.error('[Admin Gallery POST] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Failed to create gallery item' },
      { status: 500 }
    )
  }
}
