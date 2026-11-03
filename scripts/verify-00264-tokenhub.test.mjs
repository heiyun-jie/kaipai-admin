import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const view = fs.readFileSync(new URL('../src/views/system/AiImageProvidersView.vue', import.meta.url), 'utf8')
const match = view.match(/const providerOptions: ProviderOption\[\] = (\[[\s\S]*?\n\])/)
assert.ok(match, 'the actual create-provider form catalog must be available')
const compiled = ts.transpileModule(`const options = ${match[1]}; module.exports = options`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
const module = { exports: {} }
new Function('module', compiled)(module)
const options = module.exports

test('TokenHub form selects the actual v35 model and endpoint, independent of legacy TC3', () => {
  const option = options.find(v => v.code === 'tencent-tokenhub')
  assert.ok(option, 'a separate TokenHub option is required')
  assert.equal(option.publicConfig.endpoint, 'https://tokenhub.tencentmaas.com/v1/wand/hunyuan-image/v35-generation')
  assert.equal(option.publicConfig.model, 'hy-image-v3.5-preview')
  assert.deepEqual(option.secretFields, ['apiKey'])
  assert.deepEqual(option.requiredPublicFields, ['endpoint', 'model'])
  assert.equal(option.publicConfig.modelVersion, undefined)
  assert.equal(option.publicConfig.readTimeoutMs, 240000)
})
test('legacy Tencent entry is not repurposed or removed', () => {
  const old = options.find(v => v.code === 'tencent-hunyuan')
  assert.equal(old.publicConfig.endpoint, 'https://aiart.tencentcloudapi.com')
  assert.deepEqual(old.secretFields, ['secretId', 'secretKey'])
  assert.equal(new Set(options.map(v => v.code)).size, options.length)
})
