import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

// ============================================================================
// 1. FOLDER CONSTANTS & POLICIES
// ============================================================================

export const ALLOWED_CLOUDINARY_FOLDERS = [
  'shaheen-mount-seena/home/posters',
  'shaheen-mount-seena/home/videos',
  'shaheen-mount-seena/gallery',
] as const

export type AllowedCloudinaryFolder = (typeof ALLOWED_CLOUDINARY_FOLDERS)[number]

export type CloudinaryResourceType = 'image' | 'video'

export interface FolderUploadPolicy {
  allowedResourceTypes: CloudinaryResourceType[]
  allowedFormats: string[]
  maxFileSize: number // in bytes
}

export const CLOUDINARY_POLICIES: Record<AllowedCloudinaryFolder, FolderUploadPolicy> = {
  'shaheen-mount-seena/home/posters': {
    allowedResourceTypes: ['image'],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  },
  'shaheen-mount-seena/home/videos': {
    allowedResourceTypes: ['video'],
    allowedFormats: ['mp4', 'webm', 'mov', 'mkv'],
    maxFileSize: 100 * 1024 * 1024, // 100 MB
  },
  'shaheen-mount-seena/gallery': {
    allowedResourceTypes: ['image', 'video'],
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov', 'mkv'],
    maxFileSize: 100 * 1024 * 1024, // 100 MB for video; images capped to 10 MB in generator
  },
}

// ============================================================================
// 2. CONFIGURATION & CLIENT INITIALIZATION
// ============================================================================

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  )
}

export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return null
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  return cloudinary
}

// ============================================================================
// 3. VALIDATION HELPERS
// ============================================================================

export function isAllowedFolder(folder: unknown): folder is AllowedCloudinaryFolder {
  if (typeof folder !== 'string') return false
  return (ALLOWED_CLOUDINARY_FOLDERS as readonly string[]).includes(folder)
}

export function validateUploadRequest(
  folder: unknown,
  resourceType: unknown = 'image'
):
  | {
      valid: true
      folder: AllowedCloudinaryFolder
      resourceType: CloudinaryResourceType
      policy: FolderUploadPolicy
    }
  | { valid: false; error: string } {
  if (!isAllowedFolder(folder)) {
    return {
      valid: false,
      error: `Invalid folder '${String(folder)}'. Uploads are strictly restricted to: ${ALLOWED_CLOUDINARY_FOLDERS.join(', ')}`,
    }
  }

  if (resourceType !== 'image' && resourceType !== 'video') {
    return {
      valid: false,
      error: `Invalid resource type '${String(resourceType)}'. Must be 'image' or 'video'.`,
    }
  }

  const policy = CLOUDINARY_POLICIES[folder]
  if (!policy.allowedResourceTypes.includes(resourceType)) {
    return {
      valid: false,
      error: `Resource type '${resourceType}' is not allowed in folder '${folder}'. Permitted: ${policy.allowedResourceTypes.join(', ')}`,
    }
  }

  return { valid: true, folder, resourceType, policy }
}

/**
 * Validates that a public ID strictly belongs to an authorized project folder.
 * Prevents arbitrary deletion outside the project's folder namespace and directory traversal.
 */
export function isAuthorizedProjectPublicId(publicId: unknown): publicId is string {
  if (typeof publicId !== 'string' || !publicId.trim()) {
    return false
  }

  const normalized = publicId.trim().replace(/\\/g, '/')

  // Reject directory traversal or abnormal paths
  if (
    normalized.includes('..') ||
    normalized.startsWith('/') ||
    normalized.startsWith('.') ||
    normalized.includes('//')
  ) {
    return false
  }

  // Must begin with one of the allowed folder paths followed by a slash and an asset name
  return ALLOWED_CLOUDINARY_FOLDERS.some((folder) => {
    return normalized.startsWith(`${folder}/`) && normalized.length > folder.length + 1
  })
}

// ============================================================================
// 4. SIGNED UPLOAD GENERATION
// ============================================================================

export interface SignedUploadResponse {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: AllowedCloudinaryFolder
  resourceType: CloudinaryResourceType
  uploadUrl: string
  maxFileSize: number
  allowedFormats: string[]
}

