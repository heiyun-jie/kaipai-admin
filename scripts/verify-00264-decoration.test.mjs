import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse, compileScript } from '@vue/compiler-sfc'
import { createSSRApp, createRenderer, defineComponent, h, onMounted } from 'vue'
import { renderToString } from '@vue/server-renderer'
const require = createRequire(import.meta.url)
const cache = new Map()
const root = fileURLToPath(new URL('../', import.meta.url))
function load(file) {
  const full = path.resolve(root, file)
  if (cache.has(full)) return cache.get(full).exports
  const module = { exports: {} }; cache.set(full, module)
  const source = fs.readFileSync(full, 'utf8')
  const code = full.endsWith('.vue') ? compileScript(parse(source).descriptor, { id: 'test', inlineTemplate: true }).content : source
  const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  const localRequire = (id) => id === '@/utils/request' ? { default: {} } : id.startsWith('.') ? load(path.resolve(path.dirname(full), /\.(vue|ts)$/.test(id) ? id : `${id}.ts`)) : require(id)
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return module.exports
}
const utils = load('src/utils/actor-card-decoration.ts')
const { useActorCardDecoration } = load('src/composables/useActorCardDecoration.ts')

test('numeric input aria state follows native async disabled transitions without changing values', () => {
  const { syncNumberInputDisabledAria } = load('src/utils/number-input-disabled-aria.ts')
  const input = { disabled: false, value: '32', attrs: { 'aria-disabled': 'true' }, setAttribute(k, v) { this.attrs[k] = v } }
  const root = { querySelectorAll(selector) { assert.equal(selector, 'input[role="spinbutton"]'); return [input] } }
  syncNumberInputDisabledAria(root)
  assert.equal(input.attrs['aria-disabled'], 'false')
  assert.equal(input.value, '32')
  input.disabled = true
  syncNumberInputDisabledAria(root)
  assert.equal(input.attrs['aria-disabled'], 'true')
  assert.equal(input.value, '32')
})
const fixture = () => ({ schemaVersion: 1, defaults: { radius: 32 }, modules: [
  { id: 'identity', type: 'identity', order: 0, layout: { zone: 'hero', x: 48, y: 100, width: 600, height: 200 } },
  { id: 'photos', type: 'photos', order: 10, style: { radius: 0 }, enabled: false },
  { id: 'works', type: 'works', order: 20 },
] })
test('inheritance keeps zero, false and sparse authoring nodes', () => {
  const c = fixture(); const style = utils.effectiveStyle(c, c.modules[1])
  assert.equal(style.radius, 0); assert.equal(style.padding, 24)
  assert.equal(utils.effectiveStyle(c, c.modules[2]).radius, 32)
  assert.equal(c.modules[1].enabled, false); assert.equal(c.modules[2].style, undefined)
})
test('reordering uses visible flow peers without moving hero modules', () => {
  const c = fixture(); utils.moveModule(c, 'works', -1)
  assert.equal(c.modules.find(m => m.id === 'identity').order, 0)
  assert.ok(c.modules.find(m => m.id === 'works').order < c.modules.find(m => m.id === 'photos').order)
})
test('clearing one override preserves others and restores inheritance', () => {
  const c = fixture(); c.modules[1].style.color = '#123456'
  utils.clearStyleOverride(c.modules[1], 'radius')
  assert.equal(c.modules[1].style.color, '#123456')
  assert.equal(utils.effectiveStyle(c, c.modules[1]).radius, 32)
})
test('preview converts the whitelisted rpx values at a shared scale', () => {
  const c = fixture(); const css = utils.moduleCss(c, c.modules[0], 0.5)
  assert.equal(css.position, 'absolute'); assert.equal(css.left, '24px'); assert.equal(css.width, '300px')
  assert.equal(css.borderRadius, '16px'); assert.equal(css.fontSize, '14px')
  c.modules[0].style = { position: 'fixed', backgroundImage: 'url(secret)' }
  const guarded = utils.moduleCss(c, c.modules[0], 0.5)
  assert.equal(guarded.position, 'absolute'); assert.equal(guarded.backgroundImage, undefined)
})
const clone = value => JSON.parse(JSON.stringify(value))
const response = (id = 7, revision = 1) => ({ templateId: id, revision, activeVersion: null, config: fixture(), preview: fixture() })
function api() {
  let stored = response(), saveCount = 0, publishCount = 0
  return { get counts() { return { saveCount, publishCount } },
    load: async id => ({ ...clone(stored), templateId: id }), history: async () => [],
    save: async (id, payload) => { saveCount++; assert.equal(payload.expectedRevision, stored.revision); stored = { ...response(id, stored.revision + 1), config: clone(payload.config) }; return clone(stored) },
    preview: async (_id, config) => clone(config),
    publish: async (_id, p) => { publishCount++; assert.equal(p.expectedRevision, stored.revision); stored = { ...stored, revision: stored.revision + 1, activeVersion: 1 }; return clone(stored) },
    activate: async (_id, version, p) => ({ ...clone(stored), activeVersion: version, revision: p.expectedRevision + 1 }),
  }
}
test('save sends sparse config and current revision, then reads clean state', async () => {
  const transport = api(), s = useActorCardDecoration(transport); await s.open(7)
  assert.ok(s.config.value); s.config.value.defaults.radius = 0
  assert.equal(s.dirty.value, true); assert.equal(await s.save(), true)
  assert.equal(s.revision.value, 2); assert.equal(s.dirty.value, false); assert.equal(s.config.value.defaults.radius, 0)
})
test('publication requires saved content and never sends dirty edits as a version', async () => {
  const transport = api(), s = useActorCardDecoration(transport); await s.open(7)
  s.config.value.defaults.radius = 0
  assert.equal(await s.publish('v1'), false); assert.equal(transport.counts.publishCount, 0)
  await s.save(); assert.equal(await s.publish('v1'), true); assert.equal(s.activeVersion.value, 1)
})
test('late load from previous template cannot replace the current draft', async () => {
  let finish, savedId; const transport = api(), get = transport.load, save = transport.save
  transport.save = (id, payload) => { savedId = id; return save(id, payload) }
  transport.load = id => id === 7 ? new Promise(resolve => { finish = resolve }) : get(id)
  const s = useActorCardDecoration(transport), first = s.open(7)
  await s.open(9); finish(response(7)); await first
  assert.equal(s.config.value.modules[0].id, 'identity'); assert.equal(s.revision.value, 1)
  await s.save() // transport asserts and records the id in its returned DTO
  assert.equal(savedId, 9)
})
test('conflict or network failure retains unsaved edits and releases submit lock', async () => {
  const transport = api(); transport.save = async () => { throw Object.assign(new Error('conflict'), { code: 409 }) }
  const s = useActorCardDecoration(transport); await s.open(7); s.config.value.defaults.radius = 0
  assert.equal(await s.save(), false); assert.equal(s.config.value.defaults.radius, 0)
  assert.equal(s.conflict.value, true); assert.equal(s.busy.value, false); assert.equal(s.dirty.value, true)
})
test('duplicate submissions are ignored and edits made during save are not lost', async () => {
  let finish; const transport = api(); transport.save = () => new Promise(resolve => { finish = resolve })
  const s = useActorCardDecoration(transport); await s.open(7); s.config.value.defaults.radius = 0
  const pending = s.save(); assert.equal(await s.save(), false)
  s.config.value.defaults.radius = 8; const saved = response(7, 2); saved.config.defaults.radius = 0
  finish(saved); await pending
  assert.equal(s.config.value.defaults.radius, 8); assert.equal(s.dirty.value, true); assert.equal(s.revision.value, 2)
})
test('closing editor invalidates pending responses', async () => {
  let finish; const transport = api(); transport.load = () => new Promise(resolve => { finish = resolve })
  const s = useActorCardDecoration(transport), pending = s.open(7)
  s.close(); finish(response()); await pending
  assert.equal(s.config.value, null); assert.equal(s.busy.value, false)
})
test('activation changes selected version but preserves the saved draft', async () => {
  const s = useActorCardDecoration(api()); await s.open(7)
  const before = clone(s.config.value); assert.equal(await s.activate(2, '切换'), true)
  assert.deepEqual(clone(s.config.value), before); assert.equal(s.activeVersion.value, 2)
})

