import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminFirestore } from './admin'

// ============================================================================
// 1. DATA MODELS & COLLECTION SCHEMAS
// ============================================================================

export interface AdminDoc {
  uid: string
  email: string
  displayName?: string
  role: 'superadmin' | 'admin'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface FacultyDoc {
  id: string
  name: string
  role: string
  previous?: string
  group: 'academic' | 'mentorship'
  photo?: string
  cloudinaryPublicId?: string
  order: number
  isPublished: boolean
  createdAt: string
  updatedAt?: string
}

export interface HomeMediaDoc {
  id: string
  type: 'video' | 'poster' | 'photo'
  mediaType?: 'image' | 'video'
  title: string
  caption?: string
  description?: string
  url: string
  mediaUrl?: string
  thumbnail: string
  thumbnailUrl?: string
  cloudinaryPublicId?: string
  thumbnailPublicId?: string
  ctaText?: string
  ctaLink?: string
  order: number
  displayOrder?: number
  isPublished: boolean
  createdAt: string
  updatedAt?: string
}

export interface ResultDoc {
  id: string
  year: number
  name: string
  score: string
  exam: string
  photo?: string
  cloudinaryPublicId?: string
  order: number
  isPublished: boolean
  createdAt: string
  updatedAt?: string
}

export interface GalleryDoc {
  id: string
  type: 'photo' | 'poster' | 'video'
  category: string
  year: number
  title: string
  caption?: string
  url: string
  thumbnail: string
  cloudinaryPublicId?: string
  order: number
  isPublished: boolean
  createdAt: string
  updatedAt?: string
}

export interface EnquiryDoc {
  id: string
  studentName: string
  parentName?: string
  phone: string
  email?: string
  programme?: string
  group?: string
  message?: string
  status: 'new' | 'contacted' | 'resolved' | 'archived'
  submittedAt: string
  notes?: string
}

export const COLLECTIONS = {
  ADMINS: 'admins',
  FACULTY: 'faculty',
  HOME_MEDIA: 'homeMedia',
  RESULTS: 'results',
  GALLERY: 'gallery',
  ENQUIRIES: 'enquiries',
} as const

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val
    }
  }
  return result
}

export function getCollection<T = any>(collectionName: string) {
  const db = getAdminFirestore()
  if (!db) return null
  return db.collection(collectionName)
}

export async function isCollectionInitialized(collectionName: string): Promise<boolean> {
  const db = getAdminFirestore()
  if (!db) return false

  try {
    const metaDoc = await db.collection('system').doc('contentState').get()
    if (metaDoc.exists) {
      const data = metaDoc.data()
      if (data && data[`${collectionName}Initialized`] === true) {
        return true
      }
    }

    const snap = await db.collection(collectionName).limit(1).get()
    return !snap.empty
  } catch (error) {
    console.error(`[Firestore] Failed to check initialization for ${collectionName}:`, error)
    return false
  }
}

export async function markCollectionInitialized(collectionName: string): Promise<boolean> {
  const db = getAdminFirestore()
  if (!db) return false

  try {
    await db.collection('system').doc('contentState').set(
      {
        [`${collectionName}Initialized`]: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
    return true
  } catch (error) {
    console.error(`[Firestore] Failed to mark collection ${collectionName} initialized:`, error)
    return false
  }
}

// ============================================================================
// 3. ADMINS
// ============================================================================

export async function getAdminByUid(uid: string): Promise<AdminDoc | null> {
  const collection = getCollection<AdminDoc>(COLLECTIONS.ADMINS)
  if (!collection) return null

  const snapshot = await collection.doc(uid).get()
  if (!snapshot.exists) return null

  return { uid: snapshot.id, ...snapshot.data() } as AdminDoc
}

export async function getAllAdmins(): Promise<AdminDoc[]> {
  const collection = getCollection<AdminDoc>(COLLECTIONS.ADMINS)
  if (!collection) return []

  const snapshot = await collection.get()
  return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }) as AdminDoc)
}

// ============================================================================
// 4. FACULTY MANAGEMENT
// ============================================================================

export type CreateFacultyInput = Omit<FacultyDoc, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateFacultyInput = Partial<Omit<FacultyDoc, 'id' | 'createdAt'>>

export async function getAllFaculty(): Promise<FacultyDoc[]> {
  const collection = getCollection<FacultyDoc>(COLLECTIONS.FACULTY)
  if (!collection) return []

  try {
    const snapshot = await collection.get()
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FacultyDoc)
    return docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch (error) {
    console.error('[Firestore] Failed to query all faculty:', error)
    return []
  }
}

