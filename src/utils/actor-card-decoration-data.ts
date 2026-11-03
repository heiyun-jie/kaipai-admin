import type { DecorationModule } from '../types/actor-card-decoration'
import type { DecorationCardPreview } from '../types/actor-card-decoration-binding'
const nonblank = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== ''
const remote = (v: unknown) => typeof v === 'string' && /^https:\/\//i.test(v)
export function realModuleVisible(module: DecorationModule, card: DecorationCardPreview): boolean {
  if (module.enabled === false) return false
  const p = card.profile ?? {}
  switch (module.type) {
    case 'identity': return nonblank(p.name || card.title)
    case 'promotion': return nonblank(p.heroBadgeText)
    case 'highlights': return [...(p.skills ?? []), ...(p.skillGroups?.specialty ?? []), ...(p.skillGroups?.professionalAbility ?? []), ...(p.skillGroups?.roleType ?? [])].some(nonblank)
    case 'profile': return [p.gender, p.age, p.height, p.weight, p.city, p.school, p.bodyType, p.hairStyle, ...(p.languages ?? [])].some(nonblank)
    case 'introduction': return nonblank(p.introduction)
    case 'works': return Boolean(card.works?.length)
    case 'photos': return Boolean(card.photos?.some(remote))
    case 'stills': return Boolean(card.works?.some(w => w.stills?.some(remote)))
    case 'video': return card.settings?.showVideo !== false && remote(card.video?.url)
    case 'pdf': return card.settings?.showAttachment !== false && Boolean(card.attachment)
    case 'cooperation': return card.settings?.showContact !== false && nonblank(p.contact)
  }
}
