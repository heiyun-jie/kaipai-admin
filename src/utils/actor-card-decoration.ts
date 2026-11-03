import type { DecorationConfig, DecorationModule, DecorationStyle, ProfileHeroIdentityOptions } from '../types/actor-card-decoration'
export const BASE_STYLE: Required<DecorationStyle> = {
  radius: 16, padding: 24, gap: 16, marginTop: 0, marginBottom: 0, fontSize: 28,
  lineHeight: 42, fontWeight: 400, borderWidth: 0, color: '#1F2937', backgroundColor: '#FFFFFF',
  borderColor: '#E5E7EB', shadow: 'none', align: 'left',
}
export const MODULE_LABELS = { identity: '身份摘要', highlights: '技能亮点', profile: '基础资料', introduction: '完整简介', works: '作品与经历', photos: '生活照片', stills: '作品剧照', video: '视频', pdf: 'PDF资料', cooperation: '合作联系', promotion: '演员独立文案胶囊' }
export const PRESENTATIONS: Record<DecorationModule['type'], string[]> = {
  identity: ['standard', 'profileHero'], highlights: ['chips'], profile: ['rows'], introduction: ['full', 'summary'],
  works: ['cards', 'list'], photos: ['grid', 'carousel'], stills: ['grid', 'carousel'],
  video: ['player', 'poster'], pdf: ['button', 'pages'], cooperation: ['contact'], promotion: ['pill'],
}
export const PROFILE_HERO_DEFAULTS: Required<ProfileHeroIdentityOptions> = {
  eyebrow: 'ACTOR PROFILE', eyebrowFontSize: 28, eyebrowLetterSpacing: 6, eyebrowColor: '#D8E0EA',
  nameFontSize: 104, nameLineHeight: 124, metaFontSize: 36, metaLineHeight: 48,
  roleLabel: '演员', metaFields: ['role', 'height', 'weight'], weightUnit: 'jin',
}

