'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  Maximize2,
  Pause,
  Play,
  Sparkles,
  X,
} from 'lucide-react'
import type { MediaItem } from '@/data/homeMedia'
import {
  getDefaultVideoThumbnail,
  getVideoEmbedUrl,
  isDirectVideoUrl,
  optimizeCloudinaryUrl,
} from '@/lib/media-utils'
import { cn } from '@/lib/utils'
import { Lightbox } from './lightbox'

const DEFAULT_INTERVAL_MS = 4000

const TYPE_LABELS: Record<MediaItem['type'], string> = {
  poster: 'Announcement Poster',
  video: 'Campus Film',
  photo: 'Campus & Event Photo',
}

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function AdmissionsMedia({
  items,
  autoPlayInterval = DEFAULT_INTERVAL_MS,
}: {
  items: MediaItem[]
  autoPlayInterval?: number
}) {
  const count = items.length
  const hasLoop = count > 1

  // Extended track [lastClone, ...items, firstClone] allows infinite forward/backward horizontal sliding
  const trackItems = useMemo(() => {
    if (count <= 1) {
      return items.map((item) => ({ item, renderKey: item.id, isClone: false }))
    }
    return [
      { item: items[count - 1], renderKey: `clone-prev-${items[count - 1].id}`, isClone: true },
      ...items.map((item) => ({ item, renderKey: item.id, isClone: false })),
      { item: items[0], renderKey: `clone-next-${items[0].id}`, isClone: true },
    ]
  }, [items, count])

  const [trackIndex, setTrackIndex] = useState(hasLoop ? 1 : 0)
  const [animate, setAnimate] = useState(true)
  const [navTick, setNavTick] = useState(0)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const [manualPaused, setManualPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)

  // Track OS reduced-motion preference dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Keep trackIndex in valid range if dynamic items length changes
  useEffect(() => {
    setAnimate(false)
    setTrackIndex(count > 1 ? 1 : 0)
    setPlayingVideoId(null)
  }, [count])

  const safeTrackIndex =
    count === 0
      ? 0
      : hasLoop
        ? Math.max(0, Math.min(count + 1, trackIndex))
        : 0

  const activeIndex = !hasLoop
    ? 0
    : safeTrackIndex === 0
      ? count - 1
      : safeTrackIndex === count + 1
        ? 0
        : safeTrackIndex - 1

  const activeItem = count > 0 ? items[activeIndex] : null

  const imageSlides = useMemo(
    () =>
      items
        .filter((item) => item.type !== 'video' && item.mediaType !== 'video')
        .map((item) => ({
          id: item.id,
          src: optimizeCloudinaryUrl(item.url, { resourceType: 'image', width: 1600 }),
          title: item.title,
        })),
    [items]
  )

  const stepSlide = useCallback(
    (delta: 1 | -1, isManual = false) => {
      if (!hasLoop) return
      setPlayingVideoId(null)
      if (isManual) setNavTick((t) => t + 1)

      if (reducedMotion) {
        setAnimate(false)
        setTrackIndex((prev) => {
          const currentReal =
            prev === 0 ? count - 1 : prev === count + 1 ? 0 : prev - 1
          const nextReal = (currentReal + delta + count) % count
          return nextReal + 1
        })
        return
      }

      setAnimate(true)
      setTrackIndex((prev) => {
        // Normalize immediately if triggered rapidly while still sitting on a boundary clone
        if (delta === 1 && prev >= count + 1) return 2
        if (delta === -1 && prev <= 0) return count - 1
        return prev + delta
      })
    },
    [hasLoop, count, reducedMotion]
  )

  const jumpToSlide = useCallback(
    (targetIndex: number) => {
      if (!hasLoop) return
      const bounded = ((targetIndex % count) + count) % count
      setPlayingVideoId(null)
      setNavTick((t) => t + 1)
      setAnimate(!reducedMotion)
      setTrackIndex(bounded + 1)
    },
    [hasLoop, count, reducedMotion]
  )

  // Seamless boundary snap after sliding onto firstClone / lastClone
  const handleTrackTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform' || !hasLoop) return
    if (safeTrackIndex === 0) {
      setAnimate(false)
      setTrackIndex(count)
    } else if (safeTrackIndex === count + 1) {
      setAnimate(false)
      setTrackIndex(1)
    }
  }

  // Fallback snap if transitionend is skipped while on a boundary clone
  useEffect(() => {
    if (!hasLoop || (safeTrackIndex !== 0 && safeTrackIndex !== count + 1)) return
    const snapTimer = window.setTimeout(() => {
      setAnimate(false)
      setTrackIndex(safeTrackIndex === 0 ? count : 1)
    }, 560)
    return () => window.clearTimeout(snapTimer)
  }, [hasLoop, safeTrackIndex, count])

  // Auto-slide every 4s (resets on activeIndex or manual navigation tick, pauses on hover/focus/video/lightbox/reduced-motion)
  const isPaused =
    !hasLoop ||
    hoverPaused ||
    focusPaused ||
    manualPaused ||
    reducedMotion ||
    playingVideoId !== null ||
    lightboxIndex !== null

  useEffect(() => {
    if (isPaused) return

    const timer = window.setTimeout(() => {
      stepSlide(1, false)
    }, autoPlayInterval)

    return () => window.clearTimeout(timer)
  }, [isPaused, activeIndex, navTick, autoPlayInterval, stepSlide])

  if (count === 0 || !activeItem) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted px-6 py-16 text-center text-muted-foreground">
        Admission posters, campus films, and announcements will be published here soon.
      </p>
    )
  }

  const openLightboxForItem = (itemId: string) => {
    const imgIdx = imageSlides.findIndex((img) => img.id === itemId)
    if (imgIdx !== -1) {
      setLightboxIndex(imgIdx)
    }
  }

  const activeIsVideo = activeItem.type === 'video' || activeItem.mediaType === 'video'
  const isPlayingCurrent = playingVideoId === activeItem.id
  const ActiveTypeIcon =
    activeItem.type === 'video' ? Film : activeItem.type === 'photo' ? Camera : Sparkles

  return (
    <div
      aria-roledescription="carousel"
      aria-label="Campus Film and Media showcase"
      className="mx-auto w-full max-w-5xl overflow-hidden select-none"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={(e) => {
        if (e.target instanceof HTMLElement && e.target.matches(':focus-visible')) {
          setFocusPaused(true)
        }
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocusPaused(false)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          stepSlide(-1, true)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          stepSlide(1, true)
        } else if (e.key === 'Escape' && playingVideoId) {
          e.preventDefault()
          setPlayingVideoId(null)
        }
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
        setHoverPaused(true)
      }}
      onTouchEnd={(e) => {
        setHoverPaused(false)
        if (touchX.current === null || isPlayingCurrent) {
          touchX.current = null
          return
        }
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 45) {
          stepSlide(dx < 0 ? 1 : -1, true)
        }
        touchX.current = null
      }}
    >
      {/* Centered Slide Viewport sitting directly on the white page background */}
      <div className="relative h-[320px] w-full overflow-hidden sm:h-[440px] md:h-[500px] lg:h-[540px]">
        <div
          onTransitionEnd={handleTrackTransitionEnd}
          style={{ transform: `translateX(-${safeTrackIndex * 100}%)` }}
          className={cn(
            'flex h-full will-change-transform',
            animate && !reducedMotion
              ? 'transition-transform duration-500 ease-out'
              : 'transition-none'
          )}
        >
          {trackItems.map(({ item, renderKey, isClone }, i) => {
            const isCurrentTrackSlide = i === safeTrackIndex
            const isVideo = item.type === 'video' || item.mediaType === 'video'
            const optimizedImage = !isVideo
              ? optimizeCloudinaryUrl(item.url, { resourceType: 'image', width: 1600 })
              : ''
            const rawThumb =
              item.thumbnail ||
              (isVideo ? getDefaultVideoThumbnail(item.url) : item.url)
            const optimizedThumb = rawThumb
              ? optimizeCloudinaryUrl(rawThumb, { resourceType: 'image', width: 1600 })
              : ''
            const isPlayingThis = !isClone && isVideo && isCurrentTrackSlide && playingVideoId === item.id
            const isDirectVideo = isVideo && isDirectVideoUrl(item.url)
            const videoSrc = isDirectVideo
              ? optimizeCloudinaryUrl(item.url, { resourceType: 'video' })
              : getVideoEmbedUrl(item.url)

            return (
              <div
                key={renderKey}
                role={isClone ? undefined : 'group'}
                aria-roledescription={isClone ? undefined : 'slide'}
                aria-label={isClone ? undefined : `Slide ${i} of ${count}: ${item.title}`}
                aria-hidden={!isCurrentTrackSlide}
                inert={!isCurrentTrackSlide}
                className="relative h-full w-full shrink-0"
              >
                {isPlayingThis ? (
                  <div className="relative mx-auto flex size-full max-w-4xl items-center justify-center overflow-hidden rounded-2xl bg-black">
                    {isDirectVideo ? (
                      <video
                        src={videoSrc}
                        poster={optimizedThumb || undefined}
                        title={item.title}
                        controls
                        autoPlay
                        playsInline
                        onEnded={() => setPlayingVideoId(null)}
                        className="size-full object-contain"
                      />
                    ) : (
                      <iframe
                        src={`${videoSrc}${videoSrc.includes('?') ? '&' : '?'}autoplay=1&rel=0`}
                        title={item.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="size-full border-0"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setPlayingVideoId(null)}
                      aria-label="Close video playback"
                      className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-secondary/90 px-3.5 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-primary"
                    >
                      <X className="size-4" aria-hidden="true" />
                      <span>Close Video</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative flex size-full items-center justify-center px-12 sm:px-14">
                    {(isVideo ? optimizedThumb : optimizedImage) ? (
                      <div
                        onClick={!isVideo ? () => openLightboxForItem(item.id) : undefined}
                        className={cn(
                          'relative size-full overflow-hidden rounded-xl',
                          !isVideo && 'cursor-zoom-in'
                        )}
                      >
                        <Image
                          src={isVideo ? optimizedThumb : optimizedImage}
                          alt={item.title}
                          fill
                          sizes="(min-width: 1024px) 960px, 100vw"
                          loading={i <= 1 ? 'eager' : 'lazy'}
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Film className="size-12" aria-hidden="true" />
                      </div>
                    )}

                    {/* Full-size expand button on image slides */}
                    {!isVideo && optimizedImage && (
                      <button
                        type="button"
                        onClick={() => openLightboxForItem(item.id)}
                        aria-label={`View full size: ${item.title}`}
                        className="absolute top-2 right-14 z-20 flex size-9 items-center justify-center rounded-full border border-border bg-white/95 text-secondary shadow-sm transition-colors hover:bg-muted sm:right-16"
                      >
                        <Maximize2 className="size-4" aria-hidden="true" />
                      </button>
                    )}

                    {/* Center play button trigger on video slides */}
                    {isVideo && (
                      <button
                        type="button"
                        onClick={() => setPlayingVideoId(item.id)}
                        aria-label={`Play video: ${item.title}`}
                        className="group/play absolute inset-0 z-10 flex items-center justify-center"
                      >
                        <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-primary shadow-xl ring-4 ring-secondary/15 transition-transform duration-300 group-hover/play:scale-110 sm:size-20">
                          <Play className="ml-1 size-7 fill-current sm:size-8" aria-hidden="true" />
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Prev / Next Navigation Arrows */}
        {hasLoop && !isPlayingCurrent && (
          <>
            <button
              type="button"
              onClick={() => stepSlide(-1, true)}
              aria-label="Previous slide"
              className="absolute top-1/2 left-0 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/95 text-secondary shadow-sm transition-all hover:bg-muted hover:scale-105 sm:size-11"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => stepSlide(1, true)}
              aria-label="Next slide"
              className="absolute top-1/2 right-0 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white/95 text-secondary shadow-sm transition-all hover:bg-muted hover:scale-105 sm:size-11"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Active Slide Details (Title, Description, Type/Counter, Optional CTA) */}
      <div className="mt-6 flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-secondary">
              <ActiveTypeIcon className="size-3.5 text-primary" aria-hidden="true" />
              <span>{TYPE_LABELS[activeItem.type] || 'Featured Media'}</span>
            </span>
            {hasLoop && (
              <span className="tabular-nums text-muted-foreground">
                {activeIndex + 1} / {count}
              </span>
            )}
          </div>

          <h3 className="font-heading text-xl leading-snug font-semibold text-secondary sm:text-2xl">
            {activeItem.title}
          </h3>
          {activeItem.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {activeItem.description}
            </p>
          )}
        </div>

        {activeItem.ctaText && activeItem.ctaLink && (
          <div className="shrink-0">
            {isExternalHref(activeItem.ctaLink) ? (
              <a
                href={activeItem.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary/90 sm:h-11 sm:px-6 sm:text-sm"
              >
                <span>{activeItem.ctaText}</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : (
              <Link
                href={activeItem.ctaLink}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-primary/90 sm:h-11 sm:px-6 sm:text-sm"
              >
                <span>{activeItem.ctaText}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar: Slide Dots & Autoplay Toggle */}
      {hasLoop && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item, i) => {
              const isCurrent = i === activeIndex
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToSlide(i)}
                  aria-label={`Go to slide ${i + 1}: ${item.title}`}
                  aria-current={isCurrent}
                  className="flex h-6 items-center py-1"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all duration-300',
                      isCurrent
                        ? 'w-8 bg-primary'
                        : 'w-2.5 bg-secondary/25 hover:bg-secondary/50'
                    )}
                  />
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="truncate text-xs font-medium text-muted-foreground max-w-[220px] sm:max-w-xs">
              {activeIsVideo ? 'Click play to watch video' : activeItem.title}
            </span>

            <button
              type="button"
              onClick={() => {
                setManualPaused((p) => !p)
                setNavTick((t) => t + 1)
              }}
              aria-label={manualPaused ? 'Resume automatic slideshow' : 'Pause automatic slideshow'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-muted"
            >
              {manualPaused ? (
                <>
                  <Play className="size-3.5 text-primary" aria-hidden="true" />
                  <span>Auto-play</span>
                </>
              ) : (
                <>
                  <Pause className="size-3.5 text-primary" aria-hidden="true" />
                  <span>Pause</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox for full-size poster/photo reading */}
      <Lightbox
        images={imageSlides}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={setLightboxIndex}
      />
    </div>
  )
}
