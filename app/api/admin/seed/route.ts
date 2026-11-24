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

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { target } = await request.json().catch(() => ({}))
  const report: SyncReport = {
    faculty: { created: 0, updated: 0, skipped: 0, failed: 0 },
    homeMedia: { created: 0, updated: 0, skipped: 0, failed: 0 },
    results: { created: 0, updated: 0, skipped: 0, failed: 0 },
    gallery: { created: 0, updated: 0, skipped: 0, failed: 0 },
  }

  try {
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
              thumbnail: item.thumbnail,
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
        existing.map((e) => `${e.year}-${e.name.trim().toLowerCase()}-${e.exam.trim().toLowerCase()}`)
      )

      let currentOrder = existing.length
      for (const item of staticResults) {
        const signature = `${item.year}-${item.name.trim().toLowerCase()}-${item.exam.trim().toLowerCase()}`
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
        existing.map((e) => `${e.type}-${e.title.trim().toLowerCase()}-${e.url.trim().toLowerCase()}`)
      )

      let currentOrder = existing.length
      for (const item of staticGallery) {
        const signature = `${item.type}-${item.title.trim().toLowerCase()}-${item.url.trim().toLowerCase()}`
        if (existingIds.has(item.id) || existingSignatures.has(signature)) {
          report.gallery.skipped++
          continue
        }

        try {
          const doc = await createGalleryDoc(
            {
              type: item.type,
              category: item.category,
              year: item.year,
              title: item.title,
              url: item.url,
              thumbnail: item.thumbnail,
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

    // Purge cached pages so fresh data is visible immediately
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
    console.error('[Admin Seed] Synchronization error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to synchronize static content' },
      { status: 500 }
    )
  }
}
