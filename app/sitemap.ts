import type { MetadataRoute } from 'next'
import { NAV_LINKS, SITE } from '@/lib/site-config'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [...NAV_LINKS.map((link) => link.href), '/enquiry']

  return routes.map((route) => ({
    url: `${SITE.url}${route === '/' ? '' : route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1.0 : route === '/enquiry' ? 0.9 : 0.8,
  }))
}
