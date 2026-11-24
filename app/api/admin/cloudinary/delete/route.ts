import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import {
  isAuthorizedProjectPublicId,
  deleteCloudinaryAsset,
  type CloudinaryResourceType,
} from '@/lib/cloudinary'
import { cloudinaryDeleteLimiter } from '@/lib/rate-limit'
import { verifyCsrfOrigin, checkPayloadSize } from '@/lib/security'

async function handleDelete(request: Request) {
  try {
    // 1. CSRF Verification
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden: Invalid request origin' }, { status: 403 })
    }

    // 2. Authenticate and authorize active administrator
    const authResult = await verifyAdminRequest(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // 3. Rate Limiting Protection (Max 20 deletions / min per admin UID)
    const rateLimit = cloudinaryDeleteLimiter.check(authResult.user.uid)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Deletion rate limit reached. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before retrying.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) },
        }
      )
    }

    // 4. Request size limit (10 KB max)
    if (!checkPayloadSize(request, 10240)) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      )
    }

    // 5. Parse and validate JSON payload
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Please provide publicId and optional resourceType.' },
        { status: 400 }
      )
    }

    const { publicId, resourceType } = body || {}

    if (!publicId || typeof publicId !== 'string' || !publicId.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: publicId' },
        { status: 400 }
      )
    }

    const trimmedPublicId = publicId.trim()

    // 6. Validate folder boundary: Strictly prevent arbitrary deletion outside project folders
    if (!isAuthorizedProjectPublicId(trimmedPublicId)) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Asset deletion is strictly restricted to authorized SHAHEEN project folders.',
        },
        { status: 403 }
      )
    }

    // Validate optional resourceType
    let validatedResourceType: CloudinaryResourceType | undefined = undefined
    if (resourceType) {
      if (resourceType !== 'image' && resourceType !== 'video') {
        return NextResponse.json(
          { error: `Invalid resourceType '${String(resourceType)}'. Must be 'image' or 'video'.` },
          { status: 400 }
        )
      }
      validatedResourceType = resourceType
    }

    // 7. Delete asset securely from Cloudinary
    const deleteResult = await deleteCloudinaryAsset(
      trimmedPublicId,
      validatedResourceType
    )

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: deleteResult.error || 'Failed to delete asset', result: deleteResult.result },
        { status: deleteResult.status || 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Asset deleted successfully from Cloudinary.',
        publicId: trimmedPublicId,
        result: deleteResult.result,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Cloudinary Delete] Error:', error?.message)
    return NextResponse.json(
      { error: 'Internal server error while deleting asset' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return handleDelete(request)
}

export async function DELETE(request: Request) {
  return handleDelete(request)
}
