'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { MediaItem } from '@/data/homeMedia'
import { Lightbox } from './lightbox'
import { VideoModal, VideoThumb, type Video } from './video-modal'

export function AdmissionsMedia({ items }: { items: MediaItem[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [video, setVideo] = useState<Video | null>(null)

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted px-6 py-16 text-center text-muted-foreground">
        Admission posters and videos will be published here soon.
      </p>
    )
  }

  const featured = items.find((i) => i.type === 'video')
  const posters = items.filter((i) => i.type === 'poster')
  const images = posters.map((p) => ({ src: p.url, title: p.title }))

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {featured && (
        <div className="lg:col-span-3">
          <VideoThumb
            video={featured}
            onPlay={() => setVideo(featured)}
            className="aspect-video lg:aspect-auto lg:h-full lg:min-h-[420px]"
            sizes="(min-width: 1024px) 60vw, 100vw"
          />
        </div>
      )}
      {posters.length > 0 && (
        <ul className={`grid grid-cols-2 gap-6 ${featured ? 'lg:col-span-2' : 'lg:col-span-5 lg:grid-cols-4'}`}>
          {posters.map((poster, i) => (
            <li key={poster.id}>
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="group block w-full text-left"
                aria-label={`View poster: ${poster.title}`}
              >
                <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={poster.thumbnail}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="mt-3 block text-sm leading-snug font-medium text-secondary">{poster.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox images={images} index={lightbox} onClose={() => setLightbox(null)} onChange={setLightbox} />
      <VideoModal video={video} onClose={() => setVideo(null)} />
    </div>
  )
}
