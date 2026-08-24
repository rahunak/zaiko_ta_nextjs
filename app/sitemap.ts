import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://zaiko.by'
  // Динамическая дата: будет обновляться при каждой сборке проекта
  const currentDate = new Date()

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'monthly', // Для лендинга monthly реалистичнее
      priority: 1.0,
    },
    // GOTCHA: Если в будущем добавишь отдельные роуты (например, /privacy или /terms), 
    // раскомментируй и добавь их сюда. Для чистого лендинга с якорями (#reviews) 
    // отдельные URL в sitemap не нужны.
    // {
    //   url: `${baseUrl}/privacy`,
    //   lastModified: currentDate,
    //   changeFrequency: 'yearly',
    //   priority: 0.5,
    // }
  ]
}