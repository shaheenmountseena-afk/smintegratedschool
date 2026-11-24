import { NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/firebase/auth-server'
import {
  validateUploadRequest,
  generateUploadSignature,
} from '@/lib/cloudinary'
import { cloudinarySignLimiter } from '@/lib/rate-limit'
import { verifyCsrfOrigin, checkPayloadSize } from '@/lib/security'

export async function POST(request: Request) {
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

    // 3. Rate Limiting Protection (Max 30 signatures / min per admin UID)
    const rateLimit = cloudinarySignLimiter.check(authResult.user.uid)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Upload rate limit exceeded. Please wait ${rateLimit.retryAfterSeconds || 60} seconds before requesting more upload slots.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) },
        }
      )
    }

    // 4. Request size limit (10 KB max for metadata)
    if (!checkPayloadSize(request, 10240)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    // 5. Parse and validate JSON payload
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

    // 6. Validate folder restrictions and resource type policies
    const validation = validateUploadRequest(folder.trim(), resourceType)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 7. Generate cryptographic upload signature (Secret never touches client)
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

    // 8. Return secure signed parameters
    return NextResponse.json(
      {
        success: true,
        data: signatureResult.data,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Cloudinary Sign POST] Error:', error?.message)
    return NextResponse.json(
      { error: 'Internal server error while generating upload signature' },
      { status: 500 }
    )
  }
}