export async function getPublishedFaculty(): Promise<FacultyDoc[]> {
  const collection = getCollection<FacultyDoc>(COLLECTIONS.FACULTY)
  if (!collection) return []

  try {
    const snapshot = await collection.where('isPublished', '==', true).get()
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FacultyDoc)
    return docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch (error) {
    console.error('[Firestore] Failed to query published faculty:', error)
    return []
  }
}

export async function getFacultyById(id: string): Promise<FacultyDoc | null> {
  const collection = getCollection<FacultyDoc>(COLLECTIONS.FACULTY)
  if (!collection) return null

  const doc = await collection.doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as FacultyDoc
}

export async function createFacultyDoc(
  input: CreateFacultyInput,
  customId?: string
): Promise<FacultyDoc | null> {
  const collection = getCollection<FacultyDoc>(COLLECTIONS.FACULTY)
  if (!collection) return null

  const now = new Date().toISOString()
  const docRef = customId ? collection.doc(customId) : collection.doc()
  const newDoc: FacultyDoc = {
    ...input,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(cleanUndefined(newDoc))
  return newDoc
}

export async function updateFacultyDoc(id: string, input: UpdateFacultyInput): Promise<boolean> {
  const collection = getCollection<FacultyDoc>(COLLECTIONS.FACULTY)
  if (!collection) return false

  await collection.doc(id).update(
    cleanUndefined({
      ...input,
      updatedAt: new Date().toISOString(),
    })
  )
  return true
}

export async function deleteFacultyDoc(id: string): Promise<boolean> {
  const collection = getCollection<FacultyDoc>(COLLECTIONS.FACULTY)
  if (!collection) return false

  await collection.doc(id).delete()
  return true
}

export async function reorderFacultyDocs(orderedIds: string[]): Promise<boolean> {
  const db = getAdminFirestore()
  if (!db) return false

  const batch = db.batch()
  const collection = db.collection(COLLECTIONS.FACULTY)

  orderedIds.forEach((id, index) => {
    batch.update(collection.doc(id), { order: index, updatedAt: new Date().toISOString() })
  })

  await batch.commit()
  return true
}

// ============================================================================
// 5. HOME MEDIA MANAGEMENT
// ============================================================================

export type CreateHomeMediaInput = Omit<HomeMediaDoc, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateHomeMediaInput = Partial<Omit<HomeMediaDoc, 'id' | 'createdAt'>>

export async function getAllHomeMedia(): Promise<HomeMediaDoc[]> {
  const collection = getCollection<HomeMediaDoc>(COLLECTIONS.HOME_MEDIA)
  if (!collection) return []

  try {
    const snapshot = await collection.get()
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as HomeMediaDoc)
    return docs.sort((a, b) => (a.order ?? a.displayOrder ?? 0) - (b.order ?? b.displayOrder ?? 0))
  } catch (error) {
    console.error('[Firestore] Failed to query all home media:', error)
    return []
  }
}

export async function getPublishedHomeMedia(): Promise<HomeMediaDoc[]> {
  const collection = getCollection<HomeMediaDoc>(COLLECTIONS.HOME_MEDIA)
  if (!collection) return []

  try {
    const snapshot = await collection.where('isPublished', '==', true).get()
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as HomeMediaDoc)
    return docs.sort((a, b) => (a.order ?? a.displayOrder ?? 0) - (b.order ?? b.displayOrder ?? 0))
  } catch (error) {
    console.error('[Firestore] Failed to query published home media:', error)
    return []
  }
}

export async function getHomeMediaById(id: string): Promise<HomeMediaDoc | null> {
  const collection = getCollection<HomeMediaDoc>(COLLECTIONS.HOME_MEDIA)
  if (!collection) return null

  const doc = await collection.doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as HomeMediaDoc
}

