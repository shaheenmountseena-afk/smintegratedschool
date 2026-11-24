import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { WHATSAPP_LINK } from '@/lib/site-config'
import { btn, container } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function CtaBanner({
  title = 'Have questions? Talk to us on WhatsApp.',
  description = 'Our admissions team will answer your questions about programmes, hostel life and fees.',
  primaryLabel = 'Chat on WhatsApp',
}: {
  title?: string
  description?: string
  primaryLabel?: string
}) {
  return (
    <section className="w-full overflow-hidden py-20 md:py-28">
      <div className={container}>
        <div className="flex flex-col gap-8 rounded-3xl bg-secondary px-8 py-14 md:flex-row md:items-center md:justify-between md:px-14 md:py-16">
          <div className="max-w-xl">
            <h2 className="text-2xl leading-tight font-semibold text-white md:text-3xl">{title}</h2>
            <p className="mt-4 leading-relaxed text-white/70">{description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className={btn.primary}>
              <MessageCircle className="size-4" aria-hidden="true" />
              {primaryLabel}
            </a>
            <Link href="/enquiry" className={cn(btn.ghostLight)}>
              Enquire Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
