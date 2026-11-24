'use client'

import type { AllowedCloudinaryFolder, CloudinaryResourceType } from '@/lib/cloudinary'

export interface UploadResult {
  url: string
  secureUrl: string
  publicId: string
  thumbnailUrl: string
  resourceType: string
  format: string
  bytes: number
  width?: number
  height?: number
}

/**
 * Uploads a file directly to Cloudinary using a secure server-generated signature.
 * The Cloudinary API secret NEVER touches the browser.
 */
export async function uploadToCloudinary(
  file: File,
  folder: AllowedCloudinaryFolder,
  resourceType: CloudinaryResourceType = 'image',
  idToken?: string
): Promise<UploadResult> {
  // 1. Request signed parameters from our protected Next.js API
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`
  }

  const signResponse = await fetch('/api/admin/cloudinary/sign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ folder, resourceType }),
  })

  if (!signResponse.ok) {
    const errorData = await signResponse.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to generate upload signature (${signResponse.status})`)
  }

  const { data: signData } = await signResponse.json()

  // 2. Validate file size and format against server policy
  if (file.size > signData.maxFileSize) {
    const maxMb = Math.round(signData.maxFileSize / (1024 * 1024))
    throw new Error(`File is too large. Maximum permitted size is ${maxMb}MB.`)
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && !signData.allowedFormats.includes(extension)) {
    throw new Error(`File format .${extension} is not supported. Allowed formats: ${signData.allowedFormats.join(', ')}`)
  }

  // 3. Perform direct signed upload to Cloudinary
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signData.apiKey)
  formData.append('timestamp', String(signData.timestamp))
  formData.append('signature', signData.signature)
  formData.append('folder', signData.folder)

  const uploadResponse = await fetch(signData.uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `Cloudinary upload failed (${uploadResponse.status})`)
  }

  const result = await uploadResponse.json()

  // Generate thumbnail URL for video or image
  let thumbnailUrl = result.secure_url
  if (result.resource_type === 'video') {
    // Cloudinary auto-generates video frame poster by replacing extension with .jpg
    thumbnailUrl = result.secure_url.replace(/\.[^/.]+$/, '.jpg')
  }

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    thumbnailUrl,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  }
}

/**
 * Deletes a Cloudinary asset via the protected Next.js deletion endpoint.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType?: CloudinaryResourceType,
  idToken?: string
): Promise<boolean> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`
  }

  const res = await fetch('/api/admin/cloudinary/delete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ publicId, resourceType }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to delete Cloudinary asset (${res.status})`)
  }

  return true
}