export async function createHomeMediaDoc(
  input: CreateHomeMediaInput,
  customId?: string
): Promise<HomeMediaDoc | null> {
  const collection = getCollection<HomeMediaDoc>(COLLECTIONS.HOME_MEDIA)
  if (!collection) return null

  const now = new Date().toISOString()
  const docRef = customId ? collection.doc(customId) : collection.doc()
  const newDoc: HomeMediaDoc = {
    ...input,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(cleanUndefined(newDoc))
  return newDoc
}

export async function updateHomeMediaDoc(id: string, input: UpdateHomeMediaInput): Promise<boolean> {
  const collection = getCollection<HomeMediaDoc>(COLLECTIONS.HOME_MEDIA)
  if (!collection) return false

  await collection.doc(id).update(
    cleanUndefined({
      ...input,
      updatedAt: new Date().toISOString(),
    })
  )
  return true
}

export async function deleteHomeMediaDoc(id: string): Promise<boolean> {
  const collection = getCollection<HomeMediaDoc>(COLLECTIONS.HOME_MEDIA)
  if (!collection) return false

  await collection.doc(id).delete()
  return true
}

export async function reorderHomeMediaDocs(orderedIds: string[]): Promise<boolean> {
  const db = getAdminFirestore()
  if (!db) return false

  const batch = db.batch()
  const collection = db.collection(COLLECTIONS.HOME_MEDIA)

  orderedIds.forEach((id, index) => {
    batch.update(collection.doc(id), {
      order: index,
      displayOrder: index,
      updatedAt: new Date().toISOString(),
    })
  })

  await batch.commit()
  return true
}

// ============================================================================
// 6. RESULTS MANAGEMENT
// ============================================================================

export type CreateResultInput = Omit<ResultDoc, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateResultInput = Partial<Omit<ResultDoc, 'id' | 'createdAt'>>

export async function getAllResults(): Promise<ResultDoc[]> {
  const collection = getCollection<ResultDoc>(COLLECTIONS.RESULTS)
  if (!collection) return []

  try {
    const snapshot = await collection.get()
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ResultDoc)
    return docs.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.order ?? 0) - (b.order ?? 0))
  } catch (error) {
    console.error('[Firestore] Failed to query all results:', error)
    return []
  }
}

export async function getPublishedResults(): Promise<ResultDoc[]> {
  const collection = getCollection<ResultDoc>(COLLECTIONS.RESULTS)
  if (!collection) return []

  try {
    const snapshot = await collection.where('isPublished', '==', true).get()
    const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ResultDoc)
    return docs.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.order ?? 0) - (b.order ?? 0))
  } catch (error) {
    console.error('[Firestore] Failed to query published results:', error)
    return []
  }
}

export async function getResultById(id: string): Promise<ResultDoc | null> {
  const collection = getCollection<ResultDoc>(COLLECTIONS.RESULTS)
  if (!collection) return null

  const doc = await collection.doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as ResultDoc
}

export async function createResultDoc(
  input: CreateResultInput,
  customId?: string
): Promise<ResultDoc | null> {
  const collection = getCollection<ResultDoc>(COLLECTIONS.RESULTS)
  if (!collection) return null

  const now = new Date().toISOString()
  const docRef = customId ? collection.doc(customId) : collection.doc()
  const newDoc: ResultDoc = {
    ...input,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(cleanUndefined(newDoc))
  return newDoc
}

export async function updateResultDoc(id: string, input: UpdateResultInput): Promise<boolean> {
  const collection = getCollection<ResultDoc>(COLLECTIONS.RESULTS)
  if (!collection) return false

  await collection.doc(id).update(
    cleanUndefined({
      ...input,
      updatedAt: new Date().toISOString(),
    })
  )
  return true
}

export async function deleteResultDoc(id: string): Promise<boolean> {
  const collection = getCollection<ResultDoc>(COLLECTIONS.RESULTS)
  if (!collection) return false

  await collection.doc(id).delete()
  return true
}

export async function reorderResultDocs(orderedIds: string[]): Promise<boolean> {
  const db = getAdminFirestore()
  if (!db) return false

  const batch = db.batch()
  const collection = db.collection(COLLECTIONS.RESULTS)

  orderedIds.forEach((id, index) => {
    batch.update(collection.doc(id), { order: index, updatedAt: new Date().toISOString() })
  })

  await batch.commit()
  return true
}

// ============================================================================
// 7. GALLERY MANAGEMENT
// ============================================================================

export type CreateGalleryInput = Omit<GalleryDoc, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateGalleryInput = Partial<Omit<GalleryDoc, 'id' | 'createdAt'>>

export async function getAllGallery(type?: 'photo' | 'poster' | 'video'): Promise<GalleryDoc[]> {
  const collection = getCollection<GalleryDoc>(COLLECTIONS.GALLERY)
  if (!collection) return []

  try {
    let query: FirebaseFirestore.Query = collection.orderBy('order', 'asc')
    if (type) {
      query = query.where('type', '==', type)
    }

    const snapshot = await query.get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as GalleryDoc)
  } catch (error) {
    console.error('[Firestore] Failed to query all gallery items:', error)
    return []
  }
}

