import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://zaiko.by'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/private/'],
      },
      {
        userAgent: ['OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'GoogleOther'],
        allow: '/',
        disallow: ['/api/', '/_next/'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}