test('adapter uses admin-only paths and revision payloads, never a duplicate api prefix', async () => {
  const calls = [], transport = Object.fromEntries(['get', 'put', 'post'].map(method => [method, async (...args) => { calls.push([method, ...args]); return response() }]))
  const { createDecorationApi } = load('src/api/actor-card-decoration.ts'), a = createDecorationApi(transport)
  const c = fixture(); await a.load(7); await a.save(7, { expectedRevision: 3, config: c }); await a.preview(7, c)
  await a.publish(7, { expectedRevision: 4, note: '发布' }); await a.history(7); await a.activate(7, 2, { expectedRevision: 5, note: '切换' })
  assert.deepEqual(calls, [
    ['get', '/admin/content/templates/7/decoration/draft'],
    ['put', '/admin/content/templates/7/decoration/draft', { expectedRevision: 3, config: c }],
    ['post', '/admin/content/templates/7/decoration/preview', { config: c }],
    ['post', '/admin/content/templates/7/decoration/publish', { expectedRevision: 4, note: '发布' }],
    ['get', '/admin/content/templates/7/decoration/versions'],
    ['post', '/admin/content/templates/7/decoration/activate/2', { expectedRevision: 5, note: '切换' }],
  ])
})

test('real preview renders hero, sorted flow and inherited radius but excludes disabled modules', async () => {
  const Preview = load('src/components/business/ActorCardDecorationPreview.vue').default
  const c = fixture(); c.modules.push({ id: 'intro', type: 'introduction', order: 1 })
  const html = await renderToString(createSSRApp(Preview, { config: c, selected: 'works' }))
  assert.match(html, /示例预览/); assert.match(html, /data-module="identity"/)
  assert.doesNotMatch(html, /data-module="photos"/)
  assert.ok(html.indexOf('data-module="intro"') < html.indexOf('data-module="works"'))
  assert.match(html, /border-radius:32px/); assert.match(html, /data-selected="works"/)
  assert.doesNotMatch(html, /粉丝|热度/)
})

test('server validation state expires after editing and history refresh failure does not undo publication', async () => {
  const t = api(), s = useActorCardDecoration(t); await s.open(7)
  assert.equal(await s.validate(), true); assert.equal(s.validationCurrent.value, true)
  s.config.value.defaults.radius = 4; assert.equal(s.validationCurrent.value, false)
  await s.save(); t.history = async () => { throw new Error('offline') }
  assert.equal(await s.publish('首版'), true); assert.equal(s.activeVersion.value, 1)
  assert.match(s.error.value, /操作成功.*列表刷新失败/)
})

test('numeric style field commits the actual InputNumber v-model event', () => {
  const events = []
  const renderer = createRenderer({ createElement: tag => ({ tag, children: [] }), createText: text => ({ text }), createComment: text => ({ text }), insert: (child, parent) => parent.children.push(child), remove() {}, setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null, patchProp() {} })
  const NumberField = defineComponent({ emits: ['update:modelValue'], setup(_, { emit }) { onMounted(() => emit('update:modelValue', 40)); return () => h('input') } })
  const Fields = load('src/components/business/ActorCardDecorationStyleFields.vue').default
  const app = renderer.createApp(Fields, { inherited: utils.BASE_STYLE, onSet: (key, value) => events.push([key, value]) })
  app.component('el-input-number', NumberField)
  for (const name of ['el-form-item', 'el-input', 'el-button', 'el-select', 'el-option']) app.component(name, defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) }))
  app.mount({ children: [] }); assert.ok(events.some(([key, value]) => key === 'radius' && value === 40)); app.unmount()
})

