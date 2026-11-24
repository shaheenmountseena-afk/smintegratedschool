'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TabDef = { id: string; label: string; content: ReactNode }

/** Accessible tabs following the WAI-ARIA tabs pattern (arrow keys, Home/End). */
export function Tabs({ tabs, label, className }: { tabs: TabDef[]; label: string; className?: string }) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const uid = useId()

  const focusTab = (i: number) => {
    const next = (i + tabs.length) % tabs.length
    setActive(next)
    refs.current[next]?.focus()
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-muted p-1"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            type="button"
            id={`${uid}-tab-${tab.id}`}
            aria-selected={active === i}
            aria-controls={`${uid}-panel-${tab.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') focusTab(i + 1)
              if (e.key === 'ArrowLeft') focusTab(i - 1)
              if (e.key === 'Home') focusTab(0)
              if (e.key === 'End') focusTab(tabs.length - 1)
            }}
            className={cn(
              'h-10 shrink-0 rounded-full px-3.5 text-sm sm:px-5 whitespace-nowrap transition-colors',
              active === i
                ? 'bg-background font-medium text-secondary shadow-sm'
                : 'text-muted-foreground hover:text-secondary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          hidden={active !== i}
          tabIndex={0}
          className="mt-10 rounded-lg"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
