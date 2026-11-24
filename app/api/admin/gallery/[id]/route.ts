import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getGalleryById, updateGalleryDoc, deleteGalleryDoc } from '@/lib/firebase/firestore'
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
  const existing = await getGalleryById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const { type, category, year, title, caption, url, thumbnail, cloudinaryPublicId, isPublished, order } = body

  const updates: Record<string, any> = {}
  if (type !== undefined) {
    if (type !== 'photo' && type !== 'poster' && type !== 'video') {
      return NextResponse.json({ error: 'Type must be "photo", "poster", or "video"' }, { status: 400 })
    }
    updates.type = type
  }
  if (category !== undefined) updates.category = String(category).trim()
  if (year !== undefined) updates.year = Number(year)
  if (title !== undefined) updates.title = String(title).trim()
  if (caption !== undefined) updates.caption = caption ? String(caption).trim() : ''
  if (url !== undefined) updates.url = String(url).trim()
  if (thumbnail !== undefined) updates.thumbnail = thumbnail ? String(thumbnail).trim() : (updates.url || existing.url)
  if (cloudinaryPublicId !== undefined) updates.cloudinaryPublicId = cloudinaryPublicId ? String(cloudinaryPublicId).trim() : ''
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished)
  if (order !== undefined) updates.order = Number(order)

  if (
    cloudinaryPublicId &&
    existing.cloudinaryPublicId &&
    existing.cloudinaryPublicId !== cloudinaryPublicId
  ) {
    const resType = existing.type === 'video' ? 'video' : 'image'
    try {
      await deleteCloudinaryAsset(existing.cloudinaryPublicId, resType)
    } catch (err) {
      console.warn('[Cloudinary Cleanup] Failed to delete replaced gallery asset:', err)
    }
  }

  const success = await updateGalleryDoc(id, updates)
  if (!success) {
    return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 })
  }

  revalidatePath('/gallery')

  const updated = await getGalleryById(id)
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const existing = await getGalleryById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 })
    }

    let cloudinaryResult: string | undefined = undefined

    // 1. If an associated Cloudinary asset exists, delete it before deleting Firestore metadata
    if (existing.cloudinaryPublicId && existing.cloudinaryPublicId.trim()) {
      const publicId = existing.cloudinaryPublicId.trim()

      // 2. Validate that the asset belongs to authorized project folders
      if (!isAuthorizedProjectPublicId(publicId)) {
        console.error(`[Admin Gallery DELETE] Blocked unauthorized or invalid publicId: ${publicId}`)
        return NextResponse.json(
          {
            error:
              'Security restriction: The asset does not belong to an authorized project folder. Firestore record retained.',
          },
          { status: 403 }
        )
      }

      // 3. Call Cloudinary deletion API and await response
      const resType = existing.type === 'video' ? 'video' : 'image'
      const deleteResult = await deleteCloudinaryAsset(publicId, resType)

      // 4. Verify Cloudinary confirms deletion ('ok') or that the asset is already absent ('not found')
      if (!deleteResult.success) {
        console.error(`[Admin Gallery DELETE] Cloudinary deletion failed for ${publicId}:`, deleteResult.error)
        return NextResponse.json(
          {
            error: `Failed to delete media from Cloudinary: ${deleteResult.error || 'Unknown Cloudinary error'}. Database record retained.`,
            result: deleteResult.result,
          },
          { status: deleteResult.status || 502 }
        )
      }

      cloudinaryResult = deleteResult.result
    }

    // 5. Only after Cloudinary confirms deletion (or asset absent/not applicable), delete Firestore record
    const success = await deleteGalleryDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete gallery item from database' }, { status: 500 })
    }

    revalidatePath('/gallery')

    return NextResponse.json({
      success: true,
      message: 'Gallery item and associated media deleted successfully',
      cloudinaryResult,
    })
  } catch (err: any) {
    console.error('[Admin Gallery DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error while deleting gallery item' },
      { status: 500 }
    )
  }
}
