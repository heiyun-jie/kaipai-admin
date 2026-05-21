import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const distPath = join(scriptDir, '..', 'dist')
const targetExtensions = new Set(['.js', '.css', '.html'])
const vueErrorReferencePattern = /https:\/\/vuejs\.org\/error-reference\/#[^"'`\s)]*/g
const urlPattern = /https?:\/\/[^\s"'<>)]*/g
const allowedNamespacePattern = /^http:\/\/www\.w3\.org\/(2000\/svg|1998\/Math\/MathML|1999\/xlink)$/

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath))
      continue
    }
    if (entry.isFile() && targetExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

function isAllowedUrl(value) {
  return /^https?:\/\/(?:api\.)?kplyyk\.com\b/.test(value) || allowedNamespacePattern.test(value)
}

try {
  await stat(distPath)
} catch {
  throw new Error(`Admin dist directory not found: ${distPath}`)
}

const files = await collectFiles(distPath)

for (const file of files) {
  const content = await readFile(file, 'utf8')
  const withoutVueDocs = content.replace(vueErrorReferencePattern, '')
  const sanitized = withoutVueDocs.replace(urlPattern, (value) => (isAllowedUrl(value) ? value : ''))
  if (sanitized !== content) {
    await writeFile(file, sanitized, 'utf8')
  }
}

const violations = []
for (const file of files) {
  const content = await readFile(file, 'utf8')
  for (const match of content.matchAll(urlPattern)) {
    if (!isAllowedUrl(match[0])) {
      violations.push(`${relative(process.cwd(), file)} => ${match[0]}`)
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Admin dist contains non-kplyyk.com/api.kplyyk.com URLs:\n${violations.join('\n')}`)
}

console.log('Admin dist URL sanitizer passed: only kplyyk.com/api.kplyyk.com external URLs and W3C XML namespace constants remain.')
