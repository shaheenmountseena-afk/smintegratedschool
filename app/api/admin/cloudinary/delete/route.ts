import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import {
  isAuthorizedProjectPublicId,
  deleteCloudinaryAsset,
  type CloudinaryResourceType,
} from '@/lib/cloudinary'

async function handleDelete(request: Request) {
  try {
    // 1. Authenticate and authorize active administrator
    const authResult = await verifyAdminRequest(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // 2. Abuse Protection: Request size limit (10 KB max)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > 10240) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      )
    }

    // 3. Parse and validate JSON payload
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

    // 4. Validate folder boundary: Prevent arbitrary deletion outside project folders
    if (!isAuthorizedProjectPublicId(trimmedPublicId)) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Asset deletion is strictly restricted to authorized SHAHEEN project folders (home/posters, home/videos, gallery).',
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

    // 5. Delete asset securely from Cloudinary
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
    return NextResponse.json(
      { error: error?.message || 'Internal server error while deleting asset' },
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
