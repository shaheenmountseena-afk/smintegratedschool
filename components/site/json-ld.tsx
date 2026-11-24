import { SITE } from '@/lib/site-config'

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE.name,
    description: SITE.footerTagline,
    url: SITE.url,
    email: SITE.email,
    telephone: SITE.phones.map((p) => `+91${p}`),
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.line,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.state,
      postalCode: SITE.address.postalCode,
      addressCountry: 'IN',
    },
    parentOrganization: { '@type': 'Organization', name: SITE.management },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
