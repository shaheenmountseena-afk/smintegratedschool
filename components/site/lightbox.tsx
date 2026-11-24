'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from './modal'

export type LightboxImage = { src: string; title: string }

export function Lightbox({
  images,
  index,
  onClose,
  onChange,
}: {
  images: LightboxImage[]
  index: number | null
  onClose: () => void
  onChange: (index: number) => void
}) {
  const open = index !== null && images.length > 0
  const current = open ? images[index] : null

  useEffect(() => {
    if (!open || index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onChange((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onChange((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, images.length, onChange])

  return (
    <Modal open={open} onClose={onClose} label={current ? `Image: ${current.title}` : 'Image viewer'}>
      {current && index !== null && (
        <figure className="flex w-full max-w-5xl flex-col items-center">
          <div className="relative aspect-[4/3] w-full max-h-[75vh] overflow-hidden rounded-2xl bg-black/20">
            <Image src={current.src} alt={current.title} fill sizes="90vw" className="object-contain" />
          </div>
          <figcaption className="mt-5 flex w-full items-center justify-between gap-4 text-sm text-white/80">
            <span>{current.title}</span>
            {images.length > 1 && (
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-white/50">
                  {index + 1} / {images.length}
                </span>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => onChange((index - 1 + images.length) % images.length)}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => onChange((index + 1) % images.length)}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </span>
            )}
          </figcaption>
        </figure>
      )}
    </Modal>
  )
}
