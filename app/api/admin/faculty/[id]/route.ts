import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import { getFacultyById, updateFacultyDoc, deleteFacultyDoc } from '@/lib/firebase/firestore'
import { deleteCloudinaryAsset, isAuthorizedProjectPublicId } from '@/lib/cloudinary'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    const existing = await getFacultyById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { name, role, group, previous, photo, cloudinaryPublicId, isPublished, order } = body

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = String(name).trim()
    if (role !== undefined) updates.role = String(role).trim()
    if (group !== undefined) {
      if (group !== 'academic' && group !== 'mentorship') {
        return NextResponse.json({ error: 'Group must be "academic" or "mentorship"' }, { status: 400 })
      }
      updates.group = group
    }
    if (previous !== undefined) updates.previous = previous ? String(previous).trim() : ''
    if (photo !== undefined) updates.photo = photo ? String(photo).trim() : ''
    if (cloudinaryPublicId !== undefined) updates.cloudinaryPublicId = cloudinaryPublicId ? String(cloudinaryPublicId).trim() : ''
    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished)
    if (order !== undefined) updates.order = Number(order)

    // If replacing an existing Cloudinary image, clean up the old one
    if (
      cloudinaryPublicId &&
      existing.cloudinaryPublicId &&
      existing.cloudinaryPublicId !== cloudinaryPublicId
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
    console.error('[Admin Faculty PUT] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Failed to update faculty member' },
      { status: 500 }
    )
  }
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
    const existing = await getFacultyById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 })
    }

    // Cleanup Cloudinary photo if present
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

    const success = await deleteFacultyDoc(id)
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete faculty member' }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/faculty')

    return NextResponse.json({ success: true, message: 'Faculty member deleted successfully' })
  } catch (err: any) {
    console.error('[Admin Faculty DELETE] Error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete faculty member' },
      { status: 500 }
    )
  }
}