test('effective preview is consumed only while it matches the current authoring config', async () => {
  const t = api(), base = t.load; t.load = async id => { const r = await base(id); r.preview.defaults.radius = 48; return r }
  const s = useActorCardDecoration(t); await s.open(7)
  assert.equal(s.previewConfig.value.defaults.radius, 48)
  assert.equal(s.config.value.defaults.radius, 32)
  s.config.value.defaults.radius = 8; assert.equal(s.previewConfig.value.defaults.radius, 8)
  t.preview = async (_id, config) => ({ ...clone(config), defaults: { radius: 16 } })
  await s.validate(); assert.equal(s.previewConfig.value.defaults.radius, 16)
  assert.equal(s.config.value.defaults.radius, 8)
})

test('route leave requires discard confirmation and blocks while a write is pending', async () => {
  const s = useActorCardDecoration(api()); await s.open(7)
  assert.equal(await s.canLeave(async () => false), true)
  s.config.value.defaults.radius = 2
  assert.equal(await s.canLeave(async () => false), false)
  assert.equal(await s.canLeave(async () => true), true)
  s.busy.value = true; assert.equal(await s.canLeave(async () => true), false)
})

test('hero drag converts physical pixels to design coordinates and clamps the whole rectangle', () => {
  const c = fixture(); c.hero = { height: 1000 }
  assert.deepEqual(utils.dragHeroPosition(c, c.modules[0], { x: 48, y: 100 }, 32, 64, 320), { x: 123, y: 250 })
  assert.deepEqual(utils.dragHeroPosition(c, c.modules[0], { x: 48, y: 100 }, 10000, -10000, 320), { x: 150, y: 0 })
  assert.equal(c.modules[0].layout.x, 48)
})
test('hero drag rejects flow/disabled modules, bad pointer data and invalid dimensions', () => {
  const c = fixture()
  assert.equal(utils.dragHeroPosition(c, c.modules[1], { x: 0, y: 0 }, 20, 20, 320), null)
  c.modules[0].enabled = false
  assert.equal(utils.dragHeroPosition(c, c.modules[0], { x: 0, y: 0 }, 20, 20, 320), null)
  c.modules[0].enabled = true
  for (const width of [0, NaN, Infinity, -1]) assert.equal(utils.dragHeroPosition(c, c.modules[0], { x: 0, y: 0 }, 20, 20, width), null)
  assert.equal(utils.dragHeroPosition(c, c.modules[0], { x: 0, y: 0 }, NaN, 20, 320), null)
})

test('binding adapter keeps default/background distinct and previews through admin authorization', async () => {
  const calls = [], transport = Object.fromEntries(['get', 'put'].map(method => [method, async (...args) => { calls.push([method, ...args]); return null }]))
  const { createDecorationBindingApi } = load('src/api/actor-card-decoration-binding.ts')
  const a = createDecorationBindingApi(transport), source = { generationMode: 'person_background_ai', backgroundId: 9 }
  await a.load({ generationMode: 'person_ai' }); await a.load(source)
  const p = { expectedRevision: 2, templateId: 7, versionId: 31, note: '绑定' }
  await a.save(source, p); await a.preview(3, source)
  assert.equal(calls[0][1], '/admin/content/actor-card-decoration-bindings/default')
  assert.equal(calls[1][1], '/admin/content/actor-card-decoration-bindings/backgrounds/9')
  assert.deepEqual(calls[2][2], p); assert.deepEqual(calls[3].slice(1), ['/admin/content/actor-card-decoration-bindings/preview/cards/3', { params: source }])
})
test('binding workspace isolates late responses, requires read revision and retains edits on conflict', async () => {
  const { useDecorationBinding } = load('src/composables/useDecorationBinding.ts')
  let finish, calls = 0
  const transport = { load: source => source.generationMode === 'person_ai' ? new Promise(r => finish = r) : Promise.resolve({ revision: 4 }), save: async () => { calls++; throw { code: 409 } }, preview: async () => ({ id: 1 }) }
  const s = useDecorationBinding(transport), first = s.open({ generationMode: 'person_ai' })
  assert.equal(await s.save(7, 31, '绑定'), false)
  await s.open({ generationMode: 'person_background_ai', backgroundId: 9 }); finish({ revision: 1 }); await first
  assert.equal(s.binding.value.revision, 4)
  assert.equal(await s.save(7, 31, '绑定'), false); assert.equal(calls, 1); assert.match(s.error.value, /重新读取/)
  s.close(); assert.equal(s.binding.value, null); assert.equal(s.card.value, null)
})