/** Pure, explicit v2 opt-in. Errors leave the entire authoring draft untouched. */
export function applyReferenceProfileHeroPreset(input: DecorationConfig): DecorationConfig {
  const config: DecorationConfig = JSON.parse(JSON.stringify(input))
  const height = config.hero?.height ?? 1334
  if (!Number.isInteger(height) || height < 450 || height > 1800) throw new Error('参考首图需要 450–1800 rpx 的整数高度，请先调整首图高度。')
  const heroIdentity = config.modules.filter(m => m.type === 'identity' && m.layout?.zone === 'hero')
  const promotions = config.modules.filter(m => m.type === 'promotion')
  const heroSkills = config.modules.filter(m => m.type === 'highlights' && m.layout?.zone === 'hero')
  const hasFlowSkills = config.modules.some(m => m.type === 'highlights' && m.layout?.zone !== 'hero')
  const count = config.modules.length + (heroIdentity.length ? 0 : 1) + (promotions.length ? 0 : 1) - (hasFlowSkills ? heroSkills.length : 0)
  if (count > 16) throw new Error('应用后模块数量超过 16，未应用参考样式；请先整理模块。')
  const ids = new Set<string>(), zones = new Set<string>()
  for (const m of config.modules) {
    const zoneType = `${m.layout?.zone ?? 'flow'}:${m.type}`
    if (ids.has(m.id) || zones.has(zoneType)) throw new Error('模块 ID 或区域类型重复冲突，请先整理后再应用。')
    ids.add(m.id); zones.add(zoneType)
    if (m.type === 'promotion' && m.layout?.zone !== 'hero') throw new Error('文案胶囊只能位于首图，当前模块区域冲突。')
  }
  function availableId(id: string) {
    if (ids.has(id)) throw new Error(`模块 ID ${id} 已占用，未应用参考样式。`)
    ids.add(id); return id
  }
  const identity: DecorationModule = heroIdentity[0] ?? { id: availableId('reference-identity'), type: 'identity' }
  const promotion: DecorationModule = promotions[0] ?? { id: availableId('reference-promotion'), type: 'promotion' }
  identity.enabled = true; identity.presentation = 'profileHero'; delete identity.maxLines
  identity.identityOptions = JSON.parse(JSON.stringify(PROFILE_HERO_DEFAULTS))
  identity.layout = { zone: 'hero', x: 40, y: height - 450, width: 670, height: 300, zIndex: 2 }
  identity.style = { ...BASE_STYLE, radius: 0, padding: 0, gap: 0, color: '#FFFFFF', backgroundColor: 'transparent', fontWeight: 600 }
  promotion.enabled = true; promotion.presentation = 'pill'; delete promotion.maxLines; delete promotion.identityOptions
  promotion.layout = { zone: 'hero', x: 40, y: height - 135, width: 670, height: 125, zIndex: 3 }
  promotion.style = { ...BASE_STYLE, backgroundColor: '#3266FF', color: '#FFFFFF', radius: 96, padding: 24, fontSize: 32, lineHeight: 42, fontWeight: 600 }
  const next = config.modules.filter(m => !(hasFlowSkills && heroSkills.includes(m)))
  const flowOrder = Math.max(0, ...next.filter(m => m.layout?.zone !== 'hero').map(m => m.order ?? 0))
  if (!hasFlowSkills && heroSkills.length) {
    if (flowOrder >= 10000) throw new Error('正文排序已达上限，无法保留技能顺序，请先调整正文排序。')
    heroSkills[0].layout = { zone: 'flow' }; heroSkills[0].order = Math.min(10000, flowOrder + 10)
  }
  if (!heroIdentity.length) next.push(identity)
  if (!promotions.length) next.push(promotion)
  // Retain other hero content, but never hide it behind the new information group.
  for (const m of next) {
    const l = m.layout
    if (!l || l.zone !== 'hero' || m === identity || m === promotion) continue
    if (![l.x, l.y, l.width, l.height].every(v => Number.isInteger(v)) || l.x! < 0 || l.y! < 0 || l.width! < 1 || l.height! < 1 || l.x! + l.width! > 750 || l.y! + l.height! > height) throw new Error(`首图模块 ${m.id} 边界冲突，请先调整位置。`)
    if (m.enabled === false) continue
    for (const target of [identity.layout, promotion.layout]) {
      if (l.x! < target.x! + target.width! && l.x! + l.width! > target.x! && l.y! < target.y! + target.height! && l.y! + l.height! > target.y!) throw new Error(`首图模块 ${m.id} 与参考信息区重叠冲突，请先移动该模块。`)
    }
  }
  config.schemaVersion = 2; config.minRendererVersion = 2
  config.hero = { ...config.hero, height, overlay: { enabled: true, color: '#0F172A', startOpacity: 6, endOpacity: 24 } }
  config.modules = next
  return config
}
export function effectiveStyle(config: DecorationConfig, module: DecorationModule): Required<DecorationStyle> {
  return { ...BASE_STYLE, ...config.defaults, ...module.style }
}
export function sortedModules(config: DecorationConfig, zone: 'hero' | 'flow') {
  return config.modules.filter(m => (m.layout?.zone ?? 'flow') === zone).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
export function moveModule(config: DecorationConfig, id: string, direction: -1 | 1): void {
  const module = config.modules.find(m => m.id === id)
  if (!module) return
  const peers = sortedModules(config, module.layout?.zone ?? 'flow')
  const from = peers.indexOf(module), to = from + direction
  if (to < 0 || to >= peers.length) return
  peers.splice(to, 0, ...peers.splice(from, 1))
  peers.forEach((m, i) => { m.order = i * 10 })
}
export function clearStyleOverride(module: DecorationModule, key: keyof DecorationStyle): void {
  if (!module.style) return
  delete module.style[key]
  if (!Object.keys(module.style).length) delete module.style
}
/** Pointer deltas are screen pixels; storage remains integer 750-design units. */
export function dragHeroPosition(config: DecorationConfig, module: DecorationModule, origin: { x: number; y: number }, dx: number, dy: number, canvasWidth: number): { x: number; y: number } | null {
  const l = module.layout
  const height = config.hero?.height ?? 1334
  if (module.enabled === false || l?.zone !== 'hero' || ![origin.x, origin.y, dx, dy, canvasWidth, l.width, l.height, height].every(v => typeof v === 'number' && Number.isFinite(v)) || canvasWidth <= 0 || !l.width || !l.height || l.width > 750 || l.height > height) return null
  return { x: Math.round(Math.max(0, Math.min(750 - l.width, origin.x + dx * 750 / canvasWidth))), y: Math.round(Math.max(0, Math.min(height - l.height, origin.y + dy * 750 / canvasWidth))) }
}
const bounded = (value: number | undefined, fallback: number, min = 0, max = 1800) => Number.isInteger(value) ? Math.min(max, Math.max(min, value!)) : fallback
export function safeColor(value: string | undefined, fallback: string, transparent = false) {
  return value && (/^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value) || (transparent && value === 'transparent')) ? value : fallback
}
export function moduleCss(config: DecorationConfig, module: DecorationModule, scale: number): Record<string, string | number> {
  const s = effectiveStyle(config, module), l = module.layout ?? {}, hero = l.zone === 'hero'
  const px = (v: number) => `${v * scale}px`
  const width = hero ? bounded(l.width, 600, 1, 750) : bounded(l.width, 750 - 2 * (config.page?.contentPadding ?? 24), 1, 750)
  const css: Record<string, string | number> = {
    boxSizing: 'border-box', width: px(width), borderRadius: px(bounded(s.radius, 16, 0, 96)),
    padding: px(bounded(s.padding, 24, 0, 96)), gap: px(bounded(s.gap, 16, 0, 96)),
    marginTop: px(bounded(s.marginTop, 0, 0, 160)), marginBottom: px(bounded(s.marginBottom, 0, 0, 160)),
    fontSize: px(bounded(s.fontSize, 28, 16, 72)), lineHeight: px(bounded(s.lineHeight, 42, 24, 120)),
    fontWeight: [400, 500, 600, 700].includes(s.fontWeight) ? s.fontWeight : 400,
    color: safeColor(s.color, BASE_STYLE.color), backgroundColor: safeColor(s.backgroundColor, BASE_STYLE.backgroundColor, true),
    border: `${px(bounded(s.borderWidth, 0, 0, 8))} solid ${safeColor(s.borderColor, BASE_STYLE.borderColor, true)}`,
    textAlign: ['left', 'center', 'right'].includes(s.align) ? s.align : 'left',
    boxShadow: s.shadow === 'soft' ? `0 ${px(8)} ${px(24)} rgba(15, 23, 42, 0.10)` : s.shadow === 'medium' ? `0 ${px(14)} ${px(38)} rgba(15, 23, 42, 0.18)` : 'none',
    alignItems: s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
  }
  if (hero) Object.assign(css, { position: 'absolute', left: px(bounded(l.x, 0)), top: px(bounded(l.y, 0)), height: px(bounded(l.height, 200)), zIndex: bounded(l.zIndex, 0, 0, 20), overflow: 'hidden' })
  else Object.assign(css, { marginLeft: l.align === 'center' || l.align === 'right' ? 'auto' : '0', marginRight: l.align === 'center' ? 'auto' : '0' })
  return css
}
