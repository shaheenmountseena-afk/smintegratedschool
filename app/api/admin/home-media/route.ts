import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllHomeMedia, createHomeMediaDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'
import { isAuthorizedProjectPublicId } from '@/lib/cloudinary'
import { getDefaultVideoThumbnail } from '@/lib/media-utils'
import { verifyCsrfOrigin, checkPayloadSize, cleanString, isSafeUrl, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

const VALID_TYPES = new Set(['video', 'poster', 'photo'])

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const media = await getAllHomeMedia()
    return NextResponse.json({ success: true, data: media })
  } catch (err: any) {
    return safeErrorResponse('Admin Home Media GET', err, 'Failed to retrieve home media')
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
      order: rawOrder,
      displayOrder: rawDisplayOrder,
      isPublished = true,
    } = body

    const resolvedType =
      rawType ??
      (rawMediaType === 'video' ? 'video' : rawMediaType === 'image' ? 'poster' : undefined)

    if (!resolvedType || !VALID_TYPES.has(resolvedType)) {
      return NextResponse.json(
        { error: 'Type must be "poster", "photo", or "video"' },
        { status: 400 }
      )
    }

    const typedType = resolvedType as 'video' | 'poster' | 'photo'
    const resolvedMediaType: 'image' | 'video' = typedType === 'video' ? 'video' : 'image'

    const cleanTitle = cleanString(title, 1, 200)
    if (!cleanTitle) {
      return NextResponse.json({ error: 'Title is required (1–200 characters)' }, { status: 400 })
    }

    const rawEffectiveUrl = rawUrl ?? rawMediaUrl
    if (!rawEffectiveUrl || !isSafeUrl(rawEffectiveUrl)) {
      return NextResponse.json(
        { error: 'Valid Media URL is required (must start with https://, http://, or /)' },
        { status: 400 }
      )
    }
    const cleanUrl = String(rawEffectiveUrl).trim()

    const rawEffectiveThumb = rawThumb ?? rawThumbUrl
    if (rawEffectiveThumb && !isSafeUrl(rawEffectiveThumb)) {
      return NextResponse.json({ error: 'Invalid thumbnail URL' }, { status: 400 })
    }

    const derivedThumb =
      rawEffectiveThumb && typeof rawEffectiveThumb === 'string' && rawEffectiveThumb.trim()
        ? rawEffectiveThumb.trim()
        : resolvedMediaType === 'video'
          ? getDefaultVideoThumbnail(cleanUrl) || cleanUrl
          : cleanUrl

    if (cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()) {
      const trimmedPid = cloudinaryPublicId.trim()
      if (!isAuthorizedProjectPublicId(trimmedPid)) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized Cloudinary asset publicId' },
          { status: 400 }
        )
      }
    }

    if (thumbnailPublicId && typeof thumbnailPublicId === 'string' && thumbnailPublicId.trim()) {
      const trimmedThumbPid = thumbnailPublicId.trim()
      if (!isAuthorizedProjectPublicId(trimmedThumbPid)) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized Cloudinary thumbnail publicId' },
          { status: 400 }
        )
      }
    }

    const rawDesc = description !== undefined ? description : caption
    let cleanDesc: string | undefined
    if (rawDesc !== undefined && rawDesc !== null && String(rawDesc).trim() !== '') {
      const validatedDesc = cleanString(rawDesc, 1, 500)
      if (!validatedDesc) {
        return NextResponse.json(
          { error: 'Description must be at most 500 characters' },
          { status: 400 }
        )
      }
      cleanDesc = validatedDesc
    }

    const hasCtaText = typeof ctaText === 'string' && ctaText.trim().length > 0
    const hasCtaLink = typeof ctaLink === 'string' && ctaLink.trim().length > 0
    if (hasCtaText !== hasCtaLink) {
      return NextResponse.json(
        { error: 'Both CTA button text and CTA destination link are required when adding a CTA button' },
        { status: 400 }
      )
    }

    let cleanCtaText: string | undefined
    let cleanCtaLink: string | undefined
    if (hasCtaText && hasCtaLink) {
      const validatedCta = cleanString(ctaText, 1, 60)
      if (!validatedCta) {
        return NextResponse.json({ error: 'CTA text must be 1–60 characters' }, { status: 400 })
      }
      if (!isSafeUrl(ctaLink)) {
        return NextResponse.json(
          { error: 'CTA destination link must be a valid https://, http://, or / path' },
          { status: 400 }
        )
      }
      cleanCtaText = validatedCta
      cleanCtaLink = ctaLink.trim()
    }

    const existing = await getAllHomeMedia()
    const rawRequestedOrder = rawOrder !== undefined ? rawOrder : rawDisplayOrder
    const order =
      rawRequestedOrder !== undefined && rawRequestedOrder !== '' && !isNaN(Number(rawRequestedOrder))
        ? Math.max(0, Math.floor(Number(rawRequestedOrder)))
        : existing.length

    const doc = await createHomeMediaDoc({
      type: typedType,
      mediaType: resolvedMediaType,
      title: cleanTitle,
      ...(cleanDesc ? { caption: cleanDesc, description: cleanDesc } : {}),
      url: cleanUrl,
      mediaUrl: cleanUrl,
      thumbnail: derivedThumb,
      thumbnailUrl: derivedThumb,
      ...(cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()
        ? { cloudinaryPublicId: cloudinaryPublicId.trim() }
        : {}),
      ...(thumbnailPublicId && typeof thumbnailPublicId === 'string' && thumbnailPublicId.trim()
        ? { thumbnailPublicId: thumbnailPublicId.trim() }
        : {}),
      ...(cleanCtaText ? { ctaText: cleanCtaText, ctaLink: cleanCtaLink } : {}),
      order,
      displayOrder: order,
      isPublished: Boolean(isPublished),
    })

    if (!doc) {
      return NextResponse.json({ error: 'Failed to create home media in database' }, { status: 500 })
    }

    await markCollectionInitialized(COLLECTIONS.HOME_MEDIA).catch(() => {})
    revalidatePath('/')

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err: any) {
    return safeErrorResponse('Admin Home Media POST', err, 'Failed to create home media')
  }
}