test('preview pointer handlers emit clamped hero coordinates only when editing is enabled', () => {
  const emitted = [], nodes = []
  const renderer = createRenderer({ createElement: tag => { const n = { tag, children: [], props: {}, getBoundingClientRect: () => ({ width: 320 }), scrollHeight: 2000, querySelectorAll: () => [], setPointerCapture() {} }; nodes.push(n); return n }, createText: text => ({ text }), createComment: text => ({ text }), insert: (child, parent) => parent.children.push(child), remove() {}, setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null, patchProp: (node, key, _old, value) => { node.props[key] = value } })
  const Preview = load('src/components/business/ActorCardDecorationPreview.vue').default
  for (const draggable of [false, true]) {
    nodes.length = 0
    const app = renderer.createApp(Preview, { config: fixture(), draggable, onMove: (...args) => emitted.push(args) })
    app.mount({ children: [] })
    const hero = nodes.find(n => n.props['data-module'] === 'identity')
    const canvas = nodes.find(n => n.props.onPointerdownCapture)
    canvas.props.onPointerdownCapture({ button: 0, pointerId: 1, clientX: 0, clientY: 0, target: { closest: () => ({ dataset: { module: 'identity' } }) }, preventDefault() {} })
    canvas.props.onPointermove({ pointerId: 1, clientX: 1000, clientY: -1000 })
    canvas.props.onPointerup()
    if (!draggable) assert.equal(emitted.length, 0)
    app.unmount()
  }
  assert.equal(emitted.length, 1); assert.equal(emitted[0][0], 'identity'); assert.deepEqual(emitted[0][1], { x: 150, y: 0 })
})
test('authorized real preview uses actual data and honors contact/video/attachment privacy', async () => {
  const Preview = load('src/components/business/ActorCardDecorationPreview.vue').default
  const config = fixture(); config.modules = ['identity','profile','highlights','introduction','cooperation','video','pdf'].map((type,i) => ({ id:type, type, order:i, ...(type === 'pdf' ? { presentation: 'pages' } : {}) }))
  const html = await renderToString(createSSRApp(Preview, { config, card: { id:3, profile:{ name:'真实演员甲', gender:'女', age:24, height:'168', weight:'48', city:'上海', school:'上戏', bodyType:'匀称', hairStyle:'长发', languages:['普通话','英语'], skills:['旧技能'], skillGroups:{ specialty:['古典舞'], professionalAbility:['镜头表演'], roleType:['都市角色'] }, introduction:'真实完整简介', contact:'secret-contact' }, video:{ url:'https://private/video' }, attachment:{filename:'private.pdf',pageImages:['https://private/page']},settings:{showContact:false,showVideo:false,showAttachment:false} } }))
  for (const realValue of ['真实演员甲','真实完整简介','24岁','上海','匀称','长发','普通话','英语','古典舞','镜头表演','都市角色','旧技能']) assert.match(html, new RegExp(realValue))
  assert.doesNotMatch(html,/secret-contact|private\.pdf|https:\/\/private/)
  assert.doesNotMatch(html,/示例演员/)
})

test('real preview keeps complete profile rows, languages and grouped skills without inventing empty modules', async () => {
  const Preview=load('src/components/business/ActorCardDecorationPreview.vue').default;
  const config={schemaVersion:1,modules:['profile','highlights','photos'].map(type=>({id:type,type}))};
  const html=await renderToString(createSSRApp(Preview,{config,card:{id:1,profile:{age:26,city:'杭州',bodyType:'修长',hairStyle:'短发',languages:['英语'],skillGroups:{professionalAbility:['镜头表演'],specialty:['古典舞'],roleType:['都市']}}}}));
  for(const text of ['26岁','杭州','修长','短发','英语','镜头表演','古典舞','都市'])assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/data-module="photos"/);
});
test('admin and mini share controlled spacing, zero, align and scaled shadow geometry', () => {
  const mini=load('../kaipai-frontend/src/pkg-actor-card/components/actor-card-decoration-schema.ts');
  const config=fixture();config.page={contentPadding:0,gap:0};config.modules[0].style={shadow:'soft',align:'right'};
  const n=mini.resolveActorCardDecoration({versionId:1,templateId:7,templateVersion:1,schemaVersion:1,config});
  const flow=mini.buildDecorationFlowStyle(n);for(const side of ['Top','Bottom','Left','Right'])assert.equal(flow[`padding${side}`],'0rpx');
  const admin=utils.moduleCss(config,config.modules[0],320/750),style=mini.buildDecorationModuleStyle(n.modules.find(m=>m.id==='identity'));
  assert.equal(admin.alignItems,style.alignItems);assert.ok(admin.boxShadow.includes(`${8*320/750}px`));assert.equal(style.boxShadow,'0 8rpx 24rpx rgba(15, 23, 42, 0.10)');
});

// B7: fail against the old separately-maintained Sample canvas.
test('central preview uses the mini-program content renderer, not a simplified sample', async () => {
  const Preview = load('src/components/business/ActorCardDecorationPreview.vue').default
  const html = await renderToString(createSSRApp(Preview, { config: fixture() }))
  assert.match(html, /actor-card-decoration__hero-shade/)
  assert.doesNotMatch(html, />身份摘要</)
  assert.match(html, /actor-card-decoration__name/)
})

test('public editor background changes only after server save and restores on reopen', async () => {
 const { useEditorBackground }=load('src/composables/useEditorBackground.ts')
 let stored={revision:0,backgroundId:null,background:null}
 const item={id:9,style:'classic',imageUrl:'https://test/img.png',thumbnailUrl:'https://test/img.png',enabled:1,sortOrder:0}
 const calls=[]
 const api={context:async()=>clone(stored),saveContext:async(id,p)=>{calls.push([id,p]);stored={revision:stored.revision+1,backgroundId:p.backgroundId,background:p.backgroundId?item:null};return clone(stored)}}
 const s=useEditorBackground(api);await s.open(7);assert.equal(s.selected.value,null)
 assert.equal(await s.choose(item),true);assert.equal(s.selected.value.id,9);assert.deepEqual(calls[0],[7,{expectedRevision:0,backgroundId:9}])
 s.close();await s.open(7);assert.equal(s.selected.value.id,9);assert.equal(s.revision.value,1)
 await s.choose(null);assert.equal(s.selected.value,null)
})
test('public background failed save, disabled image and duplicate submits never replace selection', async () => {
 const { useEditorBackground }=load('src/composables/useEditorBackground.ts')
 let finish,count=0;const item={id:9,enabled:1},old={id:2,enabled:1}
 const s=useEditorBackground({context:async()=>({revision:1,backgroundId:2,background:old}),saveContext:async()=>{count++;return new Promise((resolve,reject)=>{finish=reject})}})
 await s.open(7);assert.equal(await s.choose({id:3,enabled:0}),false)
 const first=s.choose(item);assert.equal(await s.choose(item),false);assert.equal(count,1);assert.equal(s.selected.value.id,2)
 finish(new Error('offline'));assert.equal(await first,false);assert.equal(s.selected.value.id,2);assert.equal(s.busy.value,false)
})
test('late editor background load cannot leak selection across templates', async () => {
 const { useEditorBackground }=load('src/composables/useEditorBackground.ts')
 let finish;const s=useEditorBackground({context:id=>id===7?new Promise(r=>{finish=r}):Promise.resolve({revision:3,background:{id:12}}),saveContext:async()=>{throw Error('unused')}})
 const first=s.open(7);await s.open(8);finish({revision:1,background:{id:9}});await first;assert.equal(s.selected.value.id,12);assert.equal(s.revision.value,3)
})


