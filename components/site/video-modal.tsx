'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'
import { Modal } from './modal'

export type Video = { title: string; url: string; thumbnail: string }

function getEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  const trimmed = rawUrl.trim()
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
  }
  return trimmed
}

function isDirectVideo(rawUrl: string): boolean {
  if (!rawUrl) return false
  const clean = rawUrl.split('?')[0].toLowerCase()
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.ogg')
}

export function VideoModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  const isDirect = video?.url ? isDirectVideo(video.url) : false
  const embedUrl = video?.url ? getEmbedUrl(video.url) : ''

  return (
    <Modal open={!!video} onClose={onClose} label={video ? `Video: ${video.title}` : 'Video player'}>
      {video && (
        <div className="w-full max-w-5xl">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
            {video.url ? (
              isDirect ? (
                <video
                  src={video.url}
                  title={video.title}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 size-full object-contain"
                />
              ) : (
                <iframe
                  src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 size-full"
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/80">
                Video will be added soon.
              </div>
            )}
          </div>
          <p className="mt-5 text-sm text-white/80">{video.title}</p>
        </div>
      )}
    </Modal>
  )
}

export function VideoThumb({
  video,
  onPlay,
  className,
  sizes = '(min-width: 1024px) 33vw, 100vw',
}: {
  video: Video
  onPlay: () => void
  className?: string
  sizes?: string
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className={`group relative block w-full overflow-hidden rounded-2xl bg-muted text-left ${className ?? 'aspect-video'}`}
    >
      <Image
        src={video.thumbnail}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/10 to-transparent" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg transition-transform group-hover:scale-105">
          <Play className="ml-1 size-6 fill-current" aria-hidden="true" />
        </span>
      </span>
      <span className="absolute inset-x-0 bottom-0 p-5 text-sm font-medium text-white">
        <span className="sr-only">Play video: </span>
        {video.title}
      </span>
    </button>
  )
}
