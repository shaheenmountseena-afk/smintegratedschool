import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getAllResults, createResultDoc, markCollectionInitialized, COLLECTIONS } from '@/lib/firebase/firestore'
import { isAuthorizedProjectPublicId } from '@/lib/cloudinary'
import { verifyCsrfOrigin, checkPayloadSize, cleanString, isSafeUrl, safeErrorResponse } from '@/lib/security'
import { adminMutationLimiter } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const results = await getAllResults()
    return NextResponse.json({ success: true, data: results })
  } catch (err: any) {
    return safeErrorResponse('Admin Results GET', err, 'Failed to retrieve results')
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
    const { year, name, score, exam, photo, cloudinaryPublicId, isPublished = true } = body

    const cleanName = cleanString(name, 1, 100)
    if (!cleanName) {
      return NextResponse.json({ error: 'Student name is required (1–100 characters)' }, { status: 400 })
    }

    const cleanScore = cleanString(score, 1, 50)
    if (!cleanScore) {
      return NextResponse.json({ error: 'Score is required (e.g. "680 / 720")' }, { status: 400 })
    }

    const cleanExam = cleanString(exam, 1, 50)
    if (!cleanExam) {
      return NextResponse.json({ error: 'Exam name is required (e.g. "NEET-UG")' }, { status: 400 })
    }

    const numericYear = Number(year)
    const parsedYear = !isNaN(numericYear) && numericYear >= 2000 && numericYear <= 2100
      ? Math.floor(numericYear)
      : new Date().getFullYear()

    if (photo && !isSafeUrl(photo)) {
      return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 })
    }

    if (cloudinaryPublicId && typeof cloudinaryPublicId === 'string' && cloudinaryPublicId.trim()) {
      const trimmedPid = cloudinaryPublicId.trim()
      if (!isAuthorizedProjectPublicId(trimmedPid)) {
        return NextResponse.json({ error: 'Invalid or unauthorized Cloudinary asset publicId' }, { status: 400 })
      }
    }

    const existing = await getAllResults()
    const order = existing.length

    const doc = await createResultDoc({
      year: parsedYear,
      name: cleanName,
      score: cleanScore,
      exam: cleanExam,
      ...(photo && typeof photo === 'string' && photo.trim() ? { photo: photo.trim() } : {}),
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
    return safeErrorResponse('Admin Results POST', err, 'Failed to create result entry')
  }
}
