import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getGalleryById, updateGalleryDoc, deleteGalleryDoc } from '@/lib/firebase/firestore'
import { deleteCloudinaryAsset, isAuthorizedProjectPublicId } from '@/lib/cloudinary'
import { verifyCsrfOrigin, checkPayloadSize, isValidDocId, cleanString, isSafeUrl, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

export async function PUT(
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

    if (!checkPayloadSize(request, 51200)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const { id } = await params
    if (!isValidDocId(id)) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 })
    }

    const existing = await getGalleryById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { type, category, year, title, caption, url, thumbnail, cloudinaryPublicId, isPublished, order } = body

    const updates: Record<string, any> = {}

    if (type !== undefined) {
      if (type !== 'photo' && type !== 'poster' && type !== 'video') {
        return NextResponse.json({ error: 'Type must be "photo", "poster", or "video"' }, { status: 400 })
      }
      updates.type = type
    }

    if (category !== undefined) {
      const cleanCat = cleanString(category, 1, 100)
      if (!cleanCat) return NextResponse.json({ error: 'Category must be 1–100 characters' }, { status: 400 })
      updates.category = cleanCat
    }

    if (year !== undefined) {
      const numYear = Number(year)
      if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
        return NextResponse.json({ error: 'Year must be a valid 4-digit year' }, { status: 400 })
      }
      updates.year = Math.floor(numYear)
    }

    if (title !== undefined) {
      const cleanTitle = cleanString(title, 1, 200)
      if (!cleanTitle) return NextResponse.json({ error: 'Title must be 1–200 characters' }, { status: 400 })
      updates.title = cleanTitle
    }

    if (caption !== undefined) {
      const cleanCap = cleanString(caption, 0, 500)
      updates.caption = cleanCap || ''
    }

    if (url !== undefined) {
      if (!isSafeUrl(url)) {
        return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
      }
      updates.url = String(url).trim()
    }

    if (thumbnail !== undefined) {
      if (thumbnail && !isSafeUrl(thumbnail)) {
        return NextResponse.json({ error: 'Invalid thumbnail URL' }, { status: 400 })
      }
      updates.thumbnail = thumbnail ? String(thumbnail).trim() : (updates.url || existing.url)
    }

    if (cloudinaryPublicId !== undefined) {
      const cleanPid = cloudinaryPublicId ? String(cloudinaryPublicId).trim() : ''
      if (cleanPid && !isAuthorizedProjectPublicId(cleanPid)) {
        return NextResponse.json({ error: 'Invalid or unauthorized Cloudinary asset publicId' }, { status: 400 })
      }
      updates.cloudinaryPublicId = cleanPid
    }

    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished)
    if (order !== undefined) updates.order = Math.max(0, Math.floor(Number(order) || 0))

    if (
      cloudinaryPublicId &&
      existing.cloudinaryPublicId &&
      existing.cloudinaryPublicId !== cloudinaryPublicId &&
      isAuthorizedProjectPublicId(existing.cloudinaryPublicId)
    ) {
      const resType = existing.type === 'video' ? 'video' : 'image'
      deleteCloudinaryAsset(existing.cloudinaryPublicId, resType).catch((err) => {
        console.warn('[Cloudinary Cleanup] Failed to delete replaced gallery asset:', err)
      })
    }

    const success = await updateGalleryDoc(id, updates)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 })
    }

    revalidatePath('/gallery')

    const updated = await getGalleryById(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (err: any) {
    return safeErrorResponse('Admin Gallery PUT', err, 'Failed to update gallery item')
  }
}

export async function DELETE(
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

    const { id } = await params
    if (!isValidDocId(id)) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 })
    }

    const existing = await getGalleryById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
    }

    let cloudinaryResult: string | undefined = undefined

    // 1. If an associated Cloudinary asset exists, delete it before deleting Firestore metadata
    if (existing.cloudinaryPublicId && existing.cloudinaryPublicId.trim()) {
      const publicId = existing.cloudinaryPublicId.trim()

      if (!isAuthorizedProjectPublicId(publicId)) {
        console.error(`[Admin Gallery DELETE] Blocked unauthorized publicId: ${publicId}`)
        return NextResponse.json(
          {
            error:
              'Security restriction: The asset does not belong to an authorized project folder. Firestore record retained.',
          },
          { status: 403 }
        )
      }

      const resType = existing.type === 'video' ? 'video' : 'image'
      const deleteResult = await deleteCloudinaryAsset(publicId, resType)

      if (!deleteResult.success) {
        console.error(`[Admin Gallery DELETE] Cloudinary deletion failed for ${publicId}:`, deleteResult.error)
        return NextResponse.json(
          {
            error: `Failed to delete media from Cloudinary: ${deleteResult.error}. Database record retained.`,
            result: deleteResult.result,
          },
          { status: deleteResult.status || 502 }
        )
      }

      cloudinaryResult = deleteResult.result
    }

    // 2. Delete Firestore metadata only after Cloudinary confirms deletion
    const success = await deleteGalleryDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete gallery item from database' }, { status: 500 })
    }

    revalidatePath('/gallery')

    return NextResponse.json({
      success: true,
      message: 'Gallery item and associated media deleted successfully.',
      cloudinaryResult,
    })
  } catch (err: any) {
    return safeErrorResponse('Admin Gallery DELETE', err, 'Failed to delete gallery item')
  }
}