export async function getPublishedGallery(filter?: {
  type?: 'photo' | 'poster' | 'video'
  category?: string
  year?: number
}): Promise<GalleryDoc[]> {
  const collection = getCollection<GalleryDoc>(COLLECTIONS.GALLERY)
  if (!collection) return []

  try {
    let query = collection.where('isPublished', '==', true)

    if (filter?.type) {
      query = query.where('type', '==', filter.type)
    }
    if (filter?.category && filter.category !== 'All') {
      query = query.where('category', '==', filter.category)
    }
    if (filter?.year) {
      query = query.where('year', '==', filter.year)
    }

    const snapshot = await query.get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as GalleryDoc)
    return items.sort((a, b) => a.order - b.order)
  } catch (error) {
    console.error('[Firestore] Failed to query published gallery items:', error)
    return []
  }
}

export async function getGalleryById(id: string): Promise<GalleryDoc | null> {
  const collection = getCollection<GalleryDoc>(COLLECTIONS.GALLERY)
  if (!collection) return null

  const doc = await collection.doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as GalleryDoc
}

export async function createGalleryDoc(
  input: CreateGalleryInput,
  customId?: string
): Promise<GalleryDoc | null> {
  const collection = getCollection<GalleryDoc>(COLLECTIONS.GALLERY)
  if (!collection) return null

  const now = new Date().toISOString()
  const docRef = customId ? collection.doc(customId) : collection.doc()
  const newDoc: GalleryDoc = {
    ...input,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(cleanUndefined(newDoc))
  return newDoc
}

export async function updateGalleryDoc(id: string, input: UpdateGalleryInput): Promise<boolean> {
  const collection = getCollection<GalleryDoc>(COLLECTIONS.GALLERY)
  if (!collection) return false

  await collection.doc(id).update(
    cleanUndefined({
      ...input,
      updatedAt: new Date().toISOString(),
    })
  )
  return true
}

export async function deleteGalleryDoc(id: string): Promise<boolean> {
  const collection = getCollection<GalleryDoc>(COLLECTIONS.GALLERY)
  if (!collection) return false

  await collection.doc(id).delete()
  return true
}

export async function reorderGalleryDocs(orderedIds: string[]): Promise<boolean> {
  const db = getAdminFirestore()
  if (!db) return false

  const batch = db.batch()
  const collection = db.collection(COLLECTIONS.GALLERY)

  orderedIds.forEach((id, index) => {
    batch.update(collection.doc(id), { order: index, updatedAt: new Date().toISOString() })
  })

  await batch.commit()
  return true
}

// ============================================================================
// 8. ENQUIRIES MANAGEMENT
// ============================================================================

export type CreateEnquiryInput = Omit<EnquiryDoc, 'id' | 'status' | 'submittedAt'>

export async function createEnquiryDoc(input: CreateEnquiryInput): Promise<string | null> {
  const collection = getCollection<EnquiryDoc>(COLLECTIONS.ENQUIRIES)
  if (!collection) return null

  const newEnquiry = cleanUndefined({
    ...input,
    status: 'new' as const,
    submittedAt: new Date().toISOString(),
    createdAtServer: FieldValue.serverTimestamp(),
  })

  const docRef = await collection.add(newEnquiry)
  return docRef.id
}

export async function getEnquiries(options?: {
  status?: EnquiryDoc['status']
  limitCount?: number
}): Promise<EnquiryDoc[]> {
  const collection = getCollection<EnquiryDoc>(COLLECTIONS.ENQUIRIES)
  if (!collection) return []

  try {
    let query: FirebaseFirestore.Query = collection.orderBy('submittedAt', 'desc')

    if (options?.status) {
      query = query.where('status', '==', options.status)
    }
    if (options?.limitCount) {
      query = query.limit(options.limitCount)
    }

    const snapshot = await query.get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as EnquiryDoc)
  } catch (error) {
    console.error('[Firestore] Failed to query enquiries:', error)
    return []
  }
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryDoc['status'],
  notes?: string
): Promise<boolean> {
  const collection = getCollection<EnquiryDoc>(COLLECTIONS.ENQUIRIES)
  if (!collection) return false

  const updates: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  }
  if (notes !== undefined) {
    updates.notes = notes
  }

  await collection.doc(id).update(updates)
  return true
}
