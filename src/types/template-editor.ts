import type { StyleValue } from 'vue'
import type { CreateTemplatePayload, UpdateTemplatePayload } from './content'

export type TemplateSegmentKey = 'all' | 'draft' | 'published' | 'disabled'
export type TemplateViewMode = 'gallery' | 'table'
export type ThemeColorKey = 'primary' | 'accent' | 'background' | 'text' | 'heroText'
export type PageLayoutPreset = 'magazine' | 'portfolio' | 'casting'
export type PageLayoutVariant = 'magazine' | 'spacious' | 'compact'
export type PageSurface = 'paper' | 'softlight' | 'cinema'
export type PageDensity = 'compact' | 'balanced' | 'immersive'
export type HeroStyle = 'editorial' | 'poster' | 'profile'
export type PrimaryAction = 'contact' | 'save' | 'apply'
export type SecondaryAction = 'none' | 'share' | 'poster'

export type EditorFormState = CreateTemplatePayload & UpdateTemplatePayload
export type ThemeConfigState = Record<ThemeColorKey, string>
export type TemplatePreviewStyle = StyleValue

export interface ArtifactConfigState {
  coverImage: string
  heroEyebrow: string
  focus1: string
  focus2: string
  focus3: string
  shareCardEnabled: boolean
  shareCardRatio: string
  posterEnabled: boolean
  posterRatio: string
}

export interface PageConfigState {
  layoutPreset: PageLayoutPreset
  surface: PageSurface
  density: PageDensity
  heroStyle: HeroStyle
  showProfile: boolean
  showStats: boolean
  showTimeline: boolean
  showContactCta: boolean
  primaryAction: PrimaryAction
  secondaryAction: SecondaryAction
}

export interface TemplateSegmentOption {
  key: TemplateSegmentKey
  label: string
  count: number
}

export interface TemplateOverviewStat {
  label: string
  value: string | number
}

export interface TemplateColorField {
  key: ThemeColorKey
  label: string
}

export interface TemplateConfigOption<T extends string = string> {
  key: T
  label: string
  description?: string
}

export interface TemplateStatusMeta {
  label: string
  tone: 'info' | 'warning' | 'success' | 'danger'
}

export interface TemplatePreviewStatItem {
  label: string
  value: string
}

export interface TemplatePreviewTimelineItem {
  title: string
  description: string
}

export interface TemplateToggleItem {
  key: string
  label: string
  description: string
  value: boolean
}
