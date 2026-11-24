import { fetchTemplates } from '@/api/content'

/**
 * 00-267: 演员卡风格 = 后台「风格模板」场景码（card_scene_template.template_scene_code）。
 * 旧版小程序写死的 ancient 对应模板 costume；fresh 等无模板的旧分类只用于展示与改归。
 */
export interface ActorCardStyleOption {
  value: string
  label: string
  enabled: boolean
}

const FALLBACK_LABELS: Record<string, string> = {
  classic: '经典',
  urban: '都市',
  costume: '古风',
  commercial: '商业',
  artistic: '艺术',
  fresh: '清新',
}

export function normalizeActorCardStyle(style?: string | null): string {
  const value = (style ?? '').trim()
  return value === 'ancient' ? 'costume' : value
}

/** 按后台排序返回全部风格模板（含停用），同一场景码只取第一个。 */
export async function loadActorCardStyleOptions(): Promise<ActorCardStyleOption[]> {
  const page = await fetchTemplates({ pageNo: 1, pageSize: 100 })
  const seen = new Set<string>()
  return [...page.list]
    .sort((a, b) => (a.sortNo ?? 0) - (b.sortNo ?? 0))
    .filter((item) => item.templateSceneCode && !seen.has(item.templateSceneCode) && seen.add(item.templateSceneCode))
    .map((item) => ({
      value: item.templateSceneCode,
      label: item.templateName?.trim() || FALLBACK_LABELS[item.templateSceneCode] || item.templateSceneCode,
      enabled: item.status === 1,
    }))
}

export function actorCardStyleLabel(style?: string | null, options: ActorCardStyleOption[] = []): string {
  const key = normalizeActorCardStyle(style)
  if (!key) {
    return '未选风格'
  }
  return options.find((item) => item.value === key)?.label || FALLBACK_LABELS[key] || key
}

export function isLegacyActorCardStyle(style: string, options: ActorCardStyleOption[]): boolean {
  return !!style && !options.some((item) => item.value === normalizeActorCardStyle(style))
}
