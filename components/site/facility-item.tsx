import type { LucideIcon } from 'lucide-react'
import { IconBadge } from './card'

export function FacilityItem({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <li className="flex items-start gap-4 border-t border-border py-6">
      <IconBadge icon={icon} />
      <p className="pt-2.5 text-[15px] leading-relaxed font-medium text-secondary">{title}</p>
    </li>
  )
}
