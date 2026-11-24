// 00-267: 背景图库风格分类读风格模板 + 防止 <script setup> 本地绑定遮蔽 prop 的回归门禁
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const picker = readFileSync(resolve(root, 'src/components/business/ActorCardBackgroundPicker.vue'), 'utf8')
const script = picker.slice(picker.indexOf('<script setup'), picker.indexOf('</script>'))

test('picker local bindings never shadow its props (open/disabled)', () => {
  const props = [...script.matchAll(/defineProps<\{([^}]*)\}>/g)].flatMap(m => [...m[1].matchAll(/(\w+)\??\s*:/g)].map(x => x[1]))
  assert.deepEqual(props.sort(), ['disabled', 'open'])
  for (const name of props) {
    assert.doesNotMatch(script, new RegExp(`(?:function|const|let|var)\\s+${name}\\b`), `local binding "${name}" would shadow the prop in the template`)
  }
})

test('picker categories come from style templates, not a hard-coded list', () => {
  assert.match(script, /loadActorCardStyleOptions\(\)/)
  assert.doesNotMatch(picker, /BACKGROUND_STYLES/)
  assert.doesNotMatch(picker, /value:\s*'(?:ancient|fresh)'/)
  assert.match(picker, /旧分类：/)
})

test('style vocabulary maps legacy ancient to the costume template', async () => {
  const util = readFileSync(resolve(root, 'src/utils/actor-card-style.ts'), 'utf8')
  assert.match(util, /value === 'ancient' \? 'costume' : value/)
})
