// UI-only disposable fixture: binds localhost, has no API proxy, token or real actor data.
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clone = value => JSON.parse(JSON.stringify(value))
let draft = { templateId: 7, revision: 1, activeVersion: null, config: {
  schemaVersion: 1,
  modules: [
    { id: 'identity', type: 'identity', layout: { zone: 'hero', x: 48, y: 180, width: 654, height: 260 }, style: { backgroundColor: 'transparent', color: '#FFFFFF', fontSize: 48, lineHeight: 64 } },
    { id: 'highlights', type: 'highlights', order: 10, layout: { zone: 'hero', x: 48, y: 1120, width: 654, height: 150 } },
    ...['profile', 'introduction', 'works', 'photos', 'stills', 'video', 'pdf', 'cooperation'].map((type, i) => ({ id: type, type, order: (i + 2) * 10 })),
  ],
} }
const versions = []
const fixture = { name: 'decoration-isolated-fixture', configureServer(server) {
  server.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next()
    const match = req.url.match(/^\/api\/admin\/content\/templates\/7\/decoration\/(draft|preview|publish|versions|activate\/\d+)$/)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    const reply = (code, data, message = 'success') => res.end(JSON.stringify({ code, data, message }))
    if (!match) return reply(404, null, 'Isolated fixture: no external API is available')
    try {
      let body = ''; for await (const chunk of req) body += chunk
      const p = body ? JSON.parse(body) : {}, action = match[1]
      if (req.method === 'GET' && action === 'draft') return reply(200, { ...draft, preview: draft.config })
      if (req.method === 'GET' && action === 'versions') return reply(200, versions.map(({ config, ...summary }) => summary).reverse())
      if (action === 'preview') return reply(200, p.config)
      if (p.expectedRevision !== draft.revision) return reply(409, null, 'Fixture revision conflict')
      if (req.method === 'PUT' && action === 'draft') { draft.config = clone(p.config); draft.revision++ }
      else if (req.method === 'POST' && action === 'publish') {
        const checksum = crypto.createHash('sha256').update(JSON.stringify(draft.config)).digest('hex')
        if (versions.find(v => v.versionNo === draft.activeVersion)?.checksum !== checksum) {
          const versionNo = versions.length + 1
          versions.push({ versionId: versionNo, versionNo, config: clone(draft.config), checksum, note: p.note, publishedBy: 1, publishedAt: new Date().toISOString() })
          draft.activeVersion = versionNo; draft.revision++
        }
      } else if (req.method === 'POST' && action.startsWith('activate/')) { draft.activeVersion = Number(action.split('/')[1]); draft.revision++ }
      else return reply(405, null, 'Unsupported fixture operation')
      reply(200, { ...draft, preview: draft.config })
    } catch { reply(400, null, 'Invalid fixture request') }
  })
} }
const server = await createServer({ root, configFile: false, envFile: false, plugins: [vue(), fixture],
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  resolve: { alias: { '@': path.join(root, 'src') } }, server: { host: '127.0.0.1', port: 15174, strictPort: true },
})
await server.listen()
console.log('UI-only local fixture (memory storage, no real backend): http://127.0.0.1:15174/scripts/fixtures/decoration-preview.html')
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0) })