test('web phone action uses a validated tel link without logging private contact', () => {
 const { webPlatform }=load('src/utils/decoration-web-platform.ts')
 const previous=globalThis.window, assignments=[]
 globalThis.window={location:{assign:url=>assignments.push(url)}}
 try { webPlatform.makePhoneCall({phoneNumber:'+86 13800138000'}); webPlatform.makePhoneCall({phoneNumber:'javascript:alert(1)'}) }
 finally { globalThis.window=previous }
 assert.deepEqual(assignments,['tel:+8613800138000'])
})

test('generated web schema matches all mini module styles with unit conversion only', () => {
 const mini=load('../kaipai-frontend/src/pkg-actor-card/components/actor-card-decoration-schema.ts')
 const web=load('src/generated/actor-card-decoration/actor-card-decoration-schema.ts')
 const config={schemaVersion:1,page:{contentPadding:0,gap:8},defaults:{radius:0,shadow:'soft'},modules:['identity','profile','highlights','introduction','works','photos','stills','video','pdf','cooperation'].map((type,i)=>({id:type,type,order:i}))}
 const envelope={versionId:1,templateId:7,templateVersion:1,schemaVersion:1,config}
 const m=mini.resolveActorCardDecoration(envelope), w=web.resolveActorCardDecoration(envelope)
 assert.ok(m);assert.deepEqual(m,w)
 for(const fn of ['buildDecorationPageStyle','buildDecorationHeroStyle','buildDecorationHeroImageStyle','buildDecorationFlowStyle']) assert.deepEqual(web[fn](w),JSON.parse(JSON.stringify(mini[fn](m)).replace(/rpx/g,'px')))
 for(let i=0;i<m.modules.length;i++) assert.deepEqual(web.buildDecorationModuleStyle(w.modules[i]),JSON.parse(JSON.stringify(mini.buildDecorationModuleStyle(m.modules[i])).replace(/rpx/g,'px')))
})

test('all ten modules render full authorized media using the shared view', async () => {
 const Preview=load('src/components/business/ActorCardDecorationPreview.vue').default
 const config={schemaVersion:1,modules:['identity','profile','highlights','introduction','works','photos','stills','video','pdf','cooperation'].map((type,i)=>({id:type,type,order:i}))}
 const card={id:3,profile:{name:'共享视图演员',city:'上海',skills:['古典舞'],contact:'13800138000',introduction:'完整介绍不截断'},works:[{id:1,title:'作品一',role:'角色甲',stills:['https://test/still.png']}],photos:['https://test/photo.png'],video:{url:'https://test/video.mp4',poster:'https://test/poster.png'},attachment:{filename:'资料.pdf',pageImages:['https://test/page.png']},settings:{showContact:true,showVideo:true,showAttachment:true}}
 const html=await renderToString(createSSRApp(Preview,{config,card,backgroundUrl:'https://test/bg.png'}))
 for(const type of ['identity','profile','highlights','introduction','works','photos','stills','video','pdf','cooperation'])assert.ok(html.includes(`data-module="${type}"`),type)
 for(const text of ['共享视图演员','完整介绍不截断','作品一','https://test/bg.png','https://test/photo.png','https://test/video.mp4','资料.pdf']) assert.ok(html.includes(text),text)
})

