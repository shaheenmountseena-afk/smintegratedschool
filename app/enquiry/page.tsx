import type { Metadata } from 'next'
import { ContactPanel } from '@/components/site/contact-panel'
import { EnquiryForm } from '@/components/site/enquiry-form'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'

export const metadata: Metadata = {
  title: 'Admissions Enquiry',
  description:
    'Enquire about admissions for NEET, JEE and KEAM coaching at Shaheen – Mount Seena, a residential school in Palakkad, Kerala.',
}

export default function EnquiryPage() {
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title="Admissions enquiry"
        description="Share a few details and our admissions team will get back to you shortly."
      />
      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-8">
            <EnquiryForm />
          </div>
          <div className="lg:col-span-4">
            <ContactPanel />
          </div>
        </div>
      </Section>
    </>
  )
}
