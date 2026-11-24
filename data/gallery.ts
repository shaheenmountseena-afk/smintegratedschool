/**
 * Admin-managed: gallery items (photos, posters and videos).
 * TODO: replace with an API call once the admin panel is ready.
 * All images below are dummy placeholders.
 */

export type GalleryItem = {
  id: string
  type: 'photo' | 'poster' | 'video'
  category: string
  year: number
  title: string
  /** Photos/posters: full-size image. Videos: YouTube embed URL. */
  url: string
  thumbnail: string
}

export const gallery: GalleryItem[] = [

]