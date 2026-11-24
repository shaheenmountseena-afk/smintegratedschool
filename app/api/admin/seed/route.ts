import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import {
  getAllFaculty,
  createFacultyDoc,
  getAllHomeMedia,
  createHomeMediaDoc,
  getAllResults,
  createResultDoc,
  getAllGallery,
  createGalleryDoc,
  markCollectionInitialized,
  COLLECTIONS,
} from '@/lib/firebase/firestore'
import { faculty as staticFaculty } from '@/data/faculty'
import { admissionsMedia as staticHomeMedia } from '@/data/homeMedia'
import { results as staticResults } from '@/data/results'
import { gallery as staticGallery } from '@/data/gallery'
import { verifyCsrfOrigin, checkPayloadSize, safeErrorResponse } from '@/lib/security'
import { seedLimiter } from '@/lib/rate-limit'

export interface SyncSectionReport {
  created: number
  updated: number
  skipped: number
  failed: number
}

export interface SyncReport {
  faculty: SyncSectionReport
  homeMedia: SyncSectionReport
  results: SyncSectionReport
  gallery: SyncSectionReport
}

const VALID_TARGETS = ['faculty', 'homeMedia', 'results', 'gallery'] as const

export async function POST(request: Request) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 })
    }

    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rateLimit = seedLimiter.check(auth.user.uid)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Sync operations are rate limited. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before syncing again.`,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    if (!checkPayloadSize(request, 10240)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = await request.json().catch(() => ({}))
    const { target } = body

    if (target && !VALID_TARGETS.includes(target)) {
      return NextResponse.json(
        { error: `Invalid target '${String(target)}'. Permitted targets: ${VALID_TARGETS.join(', ')}` },
        { status: 400 }
      )
    }

    const report: SyncReport = {
      faculty: { created: 0, updated: 0, skipped: 0, failed: 0 },
      homeMedia: { created: 0, updated: 0, skipped: 0, failed: 0 },
      results: { created: 0, updated: 0, skipped: 0, failed: 0 },
      gallery: { created: 0, updated: 0, skipped: 0, failed: 0 },
    }

    // 1. Synchronize Faculty
    if (!target || target === 'faculty') {
      const existing = await getAllFaculty()
      const existingIds = new Set(existing.map((e) => e.id))
      const existingNames = new Set(existing.map((e) => e.name.trim().toLowerCase()))

      let currentOrder = existing.length
      for (const item of staticFaculty) {
        if (existingIds.has(item.id) || existingNames.has(item.name.trim().toLowerCase())) {
          report.faculty.skipped++
          continue
        }

        try {
          const doc = await createFacultyDoc(
            {
              name: item.name,
              role: item.role,
              previous: item.previous || undefined,
              group: item.group,
              photo: item.photo || undefined,
              order: currentOrder++,
              isPublished: true,
            },
            item.id
          )
          if (doc) {
            existingIds.add(item.id)
            existingNames.add(item.name.trim().toLowerCase())
            report.faculty.created++
          } else {
            report.faculty.failed++
          }
        } catch {
          report.faculty.failed++
        }
      }
      await markCollectionInitialized(COLLECTIONS.FACULTY)
    }

    // 2. Synchronize Home Media
    if (!target || target === 'homeMedia') {
      const existing = await getAllHomeMedia()
      const existingIds = new Set(existing.map((e) => e.id))
      const existingUrls = new Set(existing.map((e) => e.url.trim().toLowerCase()))

      let currentOrder = existing.length
      for (const item of staticHomeMedia) {
        if (existingIds.has(item.id) || existingUrls.has(item.url.trim().toLowerCase())) {
          report.homeMedia.skipped++
          continue
        }

        try {
          const doc = await createHomeMediaDoc(
            {
              type: item.type,
              title: item.title,
              url: item.url,
              thumbnail: item.thumbnail || item.url,
              order: currentOrder++,
              isPublished: true,
            },
            item.id
          )
          if (doc) {
            existingIds.add(item.id)
            existingUrls.add(item.url.trim().toLowerCase())
            report.homeMedia.created++
          } else {
            report.homeMedia.failed++
          }
        } catch {
          report.homeMedia.failed++
        }
      }
      await markCollectionInitialized(COLLECTIONS.HOME_MEDIA)
    }

    // 3. Synchronize Results
    if (!target || target === 'results') {
      const existing = await getAllResults()
      const existingIds = new Set(existing.map((e) => e.id))
      const existingSignatures = new Set(
        existing.map((e) => `${e.year}-${e.name.trim().toLowerCase()}-${e.score.trim()}`)
      )

      let currentOrder = existing.length
      for (const item of staticResults) {
        const signature = `${item.year}-${item.name.trim().toLowerCase()}-${item.score.trim()}`
        if (existingIds.has(item.id) || existingSignatures.has(signature)) {
          report.results.skipped++
          continue
        }

        try {
          const doc = await createResultDoc(
            {
              year: item.year,
              name: item.name,
              score: item.score,
              exam: item.exam,
              photo: item.photo || undefined,
              order: currentOrder++,
              isPublished: true,
            },
            item.id
          )
          if (doc) {
            existingIds.add(item.id)
            existingSignatures.add(signature)
            report.results.created++
          } else {
            report.results.failed++
          }
        } catch {
          report.results.failed++
        }
      }
      await markCollectionInitialized(COLLECTIONS.RESULTS)
    }

    // 4. Synchronize Gallery
    if (!target || target === 'gallery') {
      const existing = await getAllGallery()
      const existingIds = new Set(existing.map((e) => e.id))
      const existingSignatures = new Set(
        existing.map((e) => `${e.type}-${e.category.trim().toLowerCase()}-${e.url.trim()}`)
      )

      let currentOrder = existing.length
      for (const item of staticGallery) {
        const signature = `${item.type}-${item.category.trim().toLowerCase()}-${item.url.trim()}`
        if (existingIds.has(item.id) || existingSignatures.has(signature)) {
          report.gallery.skipped++
          continue
        }

        try {
          const doc = await createGalleryDoc(
            {
              type: item.type,
              category: item.category,
              year: item.year || new Date().getFullYear(),
              title: item.title,
              url: item.url,
              thumbnail: item.thumbnail || item.url,
              order: currentOrder++,
              isPublished: true,
            },
            item.id
          )
          if (doc) {
            existingIds.add(item.id)
            existingSignatures.add(signature)
            report.gallery.created++
          } else {
            report.gallery.failed++
          }
        } catch {
          report.gallery.failed++
        }
      }
      await markCollectionInitialized(COLLECTIONS.GALLERY)
    }

    revalidatePath('/')
    revalidatePath('/faculty')
    revalidatePath('/results')
    revalidatePath('/gallery')

    const totalCreated =
      report.faculty.created +
      report.homeMedia.created +
      report.results.created +
      report.gallery.created
    const totalSkipped =
      report.faculty.skipped +
      report.homeMedia.skipped +
      report.results.skipped +
      report.gallery.skipped

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${totalCreated} created, ${totalSkipped} skipped (already present in Firestore).`,
      report,
    })
  } catch (err: any) {
    return safeErrorResponse('Admin Seed POST', err, 'Failed to synchronize static content')
  }
}
