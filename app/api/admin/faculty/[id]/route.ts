import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getFacultyById, updateFacultyDoc, deleteFacultyDoc } from '@/lib/firebase/firestore'
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

    const existing = await getFacultyById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { name, role, group, previous, photo, cloudinaryPublicId, isPublished, order } = body

    const updates: Record<string, any> = {}

    if (name !== undefined) {
      const cleanName = cleanString(name, 2, 100)
      if (!cleanName) return NextResponse.json({ error: 'Name must be 2–100 characters' }, { status: 400 })
      updates.name = cleanName
    }

    if (role !== undefined) {
      const cleanRole = cleanString(role, 2, 150)
      if (!cleanRole) return NextResponse.json({ error: 'Role must be 2–150 characters' }, { status: 400 })
      updates.role = cleanRole
    }

    if (group !== undefined) {
      if (group !== 'academic' && group !== 'mentorship') {
        return NextResponse.json({ error: 'Group must be "academic" or "mentorship"' }, { status: 400 })
      }
      updates.group = group
    }

    if (previous !== undefined) {
      const cleanPrev = cleanString(previous, 0, 250)
      updates.previous = cleanPrev || ''
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

    // If replacing an existing Cloudinary image, clean up the old one
    if (
      cloudinaryPublicId &&
      existing.cloudinaryPublicId &&
      existing.cloudinaryPublicId !== cloudinaryPublicId &&
      isAuthorizedProjectPublicId(existing.cloudinaryPublicId)
    ) {
      deleteCloudinaryAsset(existing.cloudinaryPublicId, 'image').catch((err) =>
        console.warn('[Cloudinary Cleanup] Failed to delete replaced faculty photo:', err?.message)
      )
    }

    const success = await updateFacultyDoc(id, updates)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update faculty member' }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/faculty')

    const updated = await getFacultyById(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (err: any) {
    return safeErrorResponse('Admin Faculty PUT', err, 'Failed to update faculty member')
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

    const existing = await getFacultyById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 })
    }

    // 1. Cleanup Cloudinary photo if present before deleting Firestore record
    if (existing.cloudinaryPublicId && existing.cloudinaryPublicId.trim()) {
      const publicId = existing.cloudinaryPublicId.trim()
      if (isAuthorizedProjectPublicId(publicId)) {
        const deleteResult = await deleteCloudinaryAsset(publicId, 'image')
        if (!deleteResult.success) {
          console.error(`[Admin Faculty DELETE] Cloudinary deletion failed for ${publicId}:`, deleteResult.error)
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
    const success = await deleteFacultyDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete faculty member from database' }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/faculty')

    return NextResponse.json({ success: true, message: 'Faculty member deleted successfully' })
  } catch (err: any) {
    return safeErrorResponse('Admin Faculty DELETE', err, 'Failed to delete faculty member')
  }
}
