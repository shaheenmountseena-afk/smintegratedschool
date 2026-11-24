import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getHomeMediaById, updateHomeMediaDoc, deleteHomeMediaDoc } from '@/lib/firebase/firestore'
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
  const existing = await getHomeMediaById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Home media item not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const { type, title, caption, url, thumbnail, cloudinaryPublicId, isPublished, order } = body

  const updates: Record<string, any> = {}
  if (type !== undefined) {
    if (type !== 'video' && type !== 'poster') {
      return NextResponse.json({ error: 'Type must be "video" or "poster"' }, { status: 400 })
    }
    updates.type = type
  }
  if (title !== undefined) updates.title = String(title).trim()
  if (caption !== undefined) updates.caption = caption ? String(caption).trim() : ''
  if (url !== undefined) updates.url = String(url).trim()
  if (thumbnail !== undefined) updates.thumbnail = thumbnail ? String(thumbnail).trim() : (updates.url || existing.url)
  if (cloudinaryPublicId !== undefined) updates.cloudinaryPublicId = cloudinaryPublicId ? String(cloudinaryPublicId).trim() : ''
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished)
  if (order !== undefined) updates.order = Number(order)

  // If replacing existing Cloudinary asset
  if (
    cloudinaryPublicId &&
    existing.cloudinaryPublicId &&
    existing.cloudinaryPublicId !== cloudinaryPublicId
  ) {
    const resType = existing.type === 'video' ? 'video' : 'image'
    deleteCloudinaryAsset(existing.cloudinaryPublicId, resType).catch((err) =>
      console.warn('[Cloudinary Cleanup] Failed to delete replaced media asset:', err)
    )
  }

  const success = await updateHomeMediaDoc(id, updates)
  if (!success) {
    return NextResponse.json({ error: 'Failed to update home media item' }, { status: 500 })
  }

  revalidatePath('/')

  const updated = await getHomeMediaById(id)
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
    const existing = await getHomeMediaById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Home media item not found' }, { status: 404 })
    }

    let cloudinaryResult: string | undefined = undefined

    // 1. If an associated Cloudinary asset exists, delete it before deleting Firestore metadata
    if (existing.cloudinaryPublicId && existing.cloudinaryPublicId.trim()) {
      const publicId = existing.cloudinaryPublicId.trim()

      if (!isAuthorizedProjectPublicId(publicId)) {
        console.error(`[Admin HomeMedia DELETE] Blocked unauthorized publicId: ${publicId}`)
        return NextResponse.json(
          {
            error:
              'Security restriction: The asset does not belong to an authorized project folder. Firestore record retained.',
          },
          { status: 403 }
        )
      }

      const resType = existing.type === 'video' ? 'video' : 'image'
      const deleteResult = await deleteCloudinaryAsset(publicId, resType)

      if (!deleteResult.success) {
        console.error(`[Admin HomeMedia DELETE] Cloudinary deletion failed for ${publicId}:`, deleteResult.error)
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

    // 2. Only after Cloudinary confirms deletion or asset is already absent, delete Firestore document
    const success = await deleteHomeMediaDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete home media item from database' }, { status: 500 })
    }

    revalidatePath('/')

    return NextResponse.json({
      success: true,
      message: 'Home media item and associated media deleted successfully',
      cloudinaryResult,
    })
  } catch (err: any) {
    console.error('[Admin HomeMedia DELETE] Unexpected error:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error while deleting home media item' },
      { status: 500 }
    )
  }
}
