'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import type { HeroSlide } from '@/data/homeMedia'
import { WHATSAPP_LINK } from '@/lib/site-config'
import { btn, container } from '@/lib/styles'
import { cn } from '@/lib/utils'

const INTERVAL = 6000

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = slides.length

  const go = useCallback((i: number) => setIndex((i + count) % count), [count])

  useEffect(() => {
    if (paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => go(index + 1), INTERVAL)
    return () => window.clearTimeout(id)
  }, [index, paused, count, go])

  if (count === 0) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Campus highlights"
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
        touchX.current = null
      }}
    >
      <div className="relative h-[calc(100svh-4.5rem)] max-h-[760px] min-h-[540px] w-full overflow-hidden bg-secondary">
        {slides.map((slide, i) => {
          const active = i === index
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={cn(
                'absolute inset-0 transition-opacity duration-1000 ease-out',
                active ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                sizes="100vw"
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/60 to-secondary/10" />
              <div className={cn(container, 'relative flex h-full flex-col justify-center pb-16')}>
                <div className="max-w-xl">
                  <p className="mb-5 text-xs font-medium tracking-[0.16em] text-white/70 uppercase">{slide.eyebrow}</p>
                  <Heading className="text-4xl leading-[1.08] font-semibold text-white sm:text-5xl md:text-6xl">
                    {slide.title}
                  </Heading>
                  <p className="mt-6 max-w-md text-base leading-relaxed text-white/75 md:text-lg">
                    {slide.description}
                  </p>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <Link href="/enquiry" className={btn.primary}>
                      Enquire Now
                    </Link>
                    <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className={btn.ghostLight}>
                      <MessageCircle className="size-4" aria-hidden="true" />
                      Chat on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {count > 1 && (
          <div className={cn(container, 'absolute inset-x-0 bottom-8 flex items-center justify-between')}>
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  className="flex h-6 items-center"
                >
                  <span
                    className={cn(
                      'block h-1 rounded-full transition-all duration-300',
                      i === index ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/70',
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous slide"
                className="flex size-11 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next slide"
                className="flex size-11 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
