const SCENE_DISPLAY_LABELS: Record<string, string> = {
  classic: '经典',
  urban: '都市',
  costume: '古代',
  commercial: '商业',
  artistic: '艺术',
}

export function resolveShareCardSceneDisplayLabel(templateSceneCode?: string | null, templateName?: string | null): string {
  if (templateName && templateName.trim()) {
    return templateName.trim()
  }
  if (!templateSceneCode || !templateSceneCode.trim()) {
    return '--'
  }
  const normalizedTemplateSceneCode = templateSceneCode.trim()
  return SCENE_DISPLAY_LABELS[normalizedTemplateSceneCode] || normalizedTemplateSceneCode
}
