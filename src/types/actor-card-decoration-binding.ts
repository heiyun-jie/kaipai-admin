import type { DecorationConfig } from './actor-card-decoration'
export type DecorationSource = { generationMode: 'person_ai' } | { generationMode: 'person_background_ai'; backgroundId: number }
export interface DecorationBinding {
  sourceType: 'default' | 'background'; sourceId: number; revision: number
  templateId: number | null; versionId: number | null; templateVersion: number | null; updatedAt?: string
}
export interface DecorationEnvelope { versionId: number; templateId: number; templateVersion: number; schemaVersion: number; config: DecorationConfig }
export interface DecorationCardPreview {
  id: number; title?: string; previewImageUrl?: string; decoration?: DecorationEnvelope | null
  profile?: { name?: string; gender?: string; age?: number; height?: string; weight?: string; city?: string; school?: string; bodyType?: string; hairStyle?: string; languages?: string[]; skills?: string[]; skillGroups?: { specialty?: string[]; professionalAbility?: string[]; roleType?: string[] }; introduction?: string; contact?: string; heroBadgeText?: string }
  works?: Array<{ id?: number; title?: string; role?: string; workType?: string; stills?: string[] }>; photos?: string[]
  video?: { url?: string } | null; attachment?: { assetId?: number; filename?: string; pageImages?: string[] } | null
  settings?: { showContact?: boolean; showVideo?: boolean; showAttachment?: boolean }
}
export interface DecorationBindingApi {
  load(source: DecorationSource): Promise<DecorationBinding | null>
  save(source: DecorationSource, payload: { expectedRevision: number; templateId: number; versionId: number; note: string }): Promise<DecorationBinding>
  preview(cardId: number, source: DecorationSource): Promise<DecorationCardPreview>
}