// B12: the explicit reference preset is an atomic draft edit, never a publication.
function referencePreset(config) {
  assert.equal(typeof utils.applyReferenceProfileHeroPreset, 'function', 'B12 reference preset must exist')
  return utils.applyReferenceProfileHeroPreset(config)
}
test('reference preset upgrades a cloned draft and preserves all flow content and their order', () => {
  const c = fixture(); c.hero = { height: 1500, focalX: 63 }; c.page = { gap: 0 }; c.modules[2].order = 19
  const before = clone(c), result = referencePreset(c)
  assert.deepEqual(c, before); assert.notEqual(result, c)
  assert.equal(result.schemaVersion, 2); assert.equal(result.minRendererVersion, 2)
  assert.equal(result.hero.height, 1500); assert.equal(result.hero.focalX, 63); assert.deepEqual(result.page, { gap: 0 })
  assert.deepEqual(result.modules.filter(m => (m.layout?.zone ?? 'flow') === 'flow'), before.modules.filter(m => (m.layout?.zone ?? 'flow') === 'flow'))
  const identity = result.modules.find(m => m.layout?.zone === 'hero' && m.type === 'identity')
  assert.equal(identity.id, 'identity'); assert.equal(identity.presentation, 'profileHero')
  assert.deepEqual(identity.layout, { zone: 'hero', x: 40, y: 1050, width: 670, height: 300, zIndex: 2 })
  assert.deepEqual(identity.identityOptions, { eyebrow: 'ACTOR PROFILE', eyebrowFontSize: 28, eyebrowLetterSpacing: 6, eyebrowColor: '#D8E0EA', nameFontSize: 104, nameLineHeight: 124, metaFontSize: 36, metaLineHeight: 48, roleLabel: '演员', metaFields: ['role', 'height', 'weight'], weightUnit: 'jin' })
  const promotion = result.modules.find(m => m.type === 'promotion')
  assert.equal(promotion.presentation, 'pill'); assert.deepEqual(promotion.layout, { zone: 'hero', x: 40, y: 1365, width: 670, height: 125, zIndex: 3 })
  for (const [k,v] of Object.entries({ backgroundColor: '#3266FF', color: '#FFFFFF', radius: 96, padding: 24, fontSize: 32, lineHeight: 42, fontWeight: 600 })) assert.equal(promotion.style[k], v)
  assert.deepEqual(result.hero.overlay, { enabled: true, color: '#0F172A', startOpacity: 6, endOpacity: 24 })
  assert.equal('heroBadgeText' in promotion, false)
})
test('reference preset keeps the full default hero and is repeatable without adding duplicates', () => {
  const result = referencePreset(fixture())
  assert.equal(result.hero.height, 1334)
  assert.equal(result.modules.find(m => m.type === 'identity').layout.y, 884)
  assert.equal(result.modules.find(m => m.type === 'promotion').layout.y, 1199)
  assert.deepEqual(referencePreset(result), result)
})
test('reference preset moves hero skills into the flow without mutating or losing skill style', () => {
  const c = fixture(); c.modules.push({ id: 'skills', type: 'highlights', order: 1, layout: { zone: 'hero', x: 1, y: 900, width: 700, height: 100 }, style: { gap: 0, color: '#123456' } })
  const before = clone(c); const result = referencePreset(c), skills = result.modules.find(m => m.id === 'skills')
  assert.equal(skills.layout.zone, 'flow'); assert.deepEqual(skills.style, before.modules[3].style)
  for (const key of ['x','y','height','zIndex']) assert.equal(key in skills.layout, false)
  assert.ok(skills.order > result.modules.find(m => m.id === 'works').order)
  assert.deepEqual(c, before)
})
test('reference preset removes only redundant hero skills when the existing flow skills are present', () => {
  const c = fixture(), flow = { id: 'flow-skills', type: 'highlights', order: 4, enabled: false, style: { color: '#987654' } }
  c.modules.push(flow, { id: 'hero-skills', type: 'highlights', layout: { zone: 'hero', x: 0, y: 1000, width: 600, height: 200 } })
  const result = referencePreset(c)
  assert.deepEqual(result.modules.find(m => m.id === 'flow-skills'), flow)
  assert.equal(result.modules.some(m => m.id === 'hero-skills'), false)
})
test('reference preset rejects invalid height, excessive count, duplicate identities and occupied rectangles atomically', () => {
  for (const height of [449, 1801, 500.5]) {
    const c = fixture(); c.hero = { height }; const before = clone(c)
    assert.throws(() => referencePreset(c), /高度|height/); assert.deepEqual(c, before)
  }
  const tooMany = fixture(); tooMany.modules = Array.from({ length: 16 }, (_, i) => ({ id: `module-${i}`, type: 'works' }))
  assert.throws(() => referencePreset(tooMany), /16|数量|count/)
  const duplicate = fixture(); duplicate.modules.push(clone(duplicate.modules[0]))
  assert.throws(() => referencePreset(duplicate), /重复|冲突|duplicate/)
  const occupied = fixture(); occupied.modules.push({ id: 'hero-intro', type: 'introduction', presentation: 'summary', layout: { zone: 'hero', x: 40, y: 900, width: 670, height: 100 } })
  const before = clone(occupied); assert.throws(() => referencePreset(occupied), /冲突|重叠|overlap/); assert.deepEqual(occupied, before)
  const minimum = fixture(); minimum.hero = { height: 450 }
  assert.equal(referencePreset(minimum).modules.find(m => m.type === 'identity').layout.y, 0)
})
test('explicit reference action keeps existing dirty flow edits and preserves all write gates', async () => {
  const t = api(), s = useActorCardDecoration(t); await s.open(7)
  assert.equal(typeof s.applyReferencePreset, 'function', 'draft action must enforce edit gates')
  s.config.value.modules[2].style = { radius: 7 }
  const before = clone(s.config.value)
  assert.equal(s.applyReferencePreset(false), false); assert.deepEqual(clone(s.config.value), before)
  s.busy.value = true; assert.equal(s.applyReferencePreset(true), false); s.busy.value = false
  assert.equal(s.applyReferencePreset(true, true), false)
  s.conflict.value = true; assert.equal(s.applyReferencePreset(true), false); s.conflict.value = false
  assert.equal(s.applyReferencePreset(true), true)
  assert.equal(s.dirty.value, true); assert.equal(s.revision.value, 1)
  assert.equal(s.config.value.modules.find(m => m.id === 'works').style.radius, 7)
  assert.deepEqual(t.counts, { saveCount: 0, publishCount: 0 })
  assert.equal(await s.publish('must save first'), false)
})
test('failed reference action retains the original draft and returns an actionable conflict message', async () => {
  const s = useActorCardDecoration(api()); await s.open(7); s.config.value.hero = { height: 400 }
  assert.equal(typeof s.applyReferencePreset, 'function', 'draft action must exist')
  const before = clone(s.config.value)
  assert.equal(s.applyReferencePreset(true), false); assert.deepEqual(clone(s.config.value), before)
  assert.match(s.error.value, /高度|height/); assert.equal(s.busy.value, false)
})
test('sample badge is explicitly illustrative while real actor empty/missing badges remain empty', () => {
  const { previewModel } = load('src/utils/actor-card-preview-model.ts')
  assert.equal(previewModel().profile.heroBadgeText, '示例文案 · 可填写演艺亮点')
  assert.equal(previewModel({ id: 3, profile: { name: '演员甲' } }).profile.heroBadgeText, undefined)
  assert.equal(previewModel({ id: 3, profile: { name: '演员甲', heroBadgeText: '' } }).profile.heroBadgeText, '')
  assert.equal(previewModel({ id: 3, profile: { name: '演员甲', heroBadgeText: '我的亮点' } }).profile.heroBadgeText, '我的亮点')
})

