import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getResultById, updateResultDoc, deleteResultDoc } from '@/lib/firebase/firestore'
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

    const existing = await getResultById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Result entry not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { year, name, score, exam, photo, cloudinaryPublicId, isPublished, order } = body

    const updates: Record<string, any> = {}

    if (name !== undefined) {
      const cleanName = cleanString(name, 1, 100)
      if (!cleanName) return NextResponse.json({ error: 'Name must be 1–100 characters' }, { status: 400 })
      updates.name = cleanName
    }

    if (score !== undefined) {
      const cleanScore = cleanString(score, 1, 50)
      if (!cleanScore) return NextResponse.json({ error: 'Score must be 1–50 characters' }, { status: 400 })
      updates.score = cleanScore
    }

    if (exam !== undefined) {
      const cleanExam = cleanString(exam, 1, 50)
      if (!cleanExam) return NextResponse.json({ error: 'Exam must be 1–50 characters' }, { status: 400 })
      updates.exam = cleanExam
    }

    if (year !== undefined) {
      const numYear = Number(year)
      if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
        return NextResponse.json({ error: 'Year must be a valid 4-digit year' }, { status: 400 })
      }
      updates.year = Math.floor(numYear)
    }

    if (photo !== undefined) {
      if (photo && !isSafeUrl(photo)) {
        return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 })
      }
      updates.photo = photo ? String(photo).trim() : ''
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
      deleteCloudinaryAsset(existing.cloudinaryPublicId, 'image').catch((err) => {
        console.warn('[Cloudinary Cleanup] Failed to delete replaced result photo:', err)
      })
    }

    const success = await updateResultDoc(id, updates)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update result entry' }, { status: 500 })
    }

    revalidatePath('/results')
    revalidatePath('/gallery')

    const updated = await getResultById(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (err: any) {
    return safeErrorResponse('Admin Results PUT', err, 'Failed to update result entry')
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

    const existing = await getResultById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Result entry not found' }, { status: 404 })
    }

    // 1. Cleanup Cloudinary photo if present before deleting Firestore metadata
    if (existing.cloudinaryPublicId && existing.cloudinaryPublicId.trim()) {
      const publicId = existing.cloudinaryPublicId.trim()
      if (isAuthorizedProjectPublicId(publicId)) {
        const deleteResult = await deleteCloudinaryAsset(publicId, 'image')
        if (!deleteResult.success) {
          console.error(`[Admin Results DELETE] Cloudinary deletion failed for ${publicId}:`, deleteResult.error)
          return NextResponse.json(
            {
              error: `Failed to delete photo from Cloudinary: ${deleteResult.error}. Database record retained.`,
            },
            { status: deleteResult.status || 502 }
          )
        }
      }
    }

    // 2. Delete Firestore record only after Cloudinary confirmed
    const success = await deleteResultDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete result entry from database' }, { status: 500 })
    }

    revalidatePath('/results')
    revalidatePath('/gallery')

    return NextResponse.json({ success: true, message: 'Result entry deleted successfully' })
  } catch (err: any) {
    return safeErrorResponse('Admin Results DELETE', err, 'Failed to delete result entry')
  }
}
