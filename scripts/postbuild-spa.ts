/**
 * GitHub Pages serves real files. Copy index.html shells for hub/roadmap paths
 * so deep links return 200 and the SPA can boot. Also write a minimal sitemap.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '../..')
const dist = join(root, 'dist')
const indexHtml = join(dist, 'index.html')

const shells = [
  'topic/solana/index.html',
  'topic/solana/roadmap/solana-dev-path/index.html',
  'topic/solana/roadmap/solana-roadmap/index.html',
]

for (const relative of shells) {
  const target = join(dist, relative)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(indexHtml, target)
  console.log(`spa shell: ${relative}`)
}

const base = 'https://nszjjj.github.io/link-hub'
const urls = [
  `${base}/`,
  `${base}/topic/solana/`,
  `${base}/topic/solana/roadmap/solana-dev-path/`,
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n')}
</urlset>
`

writeFileSync(join(dist, 'sitemap.xml'), sitemap)
console.log('wrote dist/sitemap.xml')
