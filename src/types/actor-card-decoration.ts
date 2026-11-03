export type ModuleType = 'identity' | 'highlights' | 'profile' | 'introduction' | 'works' | 'photos' | 'stills' | 'video' | 'pdf' | 'cooperation' | 'promotion'
export type Align = 'left' | 'center' | 'right'
export type ProfileHeroMetaField = 'role' | 'gender' | 'age' | 'height' | 'weight' | 'city'
export interface ProfileHeroIdentityOptions {
  eyebrow?: string; eyebrowFontSize?: number; eyebrowLetterSpacing?: number; eyebrowColor?: string
  nameFontSize?: number; nameLineHeight?: number; metaFontSize?: number; metaLineHeight?: number
  roleLabel?: string; metaFields?: ProfileHeroMetaField[]; weightUnit?: 'kg' | 'jin'
}
export interface DecorationHeroOverlay { enabled?: boolean; color?: string; startOpacity?: number; endOpacity?: number }
export interface DecorationStyle {
  radius?: number; padding?: number; gap?: number; marginTop?: number; marginBottom?: number
  fontSize?: number; lineHeight?: number; fontWeight?: number; borderWidth?: number
  color?: string; backgroundColor?: string; borderColor?: string; shadow?: 'none' | 'soft' | 'medium'; align?: Align
}
export interface DecorationModule {
  id: string; type: ModuleType; enabled?: boolean; order?: number; presentation?: string; maxLines?: number
  layout?: { zone?: 'hero' | 'flow'; width?: number; align?: Align; x?: number; y?: number; height?: number; zIndex?: number }
  style?: DecorationStyle
  identityOptions?: ProfileHeroIdentityOptions
}
export interface DecorationConfig {
  schemaVersion: 1 | 2; minRendererVersion?: 1 | 2
  page?: { backgroundColor?: string; contentPadding?: number; gap?: number }
  hero?: { height?: number; focalX?: number; focalY?: number; overlay?: DecorationHeroOverlay }
  defaults?: DecorationStyle; modules: DecorationModule[]
}
export interface DecorationDraft {
  templateId: number; revision: number; activeVersion: number | null
  config: DecorationConfig; preview: DecorationConfig
}
export interface DecorationVersion {
  versionId: number; versionNo: number; checksum: string; note: string; publishedBy: number; publishedAt: string
}
export interface DecorationApi {
  load(id: number): Promise<DecorationDraft>
  history(id: number): Promise<DecorationVersion[]>
  save(id: number, payload: { expectedRevision: number; config: DecorationConfig }): Promise<DecorationDraft>
  preview(id: number, config: DecorationConfig): Promise<DecorationConfig>
  publish(id: number, payload: { expectedRevision: number; note: string }): Promise<DecorationDraft>
  activate(id: number, version: number, payload: { expectedRevision: number; note: string }): Promise<DecorationDraft>
}