/**
 * Generates cryptographic signature and upload parameters for secure direct client uploads.
 * The secret never leaves the server; only the signature and public parameters are returned.
 */
export function generateUploadSignature(
  folder: AllowedCloudinaryFolder,
  resourceType: CloudinaryResourceType = 'image'
): { success: true; data: SignedUploadResponse } | { success: false; error: string; status: number } {
  const cloud = getCloudinaryClient()
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const apiKey = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME

  if (!cloud || !apiSecret || !apiKey || !cloudName) {
    return {
      success: false,
      error: 'Cloudinary server configuration is missing or incomplete.',
      status: 503,
    }
  }

  const timestamp = Math.floor(Date.now() / 1000)

  // Explicit parameters included in the cryptographic signature
  const paramsToSign = {
    folder,
    timestamp,
  }

  const signature = cloud.utils.api_sign_request(paramsToSign, apiSecret)
  const policy = CLOUDINARY_POLICIES[folder]
  const maxFileSize =
    resourceType === 'image' && policy.maxFileSize > 10 * 1024 * 1024
      ? 10 * 1024 * 1024
      : policy.maxFileSize

  const allowedFormats =
    resourceType === 'image'
      ? ['jpg', 'jpeg', 'png', 'webp']
      : ['mp4', 'webm', 'mov', 'mkv']

  return {
    success: true,
    data: {
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      maxFileSize,
      allowedFormats,
    },
  }
}

// ============================================================================
// 5. SECURE ASSET DELETION
// ============================================================================

export interface DeleteAssetResponse {
  success: boolean
  result?: string
  error?: string
  status?: number
}

/**
 * Deletes a Cloudinary asset by public_id after verifying that it resides within
 * an authorized project folder.
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType?: CloudinaryResourceType
): Promise<DeleteAssetResponse> {
  if (!isAuthorizedProjectPublicId(publicId)) {
    return {
      success: false,
      error: 'Forbidden: Asset deletion is restricted to authorized project folders only.',
      status: 403,
    }
  }

  const cloud = getCloudinaryClient()
  if (!cloud) {
    return {
      success: false,
      error: 'Cloudinary server configuration is missing or incomplete.',
      status: 503,
    }
  }

  // Infer resource type from folder if not explicitly provided
  let targetType: CloudinaryResourceType = resourceType || 'image'
  if (!resourceType) {
    if (publicId.startsWith('shaheen-mount-seena/home/videos/')) {
      targetType = 'video'
    } else if (publicId.startsWith('shaheen-mount-seena/home/posters/')) {
      targetType = 'image'
    }
  }

  try {
    let res = await cloud.uploader.destroy(publicId, {
      resource_type: targetType,
      invalidate: true,
    })

    // If 'not found' in gallery, try the alternate resource type (video vs image)
    if (res.result === 'not found' && publicId.startsWith('shaheen-mount-seena/gallery/')) {
      const alternateType: CloudinaryResourceType = targetType === 'image' ? 'video' : 'image'
      const altRes = await cloud.uploader.destroy(publicId, {
        resource_type: alternateType,
        invalidate: true,
      })
      if (altRes.result === 'ok') {
        res = altRes
        targetType = alternateType
      }
    }

    // If still 'not found' and publicId has a file extension, attempt without extension
    if (res.result === 'not found' && /\.[a-zA-Z0-9]+$/.test(publicId)) {
      const strippedId = publicId.replace(/\.[a-zA-Z0-9]+$/, '')
      const strippedRes = await cloud.uploader.destroy(strippedId, {
        resource_type: targetType,
        invalidate: true,
      })
      if (strippedRes.result === 'ok') {
        res = strippedRes
      }
    }

    if (res.result === 'ok') {
      return { success: true, result: 'ok' }
    }

    if (res.result === 'not found') {
      // The asset is confirmed absent from Cloudinary, satisfying the deletion requirement
      return { success: true, result: 'not found' }
    }

    return {
      success: false,
      result: res.result,
      error: `Cloudinary returned deletion result: ${res.result}`,
      status: 400,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to delete asset from Cloudinary.',
      status: 500,
    }
  }
}
