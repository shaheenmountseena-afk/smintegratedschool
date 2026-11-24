import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllFaculty, createFacultyDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'
import { isAuthorizedProjectPublicId } from '@/lib/cloudinary'
import { verifyCsrfOrigin, checkPayloadSize, cleanString, isSafeUrl, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const faculty = await getAllFaculty()
    return NextResponse.json({ success: true, data: faculty })
  } catch (err: any) {
    return safeErrorResponse('Admin Faculty GET', err, 'Failed to retrieve faculty members')
  }
}

export async function POST(request: Request) {
  try {
    // 1. CSRF Verification
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 })
    }

    // 2. Authentication and Authorization
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // 3. Rate Limiting Protection
    const rateLimit = adminMutationLimiter.check(auth.user.uid)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rateLimit.retryAfterSeconds || 60} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    // 4. Payload Size Limit (50 KB max)
    if (!checkPayloadSize(request, 51200)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = await request.json().catch(() => ({}))
    const { name, role, group, previous, photo, cloudinaryPublicId, isPublished = true } = body

    // 5. Strict Input Validation
    const cleanName = cleanString(name, 2, 100)
    if (!cleanName) {
      return NextResponse.json({ error: 'Name is required (2–100 characters)' }, { status: 400 })
    }

    const cleanRole = cleanString(role, 2, 150)
    if (!cleanRole) {
      return NextResponse.json({ error: 'Role/Designation is required (2–150 characters)' }, { status: 400 })
    }

    if (group !== 'academic' && group !== 'mentorship') {
      return NextResponse.json({ error: 'Group must be "academic" or "mentorship"' }, { status: 400 })
    }

    const cleanPrevious = previous ? cleanString(previous, 1, 250) : undefined
    if (previous && !cleanPrevious) {
      return NextResponse.json({ error: 'Previous background must not exceed 250 characters' }, { status: 400 })
    }

    if (photo && !isSafeUrl(photo)) {
      return NextResponse.json({ error: 'Invalid photo URL. Must be a valid http(s) or relative URL' }, { status: 400 })
    }

    if (cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()) {
      const trimmedPid = cloudinaryPublicId.trim()
      if (!isAuthorizedProjectPublicId(trimmedPid)) {
        return NextResponse.json({ error: 'Invalid or unauthorized Cloudinary asset publicId' }, { status: 400 })
      }
    }

    const existing = await getAllFaculty()
    const order = existing.length

    const doc = await createFacultyDoc({
      name: cleanName,
      role: cleanRole,
      group,
      ...(cleanPrevious ? { previous: cleanPrevious } : {}),
      ...(photo && typeof photo === 'string' && photo.trim() ? { photo: photo.trim() } : {}),
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
    return safeErrorResponse('Admin Faculty POST', err, 'Failed to create faculty member')
  }
}
