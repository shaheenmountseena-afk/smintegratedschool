'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import type { GalleryItem } from '@/data/gallery'
import type { ResultItem } from '@/data/results'
import { cn } from '@/lib/utils'
import { initials } from './faculty-card'
import { Lightbox } from './lightbox'
import { ResultsList } from './results-list'
import { Tabs } from './tabs'
import { VideoModal, VideoThumb, type Video } from './video-modal'

const aspects = ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]']

export function GalleryView({ items, results }: { items: GalleryItem[]; results: ResultItem[] }) {
  return (
    <Tabs
      label="Gallery sections"
      tabs={[
        { id: 'photos', label: 'Photo Gallery', content: <Photos items={items.filter((i) => i.type === 'photo')} /> },
        {
          id: 'media',
          label: 'Posters & Videos',
          content: (
            <PostersVideos
              posters={items.filter((i) => i.type === 'poster')}
              videos={items.filter((i) => i.type === 'video')}
            />
          ),
        },
        { id: 'results', label: 'Results', content: <ResultsList results={results} /> },
      ]}
    />
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string | number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 rounded-full border px-4 text-sm transition-colors',
        active
          ? 'border-secondary bg-secondary text-white'
          : 'border-border text-muted-foreground hover:border-secondary/40 hover:text-secondary',
      )}
    >
      {children}
    </button>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-muted px-6 py-20 text-center text-muted-foreground">
      {children}
    </p>
  )
}

function Photos({ items }: { items: GalleryItem[] }) {
  const [category, setCategory] = useState('All')
  const [year, setYear] = useState<number | 'All'>('All')
  const [lightbox, setLightbox] = useState<number | null>(null)

  const categories = useMemo(() => ['All', ...new Set(items.map((i) => i.category))], [items])
  const years = useMemo(() => [...new Set(items.map((i) => i.year))].sort((a, b) => b - a), [items])
  const filtered = items.filter(
    (i) => (category === 'All' || i.category === category) && (year === 'All' || i.year === year),
  )

  return (
    <div>
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Filter by year" className="flex flex-wrap gap-2">
          <Chip active={year === 'All'} onClick={() => setYear('All')}>
            All years
          </Chip>
          {years.map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>
              {y}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty>No photos match these filters yet.</Empty>
      ) : (
        <ul className="columns-2 gap-4 md:columns-3 md:gap-6 [&>li]:mb-4 md:[&>li]:mb-6">
          {filtered.map((item, i) => (
            <li key={item.id} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="group block w-full text-left"
                aria-label={`Open photo: ${item.title}`}
              >
                <span className={cn('relative block overflow-hidden rounded-2xl bg-muted', aspects[i % aspects.length])}>
                  <Image
                    src={item.thumbnail}
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-secondary">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.year}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        images={filtered.map((f) => ({ src: f.url, title: f.title }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onChange={setLightbox}
      />
    </div>
  )
}

function PostersVideos({ posters, videos }: { posters: GalleryItem[]; videos: GalleryItem[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [video, setVideo] = useState<Video | null>(null)

  if (posters.length === 0 && videos.length === 0) return <Empty>Posters and videos will be added soon.</Empty>

  return (
    <div className="flex flex-col gap-16">
      {videos.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-semibold text-secondary">Videos</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {videos.map((v) => (
              <li key={v.id}>
                <VideoThumb video={v} onPlay={() => setVideo(v)} sizes="(min-width: 640px) 50vw, 100vw" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {posters.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-semibold text-secondary">Posters</h2>
          <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {posters.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="group block w-full text-left"
                  aria-label={`View poster: ${p.title}`}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={p.thumbnail}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="mt-3 block text-sm font-medium text-secondary">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Lightbox
        images={posters.map((p) => ({ src: p.url, title: p.title }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onChange={setLightbox}
      />
      <VideoModal video={video} onClose={() => setVideo(null)} />
    </div>
  )
}
