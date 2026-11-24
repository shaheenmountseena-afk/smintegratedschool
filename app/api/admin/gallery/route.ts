import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllGallery, createGalleryDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'
import { isAuthorizedProjectPublicId } from '@/lib/cloudinary'
import { verifyCsrfOrigin, checkPayloadSize, cleanString, isSafeUrl, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const rawType = searchParams.get('type')
    const typeParam = rawType === 'photo' || rawType === 'poster' || rawType === 'video' ? rawType : undefined

    const items = await getAllGallery(typeParam)
    return NextResponse.json({ success: true, data: items })
  } catch (err: any) {
    return safeErrorResponse('Admin Gallery GET', err, 'Failed to retrieve gallery items')
  }
}

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
    const { type, category, year, title, caption, url, thumbnail, cloudinaryPublicId, isPublished = true } = body

    if (type !== 'photo' && type !== 'poster' && type !== 'video') {
      return NextResponse.json({ error: 'Type must be "photo", "poster", or "video"' }, { status: 400 })
    }

    const cleanCategory = cleanString(category, 1, 100)
    if (!cleanCategory) {
      return NextResponse.json({ error: 'Category is required (1–100 characters)' }, { status: 400 })
    }

    const cleanTitle = cleanString(title, 1, 200)
    if (!cleanTitle) {
      return NextResponse.json({ error: 'Title is required (1–200 characters)' }, { status: 400 })
    }

    if (!url || !isSafeUrl(url)) {
      return NextResponse.json({ error: 'Valid URL is required (must start with https://, http://, or /)' }, { status: 400 })
    }

    if (thumbnail && !isSafeUrl(thumbnail)) {
      return NextResponse.json({ error: 'Invalid thumbnail URL' }, { status: 400 })
    }

    if (cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()) {
      const trimmedPid = cloudinaryPublicId.trim()
      if (!isAuthorizedProjectPublicId(trimmedPid)) {
        return NextResponse.json({ error: 'Invalid or unauthorized Cloudinary asset publicId' }, { status: 400 })
      }
    }

    const numericYear = Number(year)
    const parsedYear = !isNaN(numericYear) && numericYear >= 2000 && numericYear <= 2100
      ? Math.floor(numericYear)
      : new Date().getFullYear()

    const cleanCaption = caption ? cleanString(caption, 0, 500) : undefined

    const existing = await getAllGallery()
    const order = existing.length

    const doc = await createGalleryDoc({
      type,
      category: cleanCategory,
      year: parsedYear,
      title: cleanTitle,
      ...(cleanCaption ? { caption: cleanCaption } : {}),
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
    return safeErrorResponse('Admin Gallery POST', err, 'Failed to create gallery item')
  }
}
