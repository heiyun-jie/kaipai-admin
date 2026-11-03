// B7: the mini-program is the sole content/layout source. Never edit generated files.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import * as sass from 'sass'
const root = fileURLToPath(new URL('../', import.meta.url))
// Both workspace and isolated Candidate layouts contain the frozen frontend sibling.
const frontendRoot = fs.existsSync(path.resolve(root, '../kaipai-frontend/src')) ? '../kaipai-frontend' : '../frontend'
const source = path.resolve(root, frontendRoot, 'src/pkg-actor-card/components')
const target = path.join(root, 'src/generated/actor-card-decoration')
const header = '// GENERATED from kaipai-frontend; run node scripts/generate-decoration-renderer.mjs.\n'
const read = name => fs.readFileSync(path.join(source, name), 'utf8').replace(/\r\n/g, '\n')
const { descriptor } = parse(read('ActorCardDecorationRenderer.vue'))
if (!descriptor.template || !descriptor.scriptSetup || descriptor.styles.length !== 1) throw Error('Renderer structure changed; review Web adapter')
let template = descriptor.template.content
const modules = template.match(/:key="module.id"/g) || []
if (modules.length !== 2) throw Error('Expected exactly hero/flow module roots')
template = template.replace(/:key="module.id"/g, ':key="module.id" :data-module="module.id"')
  .replace(/<(\/?)view\b/g, '<$1div').replace(/<(\/?)text\b/g, '<$1span')
  .replace(/<image\b/g, '<img').replace(/@tap=/g, '@click=')
  .replace(/mode="aspectFill"/g, 'style="object-fit: cover"')
  .replace(/mode="widthFix"/g, 'style="height: auto"').replace(/\blazy-load\b/g, 'loading="lazy"')
const script = descriptor.scriptSetup.content.replace(/rpx/g, 'px').replace(/\buni\./g, 'webPlatform.')
const tokens = fs.readFileSync(path.resolve(source, '../../styles/_tokens.scss'), 'utf8')
const nativeBase = '.actor-card-decoration {font-family: $kp-font-family; font-size: $kp-font-size-body; line-height: $kp-line-height-normal; width:750px;} :where(.actor-card-decoration div, .actor-card-decoration span, .actor-card-decoration img, .actor-card-decoration video) {box-sizing:border-box;margin:0;padding:0;} :where(.actor-card-decoration img) {display:block;}'
const css = sass.compileString(tokens + '\n' + nativeBase + '\n' + descriptor.styles[0].content, { style: 'expanded', logger: sass.Logger.silent }).css.replace(/rpx/g, 'px').replace(/max-width: 100vw/g, 'max-width: 750px')
const banner = '<!-- GENERATED: content/template/styles are sourced from the mini-program renderer. -->\n'
const outputs = {
  'ActorCardDecorationWeb.vue': `${banner}<template>${template}</template>\n<script setup lang="ts">\nimport { webPlatform } from '../../utils/decoration-web-platform';\n${script}</script>\n<style scoped>\n/* WeChat view/text defaults, isolated from admin typography/reset. */\n.actor-card-decoration div { box-sizing: border-box; }\n.actor-card-decoration img { max-width: 100%; }\n${css}\n</style>\n`,
  'actor-card-decoration-schema.ts': header + read('actor-card-decoration-schema.ts').replace(/rpx/g, 'px'),
  'actor-card-render-model.ts': header + read('actor-card-render-model.ts'),
}
fs.mkdirSync(target, { recursive: true })
for (const [name, content] of Object.entries(outputs)) {
  const file = path.join(target, name)
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== content) throw Error(`Generated renderer drift: ${name}`)
  } else fs.writeFileSync(file, content)
}
console.log(`Decoration renderer ${process.argv.includes('--check') ? 'source parity verified' : 'generated'}: ${Object.keys(outputs).length} files`)
