import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFile(path.join(root, file), 'utf8')
const [view, router, settings, permissions, registry, menus, api] = await Promise.all([
  read('src/views/system/AiProfileImportConfigView.vue'),
  read('src/router/index.ts'),
  read('src/views/system/SettingsView.vue'),
  read('src/constants/permission.ts'),
  read('src/constants/permission-registry.ts'),
  read('src/constants/menus.ts'),
  read('src/api/ai.ts'),
])

function requireText(source, text, label) {
  if (!source.includes(text)) throw new Error(`${label} missing: ${text}`)
}

requireText(router, "path: 'system/ai-profile-import'", 'route')
requireText(router, "pagePermission: 'page.system.ai-profile-import'", 'route permission')
requireText(router, "architectureLayer: 'tooling'", 'tooling route')
requireText(settings, "openRoute('/system/ai-profile-import')", 'settings entry')
requireText(permissions, "systemAiProfileImport: 'page.system.ai-profile-import'", 'page permission')
for (const action of ['update', 'secret', 'test', 'audit']) {
  requireText(registry, `action.system.ai-profile-import.${action}`, `action permission ${action}`)
}
for (const endpoint of ['/config', '/secret', '/enabled', '/test', '/audits']) {
  requireText(api, `/admin/ai/profile-import${endpoint}`, `API ${endpoint}`)
}
requireText(view, 'type="password"', 'one-way secret input')
requireText(view, "secret.value = ''", 'secret memory cleanup')
if (view.includes('localStorage') || view.includes('sessionStorage')) throw new Error('secret page must not use browser storage')
if (menus.includes("route: '/system/ai-profile-import'")) throw new Error('profile import tooling route must not enter formal sidebar menus')

console.log('DeepSeek profile import settings contract passed')
