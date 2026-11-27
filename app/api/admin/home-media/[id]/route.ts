import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getHomeMediaById, updateHomeMediaDoc, deleteHomeMediaDoc } from '@/lib/firebase/firestore'
import { deleteCloudinaryAsset, isAuthorizedProjectPublicId } from '@/lib/cloudinary'
import { getDefaultVideoThumbnail } from '@/lib/media-utils'
import { verifyCsrfOrigin, checkPayloadSize, isValidDocId, cleanString, isSafeUrl, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

const VALID_TYPES = new Set(['video', 'poster', 'photo'])

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

    const existing = await getHomeMediaById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Home media item not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      type: rawType,
      mediaType: rawMediaType,
      title,
      caption,
      description,
      url: rawUrl,
      mediaUrl: rawMediaUrl,
      thumbnail: rawThumb,
      thumbnailUrl: rawThumbUrl,
      cloudinaryPublicId,
      thumbnailPublicId,
      ctaText,
      ctaLink,
      isPublished,
      order: rawOrder,
      displayOrder: rawDisplayOrder,
    } = body

    const updates: Record<string, any> = {}

    const incomingType =
      rawType !== undefined
        ? rawType
        : rawMediaType !== undefined
          ? rawMediaType === 'video'
            ? 'video'
            : 'poster'
          : undefined

    if (incomingType !== undefined) {
      if (!VALID_TYPES.has(incomingType)) {
        return NextResponse.json(
          { error: 'Type must be "poster", "photo", or "video"' },
          { status: 400 }
        )
      }
      updates.type = incomingType
      updates.mediaType = incomingType === 'video' ? 'video' : 'image'
    }

    if (title !== undefined) {
      const cleanTitle = cleanString(title, 1, 200)
      if (!cleanTitle) return NextResponse.json({ error: 'Title must be 1–200 characters' }, { status: 400 })
      updates.title = cleanTitle
    }

    const rawDesc = description !== undefined ? description : caption
    if (rawDesc !== undefined) {
      if (rawDesc === null || String(rawDesc).trim() === '') {
        updates.caption = ''
        updates.description = ''
      } else {
        const cleanCap = cleanString(rawDesc, 1, 500)
        if (!cleanCap) {
          return NextResponse.json({ error: 'Description must be at most 500 characters' }, { status: 400 })
        }
        updates.caption = cleanCap
        updates.description = cleanCap
      }
    }

    const rawEffectiveUrl = rawUrl !== undefined ? rawUrl : rawMediaUrl
    if (rawEffectiveUrl !== undefined) {
      if (!isSafeUrl(rawEffectiveUrl)) {
        return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
      }
      const trimmedUrl = String(rawEffectiveUrl).trim()
      updates.url = trimmedUrl
      updates.mediaUrl = trimmedUrl
    }

    const rawEffectiveThumb = rawThumb !== undefined ? rawThumb : rawThumbUrl
    if (rawEffectiveThumb !== undefined) {
      if (rawEffectiveThumb && !isSafeUrl(rawEffectiveThumb)) {
        return NextResponse.json({ error: 'Invalid thumbnail URL' }, { status: 400 })
      }
      const effectiveType = updates.type || existing.type
      const effectiveUrl = updates.url || existing.url
      const resolvedThumb = rawEffectiveThumb
        ? String(rawEffectiveThumb).trim()
        : effectiveType === 'video'
          ? getDefaultVideoThumbnail(effectiveUrl) || effectiveUrl
          : effectiveUrl
      updates.thumbnail = resolvedThumb
      updates.thumbnailUrl = resolvedThumb
    }

    if (cloudinaryPublicId !== undefined) {
      const cleanPid = cloudinaryPublicId ? String(cloudinaryPublicId).trim() : ''
      if (cleanPid && !isAuthorizedProjectPublicId(cleanPid)) {
        return NextResponse.json({ error: 'Invalid or unauthorized Cloudinary asset publicId' }, { status: 400 })
      }
      updates.cloudinaryPublicId = cleanPid
    }

    if (thumbnailPublicId !== undefined) {
      const cleanThumbPid = thumbnailPublicId ? String(thumbnailPublicId).trim() : ''
      if (cleanThumbPid && !isAuthorizedProjectPublicId(cleanThumbPid)) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized Cloudinary thumbnail publicId' },
          { status: 400 }
        )
      }
      updates.thumbnailPublicId = cleanThumbPid
    }

    if (ctaText !== undefined || ctaLink !== undefined) {
      const nextText = ctaText !== undefined ? String(ctaText || '').trim() : (existing.ctaText || '').trim()
      const nextLink = ctaLink !== undefined ? String(ctaLink || '').trim() : (existing.ctaLink || '').trim()

      if (Boolean(nextText) !== Boolean(nextLink)) {
        return NextResponse.json(
          { error: 'Both CTA button text and CTA destination link are required when adding a CTA button' },
          { status: 400 }
        )
      }

      if (nextText && nextLink) {
        const validatedCta = cleanString(nextText, 1, 60)
        if (!validatedCta) {
          return NextResponse.json({ error: 'CTA text must be 1–60 characters' }, { status: 400 })
        }
        if (!isSafeUrl(nextLink)) {
          return NextResponse.json(
            { error: 'CTA destination link must be a valid https://, http://, or / path' },
            { status: 400 }
          )
        }
        updates.ctaText = validatedCta
        updates.ctaLink = nextLink
      } else {
        updates.ctaText = ''
        updates.ctaLink = ''
      }
    }

    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished)

    const effectiveOrder = rawOrder !== undefined ? rawOrder : rawDisplayOrder
    if (effectiveOrder !== undefined && effectiveOrder !== '' && !isNaN(Number(effectiveOrder))) {
      const cleanOrder = Math.max(0, Math.floor(Number(effectiveOrder)))
      updates.order = cleanOrder
      updates.displayOrder = cleanOrder
    }

    if (
      cloudinaryPublicId &&
      existing.cloudinaryPublicId &&
      existing.cloudinaryPublicId !== cloudinaryPublicId &&
      isAuthorizedProjectPublicId(existing.cloudinaryPublicId)
    ) {
      const resType = existing.type === 'video' || existing.mediaType === 'video' ? 'video' : 'image'
      deleteCloudinaryAsset(existing.cloudinaryPublicId, resType).catch((err) => {
        console.warn('[Cloudinary Cleanup] Failed to delete replaced media asset:', err)
      })
    }

    if (
      thumbnailPublicId !== undefined &&
      existing.thumbnailPublicId &&
      existing.thumbnailPublicId !== thumbnailPublicId &&
      existing.thumbnailPublicId !== existing.cloudinaryPublicId &&
      isAuthorizedProjectPublicId(existing.thumbnailPublicId)
    ) {
      deleteCloudinaryAsset(existing.thumbnailPublicId, 'image').catch((err) => {
        console.warn('[Cloudinary Cleanup] Failed to delete replaced thumbnail asset:', err)
      })
    }

    const success = await updateHomeMediaDoc(id, updates)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update home media' }, { status: 500 })
    }

    revalidatePath('/')

    const updated = await getHomeMediaById(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (err: any) {
    return safeErrorResponse('Admin Home Media PUT', err, 'Failed to update home media')
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

    const existing = await getHomeMediaById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Home media item not found' }, { status: 404 })
    }

    let cloudinaryResult: string | undefined = undefined

    // 1. Delete primary Cloudinary asset if present before deleting Firestore metadata
    if (existing.cloudinaryPublicId && existing.cloudinaryPublicId.trim()) {
      const publicId = existing.cloudinaryPublicId.trim()

      if (!isAuthorizedProjectPublicId(publicId)) {
        console.error(`[Admin HomeMedia DELETE] Blocked unauthorized publicId: ${publicId}`)
        return NextResponse.json(
          {
            error:
              'Security restriction: The asset does not belong to an authorized project folder. Firestore record retained.',
          },
          { status: 403 }
        )
      }

      const resType = publicId.startsWith('shaheen-mount-seena/home/videos/')
        ? 'video'
        : publicId.startsWith('shaheen-mount-seena/home/posters/')
          ? 'image'
          : existing.type === 'video' || existing.mediaType === 'video'
            ? 'video'
            : 'image'
      const deleteResult = await deleteCloudinaryAsset(publicId, resType)

      if (!deleteResult.success) {
        console.error(`[Admin HomeMedia DELETE] Cloudinary deletion failed for ${publicId}:`, deleteResult.error)
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

    // 2. Delete custom Cloudinary thumbnail asset if present and distinct
    if (
      existing.thumbnailPublicId &&
      existing.thumbnailPublicId.trim() &&
      existing.thumbnailPublicId.trim() !== existing.cloudinaryPublicId?.trim()
    ) {
      const thumbPid = existing.thumbnailPublicId.trim()
      if (!isAuthorizedProjectPublicId(thumbPid)) {
        console.error(`[Admin HomeMedia DELETE] Blocked unauthorized thumbnailPublicId: ${thumbPid}`)
        return NextResponse.json(
          {
            error:
              'Security restriction: The thumbnail asset does not belong to an authorized project folder. Firestore record retained.',
          },
          { status: 403 }
        )
      }

      const thumbDeleteResult = await deleteCloudinaryAsset(thumbPid, 'image')
      if (!thumbDeleteResult.success) {
        console.error(`[Admin HomeMedia DELETE] Cloudinary thumbnail deletion failed for ${thumbPid}:`, thumbDeleteResult.error)
        return NextResponse.json(
          {
            error: `Failed to delete thumbnail from Cloudinary: ${thumbDeleteResult.error}. Database record retained.`,
            result: thumbDeleteResult.result,
          },
          { status: thumbDeleteResult.status || 502 }
        )
      }
    }

    // 3. Delete Firestore metadata only after Cloudinary confirms deletion
    const success = await deleteHomeMediaDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete home media from database' }, { status: 500 })
    }

    revalidatePath('/')

    return NextResponse.json({
      success: true,
      message: 'Home media item and associated asset deleted successfully.',
      cloudinaryResult,
    })
  } catch (err: any) {
    return safeErrorResponse('Admin Home Media DELETE', err, 'Failed to delete home media')
  }
}
