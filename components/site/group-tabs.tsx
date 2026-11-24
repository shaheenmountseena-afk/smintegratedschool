'use client'

import { groups } from '@/data/content'
import { Tabs } from './tabs'

export function GroupTabs() {
  return (
    <Tabs
      label="Available groups"
      tabs={groups.map((g) => ({
        id: g.id,
        label: g.name,
        content: (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.subjects.map((subject, i) => (
              <li
                key={subject}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background px-6 py-5"
              >
                <span className="font-heading text-sm text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-medium text-secondary">{subject}</span>
              </li>
            ))}
          </ul>
        ),
      }))}
    />
  )
}