function mountedControlledFields(file, props = {}) {
  assert.ok(fs.existsSync(path.join(root, file)), 'B12 controlled fields must exist')
  const nodes = [], events = []
  const renderer = createRenderer({ createElement: tag => { const node = { tag, children: [], props: {} }; nodes.push(node); return node }, createText: text => ({ text }), createComment: text => ({ text }), insert: (node, parent) => parent.children.push(node), remove() {}, setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null, patchProp: (node, key, _old, value) => { node.props[key] = value } })
  const app = renderer.createApp(load(file).default, { ...props, onSet: (key, value) => events.push([key, value]) })
  const field = defineComponent({ inheritAttrs: false, setup: (_, { attrs }) => () => h('input', attrs) })
  for (const name of ['el-input-number','el-input','el-select','el-switch']) app.component(name, field)
  for (const name of ['el-form-item','el-option']) app.component(name, defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) }))
  app.mount({ children: [] })
  return { events, update(label, value) { const node = nodes.find(n => n.props['aria-label'] === label); assert.ok(node, `controlled field ${label}`); node.props['onUpdate:modelValue'](value) }, unmount: () => app.unmount() }
}
test('profileHero property controls emit only whitelisted typed values and preserve sparse props', () => {
  const options = { eyebrow: 'ACTRESS PROFILE', nameFontSize: 100, nameLineHeight: 124, metaFields: ['height'] }, before = clone(options)
  const fields = mountedControlledFields('src/components/business/ActorCardDecorationProfileHeroFields.vue', { options })
  fields.update('英文小标题', ''); fields.update('姓名字号', 112); fields.update('姓名行高', 130)
  fields.update('资料字段', ['role','weight']); fields.update('体重单位', 'kg'); fields.update('英文小标题颜色', '#123456')
  assert.deepEqual(fields.events, [['eyebrow',''],['nameFontSize',112],['nameLineHeight',130],['metaFields',['role','weight']],['weightUnit','kg'],['eyebrowColor','#123456']])
  for (const [label,value] of [['姓名字号',121],['姓名行高',50],['资料字号',NaN],['英文小标题','<script>'],['角色称谓','演员\n伪造'],['资料字段',['height','height']],['资料字段',['contact']],['体重单位','lb'],['英文小标题颜色','url(secret)']]) fields.update(label,value)
  assert.equal(fields.events.length, 6); assert.deepEqual(options, before); fields.unmount()
})
test('profileHero and overlay fields cannot emit edits through a disabled property panel', () => {
  const identity = mountedControlledFields('src/components/business/ActorCardDecorationProfileHeroFields.vue', { disabled: true })
  identity.update('姓名字号', 110); assert.deepEqual(identity.events, []); identity.unmount()
  const overlay = mountedControlledFields('src/components/business/ActorCardDecorationOverlayFields.vue', { disabled: true })
  overlay.update('启用首图遮罩', false); assert.deepEqual(overlay.events, []); overlay.unmount()
})
test('overlay controls preserve false and zero while rejecting CSS and opacity injection', () => {
  const value = { enabled: true, endOpacity: 24 }, before = clone(value)
  const fields = mountedControlledFields('src/components/business/ActorCardDecorationOverlayFields.vue', { value })
  fields.update('启用首图遮罩', false); fields.update('遮罩起始不透明度', 0); fields.update('遮罩结束不透明度', 100); fields.update('遮罩颜色', '#000000')
  assert.deepEqual(fields.events, [['enabled',false],['startOpacity',0],['endOpacity',100],['color','#000000']])
  for (const [label,v] of [['遮罩起始不透明度',101],['遮罩结束不透明度',-1],['遮罩结束不透明度',2.5],['启用首图遮罩','yes'],['遮罩颜色','red;position:fixed']]) fields.update(label,v)
  assert.equal(fields.events.length,4); assert.deepEqual(value,before); fields.unmount()
})
test('v2 preview consumes the current schema envelope and the per-actor badge without template text', async () => {
  const Preview = load('src/components/business/ActorCardDecorationPreview.vue').default
  const config = referencePreset(fixture())
  const card = { id: 3, profile: { name: '参考演员', height: '178', weight: '70', heroBadgeText: '演员自己的亮点' } }
  const html = await renderToString(createSSRApp(Preview, { config, card }))
  assert.match(html, /ACTOR PROFILE/); assert.match(html, /参考演员/); assert.match(html, /演员自己的亮点/)
  assert.doesNotMatch(html, /当前配置超出|示例文案/)
  const hidden = await renderToString(createSSRApp(Preview, { config, card: { id: 3, profile: { name: '参考演员', heroBadgeText: '' } } }))
  assert.doesNotMatch(hidden, /data-module="reference-promotion"/)
})

test('an authorized card with no profile never receives the sample actor or sample badge', () => {
  const { previewModel } = load('src/utils/actor-card-preview-model.ts')
  const model = previewModel({ id: 3, title: '仅卡标题' })
  assert.equal(model.profile.heroBadgeText, undefined)
  assert.equal(model.profile.name, null); assert.equal(model.profile.contact, null)
  assert.equal(model.profile.introduction, null)
})

