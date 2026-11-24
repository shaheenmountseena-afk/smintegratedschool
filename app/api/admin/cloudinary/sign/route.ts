import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import {
  validateUploadRequest,
  generateUploadSignature,
} from '@/lib/cloudinary'

export async function POST(request: Request) {
  try {
    // 1. Authenticate and authorize active administrator
    const authResult = await verifyAdminRequest(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // 2. Abuse Protection: Request size limit (10 KB max for metadata)
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
        { error: 'Invalid JSON body. Please provide folder and optional resourceType.' },
        { status: 400 }
      )
    }

    const { folder, resourceType = 'image' } = body || {}

    if (!folder || typeof folder !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: folder' },
        { status: 400 }
      )
    }

    // 4. Validate folder restrictions and resource type policies
    const validation = validateUploadRequest(folder.trim(), resourceType)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 5. Generate cryptographic upload signature
    const signatureResult = generateUploadSignature(
      validation.folder,
      validation.resourceType
    )

    if (!signatureResult.success) {
      return NextResponse.json(
        { error: signatureResult.error },
        { status: signatureResult.status }
      )
    }

    // 6. Return secure signed parameters (Secret is NEVER included)
    return NextResponse.json(
      {
        success: true,
        data: signatureResult.data,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error while generating upload signature' },
      { status: 500 }
    )
  }
}
