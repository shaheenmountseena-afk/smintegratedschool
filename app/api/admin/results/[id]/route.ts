import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getResultById, updateResultDoc, deleteResultDoc } from '@/lib/firebase/firestore'
import { deleteCloudinaryAsset, isAuthorizedProjectPublicId } from '@/lib/cloudinary'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const existing = await getResultById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Result entry not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const { year, name, score, exam, photo, cloudinaryPublicId, isPublished, order } = body

  const updates: Record<string, any> = {}
  if (year !== undefined) updates.year = Number(year)
  if (name !== undefined) updates.name = String(name).trim()
  if (score !== undefined) updates.score = String(score).trim()
  if (exam !== undefined) updates.exam = String(exam).trim()
  if (photo !== undefined) updates.photo = photo ? String(photo).trim() : ''
  if (cloudinaryPublicId !== undefined) updates.cloudinaryPublicId = cloudinaryPublicId ? String(cloudinaryPublicId).trim() : ''
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished)
  if (order !== undefined) updates.order = Number(order)

  if (
    cloudinaryPublicId &&
    existing.cloudinaryPublicId &&
    existing.cloudinaryPublicId !== cloudinaryPublicId
  ) {
    deleteCloudinaryAsset(existing.cloudinaryPublicId, 'image').catch((err) =>
      console.warn('[Cloudinary Cleanup] Failed to delete replaced result photo:', err)
    )
  }

  const success = await updateResultDoc(id, updates)
  if (!success) {
    return NextResponse.json({ error: 'Failed to update result entry' }, { status: 500 })
  }

  revalidatePath('/results')
  revalidatePath('/gallery')

  const updated = await getResultById(id)
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const existing = await getResultById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Result entry not found' }, { status: 404 })
  }

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

  const success = await deleteResultDoc(id)
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete result entry' }, { status: 500 })
  }

  revalidatePath('/results')
  revalidatePath('/gallery')

  return NextResponse.json({ success: true, message: 'Result entry deleted successfully' })
}
