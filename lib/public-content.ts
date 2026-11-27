import 'server-only'
import {
  getPublishedFaculty,
  getPublishedHomeMedia,
  getPublishedResults,
  getPublishedGallery,
  isCollectionInitialized,
  COLLECTIONS,
} from '@/lib/firebase/firestore'
import { faculty as staticFaculty, type FacultyMember } from '@/data/faculty'
import { admissionsMedia as staticHomeMedia, type MediaItem } from '@/data/homeMedia'
import { results as staticResults, type ResultItem } from '@/data/results'
import { gallery as staticGallery, type GalleryItem } from '@/data/gallery'

/**
 * PUBLIC CONTENT ACCESS LAYER & FALLBACK POLICY
 *
 * 1. Primary Source of Truth:
 *    Cloud Firestore is the authoritative primary source of truth for all public website content.
 *
 * 2. Real-Time Admin Reflections:
 *    - When an item is marked isPublished = false (hidden), it is filtered out and NEVER appears publicly.
 *    - When an item is deleted from Firestore, it disappears from the public website immediately.
 *    - When an item is updated or newly published, it appears on the public website immediately.
 *
 * 3. Fallback Policy:
 *    Static TypeScript data arrays (from data/faculty.ts, data/homeMedia.ts, etc.) are used ONLY when:
 *    a) Firebase Admin SDK is unconfigured (e.g. missing server environment variables in local dev).
 *    b) Firestore connectivity fails (e.g. transient network outage / service disruption).
 *    c) The collection has never been initialized or seeded in Firestore (0 records exist and collection is uninitialized).
 *
 * 4. Zero Duplication Rule:
 *    Static data and Firestore data are NEVER merged or combined. Firestore records are the sole source
 *    once the database is active.
 */

/**
 * Returns active published faculty members.
 */
export async function getPublicFaculty(): Promise<FacultyMember[]> {
  try {
    const docs = await getPublishedFaculty()
    if (docs && docs.length > 0) {
      return docs.map((d) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        previous: d.previous,
        group: d.group,
        photo: d.photo,
      }))
    }

    // Check if Firestore collection is initialized and actively managed
    const isInit = await isCollectionInitialized(COLLECTIONS.FACULTY)
    if (isInit) {
      // Intentionally empty or all unpublished by admin - do not resurrect static data
      return []
    }
  } catch (err) {
    console.warn('[PublicContent] Error loading faculty from Firestore, using fallback:', err)
  }
  return staticFaculty
}

/**
 * Returns active published homepage media (posters, promotional videos, and campus photographs).
 */
export async function getPublicHomeMedia(): Promise<MediaItem[]> {
  try {
    const docs = await getPublishedHomeMedia()
    if (docs && docs.length > 0) {
      return docs.map((d) => {
        const mediaUrl = d.url || d.mediaUrl || ''
        const resolvedType = d.type || (d.mediaType === 'video' ? 'video' : 'poster')
        const resolvedMediaType = d.mediaType || (resolvedType === 'video' ? 'video' : 'image')
        return {
          id: d.id,
          type: resolvedType,
          mediaType: resolvedMediaType,
          title: d.title,
          description: d.description || d.caption || undefined,
          url: mediaUrl,
          thumbnail: d.thumbnail || d.thumbnailUrl || mediaUrl,
          ctaText: d.ctaText || undefined,
          ctaLink: d.ctaLink || undefined,
          order: d.order ?? d.displayOrder ?? 0,
        }
      })
    }

    const isInit = await isCollectionInitialized(COLLECTIONS.HOME_MEDIA)
    if (isInit) {
      return []
    }
  } catch (err) {
    console.warn('[PublicContent] Error loading home media from Firestore, using fallback:', err)
  }
  return staticHomeMedia
}

/**
 * Returns active published student exam results.
 */
export async function getPublicResults(): Promise<ResultItem[]> {
  try {
    const docs = await getPublishedResults()
    if (docs && docs.length > 0) {
      return docs.map((d) => ({
        id: d.id,
        year: d.year,
        name: d.name,
        score: d.score,
        exam: d.exam,
        photo: d.photo,
      }))
    }

    const isInit = await isCollectionInitialized(COLLECTIONS.RESULTS)
    if (isInit) {
      return []
    }
  } catch (err) {
    console.warn('[PublicContent] Error loading results from Firestore, using fallback:', err)
  }
  return staticResults
}

/**
 * Returns active published gallery items with optional filters.
 */
export async function getPublicGallery(filter?: {
  type?: 'photo' | 'poster' | 'video'
  category?: string
  year?: number
}): Promise<GalleryItem[]> {
  try {
    const docs = await getPublishedGallery(filter)
    if (docs && docs.length > 0) {
      return docs.map((d) => ({
        id: d.id,
        type: d.type,
        category: d.category,
        year: d.year,
        title: d.title,
        url: d.url,
        thumbnail: d.thumbnail,
      }))
    }

    const isInit = await isCollectionInitialized(COLLECTIONS.GALLERY)
    if (isInit) {
      return []
    }
  } catch (err) {
    console.warn('[PublicContent] Error loading gallery from Firestore, using fallback:', err)
  }

  let items = staticGallery
  if (filter?.type) {
    items = items.filter((i) => i.type === filter.type)
  }
  if (filter?.category && filter.category !== 'All') {
    items = items.filter((i) => i.category === filter.category)
  }
  if (filter?.year) {
    items = items.filter((i) => i.year === filter.year)
  }
  return items
}
