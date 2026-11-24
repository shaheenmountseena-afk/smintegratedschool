import Link from 'next/link'
import { PageHero } from '@/components/site/page-hero'
import { Section } from '@/components/site/section'
import { btn } from '@/lib/styles'

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404 Error"
        title="Page not found"
        description="The page you are looking for doesn't exist or has been moved."
      />
      <Section>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="mb-8 max-w-md text-muted-foreground">
            Please check the URL or navigate back to the home page to find what you are looking for.
          </p>
          <Link href="/" className={btn.primary}>
            Return to Homepage
          </Link>
        </div>
      </Section>
    </>
  )
}
