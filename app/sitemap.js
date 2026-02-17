const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ghub-git-main-william-robbs-projects.vercel.app'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap() {
  const routes = ['', '/blog', '/science', '/recipes', '/travel', '/merch', '/library']
  const lastModified = new Date()

  const staticUrls = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
  }))

  // Fetch exercises for dynamic sitemap
  // Note: We need to recreate the client here as sitemap.js runs in a background process during build/runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let exerciseUrls = []

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data } = await supabase.from('exercises').select('slug, created_at').limit(10000)

      if (data) {
        exerciseUrls = data.map((ex) => ({
          url: `${siteUrl}/library/${ex.slug}`,
          lastModified: new Date(ex.created_at || new Date()),
        }))
      }
    } catch (e) {
      console.error('Sitemap generation error:', e)
    }
  }

  return [...staticUrls, ...exerciseUrls]
}
