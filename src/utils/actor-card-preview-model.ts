import type { ActorCardRenderModel } from '../generated/actor-card-decoration/actor-card-render-model'
import type { DecorationCardPreview } from '../types/actor-card-decoration-binding'

/** Same renderer input contract for sample/authorized data; never inject private placeholder contacts. */
export function previewModel(card?: DecorationCardPreview | null, backgroundUrl?: string): ActorCardRenderModel {
  const p = card?.profile
  return {
    id: card?.id ?? 0, title: card?.title ?? '示例演员', style: null,
    previewImageUrl: backgroundUrl || card?.previewImageUrl || null, backgroundImageUrl: null,
    profile: card ? { ...p, name: p?.name ?? null, height: p?.height ?? null, city: p?.city ?? null, school: p?.school ?? null,
      contact: p?.contact ?? null, introduction: p?.introduction ?? null } : {
      name: '示例演员', gender: 'female', age: 26, height: '172', weight: '55', city: '北京', school: '示例艺术院校',
      heroBadgeText: '示例文案 · 可填写演艺亮点',
      bodyType: '匀称', hairStyle: '长发', languages: ['普通话', '英语'], skills: ['表演', '舞蹈', '台词'],
      contact: null, introduction: '这是一份用于装修排版的示例资料。擅长角色塑造与舞台表演，持续积累镜头和舞台经验。\n完整简介按小程序相同规则自然换行，不截断正文。',
    },
    works: (card ? card.works ?? [] : [{ id: 1, title: '示例影视作品', role: '主要角色', workType: '电视剧', stills: [] }])
      .map((w, i) => ({ ...w, id: w.id ?? i + 1, title: w.title ?? null, role: w.role ?? null, workType: w.workType ?? null, stills: w.stills ?? [] })),
    photos: card?.photos ?? [], video: card?.video?.url ? { url: card.video.url } : null,
    attachment: card?.attachment ? { assetId: card.attachment.assetId ?? 0, filename: card.attachment.filename ?? null, pageImages: card.attachment.pageImages ?? [] } : null,
    settings: { showContact: card?.settings?.showContact ?? false, showVideo: card?.settings?.showVideo ?? true, showAttachment: card?.settings?.showAttachment ?? true, order: [] },
  }
}