// B12 review follow-up: actual DOM measurements must surface clipped actor text.
test('promotion DOM measurement detects clipped pills and too-short modules but ignores absent or empty text', () => {
  const file = 'src/utils/decoration-preview-overflow.ts'
  assert.ok(fs.existsSync(path.join(root, file)), 'preview overflow measurement must exist')
  const { hasDecorationPromotionHeightOverflow } = load(file)
  const module = { clientHeight: 125, clientTop: 0, get offsetHeight() { return this.clientHeight }, getBoundingClientRect() { return { top: 0, bottom: this.clientHeight, height: this.clientHeight } } }
  const pill = { textContent: '演员自己的亮点', scrollHeight: 132, clientHeight: 132, closest: () => module, getBoundingClientRect() { const height = this.offsetHeight || this.clientHeight; return { top: 0, bottom: height, height } } }
  const canvas = { querySelectorAll(selector) { assert.equal(selector, '.actor-card-decoration__promotion-pill'); return [pill] } }
  assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, 'two lines + padding exceed module rectangle')
  module.clientHeight = 200; pill.clientHeight = 125
  assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, 'inner pill itself can clip even if module is tall')
  pill.clientHeight = 132; assert.equal(hasDecorationPromotionHeightOverflow(canvas), false)
  pill.offsetHeight = 205; assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, 'pill borders also have to fit inside the hero rectangle')
  delete pill.offsetHeight
  module.clientHeight = 125; pill.textContent = '   '; assert.equal(hasDecorationPromotionHeightOverflow(canvas), false)
  assert.equal(hasDecorationPromotionHeightOverflow({ querySelectorAll: () => [] }), false)
  assert.equal(hasDecorationPromotionHeightOverflow(null), false)
})
test('preview announces insufficient promotion height and clears the alert after resize, config or actor text changes', async () => {
  const { nextTick, reactive } = require('vue')
  const Preview = load('src/components/business/ActorCardDecorationPreview.vue').default
  const state = reactive({ config: referencePreset(fixture()), card: { id: 3, profile: { name: '演员甲', heroBadgeText: '足够长的个人亮点用于触发第二行' } } })
  const elements = [], rect = { clientHeight: 125, clientTop: 0, get offsetHeight() { return this.clientHeight }, getBoundingClientRect() { return { top: 0, bottom: this.clientHeight, height: this.clientHeight } } }
  const pill = { textContent: '足够长的个人亮点用于触发第二行', scrollHeight: 132, clientHeight: 132, closest: () => rect, getBoundingClientRect() { return { top: 0, bottom: this.clientHeight, height: this.clientHeight } } }
  let measured = 0, resize
  const PreviousObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = class { constructor(callback) { resize = callback } observe() {} unobserve() {} disconnect() {} }
  const renderer = createRenderer({
    createElement: tag => { const node = { tag, children: [], props: {}, scrollHeight: 1500, parent: null, text: '', querySelectorAll: selector => { if (selector === '.actor-card-decoration__promotion-pill') { measured++; return state.card.profile.heroBadgeText.trim() ? [pill] : [] } return [] } }; elements.push(node); return node },
    createText: text => ({ text }), createComment: text => ({ text }),
    insert(node, parent, anchor) { if (node.parent) { const old = node.parent.children.indexOf(node); if (old >= 0) node.parent.children.splice(old, 1) } node.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; if (i < 0) parent.children.push(node); else parent.children.splice(i, 0, node) },
    remove(node) { if (node.parent) { const i = node.parent.children.indexOf(node); if (i >= 0) node.parent.children.splice(i, 1); node.parent = null } },
    setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
    parentNode: node => node.parent, nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
    patchProp: (node, key, _old, value) => { node.props[key] = value },
  })
  const app = renderer.createApp(defineComponent({ setup: () => () => h(Preview, { config: state.config, card: state.card }) }))
  const alert = () => elements.find(n => n.parent && n.props.role === 'alert' && /首图文案区域高度不足/.test(n.text))
  try {
    app.mount({ children: [] }); await nextTick(); await nextTick()
    assert.ok(alert(), 'actual preview must expose an accessible height warning')
    assert.match(alert().text, /增加高度.*减小字号.*内边距/)
    rect.clientHeight = 150; resize(); await nextTick(); assert.equal(alert(), undefined, 'ResizeObserver remeasures a now-fitting rectangle')
    rect.clientHeight = 125; state.config.modules.find(m => m.type === 'promotion').layout.height = 100
    await nextTick(); await nextTick(); await nextTick(); assert.ok(alert(), 'config changes remeasure even if outer hero size is unchanged')
    state.card.profile.heroBadgeText = ''; await nextTick(); await nextTick(); await nextTick(); assert.equal(alert(), undefined, 'empty actor badge removes the warning')
    state.card = { id: 4, profile: { name: '演员乙', heroBadgeText: '另一演员文案' } }; await nextTick(); await nextTick(); await nextTick(); assert.ok(alert(), 'switching the authorized actor remeasures its text')
    rect.clientHeight = 200; const layout = state.config.modules.find(m => m.type === 'promotion').layout; layout.y = 1100; layout.height = 200
    await nextTick(); await nextTick(); await nextTick(); assert.equal(alert(), undefined, 'restoring enough module height clears the warning')
    assert.ok(measured > 4)
  } finally { app.unmount(); globalThis.ResizeObserver = PreviousObserver }
})

test('promotion height warning accounts for actual top/bottom placement, borders and preview scale', () => {
  const { hasDecorationPromotionHeightOverflow } = load('src/utils/decoration-preview-overflow.ts')
  for (const scale of [1, 320 / 750, 0.1, 2]) {
    const module = { clientHeight: 125, offsetHeight: 125, clientTop: 0, getBoundingClientRect: () => ({ top: 500, bottom: 500 + 125 * scale, height: 125 * scale }) }
    let marginTop = 100, border = 0
    const pill = { textContent: '短文案', clientHeight: 90, scrollHeight: 90, get offsetHeight() { return 90 + border * 2 }, closest: () => module,
      getBoundingClientRect: () => ({ top: 500 + marginTop * scale, bottom: 500 + (marginTop + 90 + border * 2) * scale, height: (90 + border * 2) * scale }) }
    const canvas = { querySelectorAll: () => [pill] }
    assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, `marginTop100 clips a fitting 90px pill at scale ${scale}`)
    marginTop = 20; assert.equal(hasDecorationPromotionHeightOverflow(canvas), false, `ordinary placement fits at scale ${scale}`)
    marginTop = 30; border = 4; assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, `pill border crosses module bottom at scale ${scale}`)
    marginTop = -5; border = 0; assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, `pill above module top is clipped at scale ${scale}`)
    marginTop = 35.5; assert.equal(hasDecorationPromotionHeightOverflow(canvas), false, `half-layout-pixel rounding is tolerated at scale ${scale}`)
    marginTop = 37; assert.equal(hasDecorationPromotionHeightOverflow(canvas), true, `two-layout-pixel overflow is not masked by screen-space tolerance at scale ${scale}`)
    pill.textContent = ' '; assert.equal(hasDecorationPromotionHeightOverflow(canvas), false, 'empty text still never alerts')
  }
})
