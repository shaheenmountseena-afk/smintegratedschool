/**
 * Client- and server-safe media URL helpers for Campus Film & Media.
 */

export function isCloudinaryUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'res.cloudinary.com' || parsed.hostname.endsWith('.cloudinary.com')
  } catch {
    return false
  }
}

/**
 * Injects Cloudinary automatic format/quality optimization transformations (`f_auto,q_auto`)
 * when an uploaded Cloudinary URL does not already specify delivery transformations.
 */
export function optimizeCloudinaryUrl(
  rawUrl: string,
  options: { resourceType?: 'image' | 'video'; width?: number } = {}
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  const trimmed = rawUrl.trim()
  if (!isCloudinaryUrl(trimmed)) return trimmed

  const { resourceType = 'image', width } = options
  const uploadMarker = `/${resourceType}/upload/`
  const markerIndex = trimmed.indexOf(uploadMarker)
  if (markerIndex === -1) return trimmed

  const prefix = trimmed.slice(0, markerIndex + uploadMarker.length)
  const rest = trimmed.slice(markerIndex + uploadMarker.length)
  if (!rest) return trimmed

  // If the segment directly after /upload/ already contains transformations (not v123... and not shaheen-mount-seena/...), leave as-is.
  const firstSegment = rest.split('/')[0] || ''
  const looksLikeVersionOrFolder =
    /^v\d+$/.test(firstSegment) || firstSegment === 'shaheen-mount-seena'
  if (!looksLikeVersionOrFolder) {
    return trimmed
  }

  const transforms =
    resourceType === 'image' && width
      ? `f_auto,q_auto,w_${width},c_limit`
      : 'f_auto,q_auto'

  return `${prefix}${transforms}/${rest}`
}

/**
 * Generates an image poster URL from a Cloudinary video URL when no custom thumbnail is supplied.
 */
export function getDefaultVideoThumbnail(rawUrl: string): string {
  if (!rawUrl) return ''
  const trimmed = rawUrl.trim()
  if (isCloudinaryUrl(trimmed) && trimmed.includes('/video/upload/')) {
    return trimmed
      .replace('/video/upload/', '/video/upload/so_1,f_jpg,q_auto/')
      .replace(/\.[^/.?#]+([?#].*)?$/, '.jpg')
  }
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
  }
  return ''
}

export function getVideoEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  const trimmed = rawUrl.trim()
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
  }
  return trimmed
}

export function isDirectVideoUrl(rawUrl: string): boolean {
  if (!rawUrl) return false
  const clean = rawUrl.split('?')[0].toLowerCase()
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.mkv')
  ) {
    return true
  }
  return isCloudinaryUrl(rawUrl) && rawUrl.includes('/video/upload/')
}
