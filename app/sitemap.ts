import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://zaiko.by'
  // Динамическая дата: обновляется при каждой сборке проекта
  const currentDate = new Date()

  const geoPages = [
    '/brovi-tolochin',
    '/brovi-novolukoml',
    '/brovi-borisov',
  ]

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    ...geoPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const, // гео-посадки — живой контент, обновляются чаще
      priority: 0.8,
    })),
    // GOTCHA: Если в будущем добавишь отдельные роуты (например, /privacy или /terms),
    // добавь их сюда. Для чистого лендинга с якорями (#reviews)
    // отдельные URL в sitemap не нужны.
  ]
}
