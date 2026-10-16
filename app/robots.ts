import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://zaiko.by'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /_next/static содержит критичные для Next.js ассеты (CSS/JS/шрифты):
        // блокировать всю папку /_next/ опасно для краулера — блокируем только
        // внутренние API и служебные роуты.
        disallow: ['/api/', '/admin/', '/private/'],
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