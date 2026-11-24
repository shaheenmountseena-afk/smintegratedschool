'use client'

import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { WHATSAPP_LINK } from '@/lib/site-config'

export function WhatsAppButton() {
  const pathname = usePathname()

  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens in a new tab)"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex size-13 items-center justify-center rounded-full bg-[#1f9d55] text-white shadow-lg shadow-black/15 transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </a>
  )
}
