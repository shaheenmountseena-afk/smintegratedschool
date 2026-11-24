import type { Metadata } from 'next'
import { ContactPanel } from '@/components/site/contact-panel'
import { EnquiryForm } from '@/components/site/enquiry-form'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact Shaheen – Mount Seena at Mount Seena Campus, Pathiripala, Palakkad, Kerala. Call, WhatsApp or visit our NEET coaching campus in Palakkad.',
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We’d love to hear from you"
        description="Call, message or visit us at the Mount Seena Campus in Pathiripala, Palakkad."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <ContactPanel showAddress />
          </div>
          <div className="flex flex-col gap-12 lg:col-span-8">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted sm:aspect-[16/9]">
              {/* TODO: replace with the exact Google Maps embed URL for the campus */}
              <iframe
                title="Map showing Mount Seena Campus, Pathiripala, Palakkad"
                src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 size-full"
              />
            </div>
            <div>
              <h2 className="mb-8 text-2xl font-semibold text-secondary">Send us a message</h2>
              <EnquiryForm variant="compact" />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
