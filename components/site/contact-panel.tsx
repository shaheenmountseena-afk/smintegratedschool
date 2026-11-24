import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { SITE, WHATSAPP_LINK, INSTAGRAM_LINK, formatPhone } from '@/lib/site-config'
import { btn } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function ContactPanel({ showAddress = false }: { showAddress?: boolean }) {
  return (
    <aside className="flex flex-col gap-10 rounded-2xl bg-muted p-8 md:p-10">
      <div>
        <h2 className="text-xl font-semibold text-secondary">Prefer to talk?</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Message our admissions team on WhatsApp or call any of the numbers below.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(btn.primary, 'mt-6 w-full bg-[#1f9d55] hover:bg-[#1a8a4a]')}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Chat on WhatsApp
        </a>
      </div>

      <div>
        <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Call us</h3>
        <ul className="mt-4 flex flex-col gap-3">
          {SITE.phones.map((phone) => (
            <li key={phone}>
              <a
                href={`tel:+91${phone}`}
                className="flex items-center gap-3 rounded font-medium text-secondary hover:text-primary"
              >
                <Phone className="size-4 text-primary" aria-hidden="true" />
                {formatPhone(phone)}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {showAddress && (
        <>
          <div>
            <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Email</h3>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-4 flex items-center gap-3 rounded font-medium break-all text-secondary hover:text-primary"
            >
              <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {SITE.email}
            </a>
          </div>
          <div>
            <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Visit</h3>
            <address className="mt-4 flex items-start gap-3 leading-relaxed text-secondary not-italic">
              <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              {SITE.address.full}
            </address>
          </div>
          <div>
            <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Follow us</h3>
            <a
              href={INSTAGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-3 rounded font-medium text-secondary hover:text-primary transition-colors"
            >
              <svg
                className="size-4 shrink-0 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>neet_shaheen_mountseena</span>
            </a>
          </div>
        </>
      )}
    </aside>
  )
}
