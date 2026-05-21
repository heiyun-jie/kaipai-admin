import type { PageResult } from './common'

export interface TemplateListQuery {
  templateSceneCode?: string
  status?: number
  tier?: string
  pageNo: number
  pageSize: number
}

export interface TemplatePublishLogQuery {
  pageNo: number
  pageSize: number
  templateId?: number
  publishVersion?: string
  actionType?: string
  publishedBy?: number
  publishedAtFrom?: string
  publishedAtTo?: string
}

export interface ThemeTokenQuery {
  pageNo: number
  pageSize: number
  templateSceneCode?: string
  status?: number
  templateId?: number
  templateCode?: string
}

export interface ShareArtifactQuery {
  pageNo: number
  pageSize: number
  templateSceneCode?: string
  status?: number
  templateId?: number
  templateCode?: string
}

export interface ContentContactRequestQuery {
  pageNo: number
  pageSize: number
  requestId?: number
  shareCardId?: number
  holderUserId?: number
  viewerUserId?: number
  templateSceneCode?: string
  status?: string
  requestedAtFrom?: string
  requestedAtTo?: string
}

export interface ContentShareCardGovernanceQuery {
  pageNo: number
  pageSize: number
  shareCardId?: number
  holderUserId?: number
  templateSceneCode?: string
  shareStatus?: string
  defaultCard?: boolean
}

export interface ContentContactRequestItem {
  requestId: number
  shareCardId?: number | null
  templateSceneCode?: string | null
  templateName?: string | null
  status?: string | null
  holderUserId?: number | null
  ownerName?: string | null
  ownerPhone?: string | null
  viewerUserId?: number | null
  viewerName?: string | null
  viewerPhone?: string | null
  requestedAt?: string | null
  decidedAt?: string | null
}

export interface ContentContactRequestDetail {
  requestInfo?: {
    requestId?: number | null
    status?: string | null
    templateName?: string | null
    applicantNote?: string | null
    decisionNote?: string | null
    requestedAt?: string | null
    decidedAt?: string | null
  } | null
  cardInfo?: {
    shareCardId?: number | null
    profileUserId?: number | null
    templateSceneCode?: string | null
    shareStatus?: string | null
    defaultCard?: boolean | null
  } | null
  ownerInfo?: {
    userId?: number | null
    userName?: string | null
    nickName?: string | null
    displayName?: string | null
    phone?: string | null
    avatarUrl?: string | null
    realAuthStatus?: number | null
    validInviteCount?: number | null
  } | null
  viewerInfo?: {
    userId?: number | null
    userName?: string | null
    nickName?: string | null
    displayName?: string | null
    phone?: string | null
    avatarUrl?: string | null
    realAuthStatus?: number | null
    validInviteCount?: number | null
  } | null
}

export interface ContentShareCardGovernanceItem {
  shareCardId: number
  holderUserId?: number | null
  ownerName?: string | null
  ownerPhone?: string | null
  templateSceneCode?: string | null
  templateName?: string | null
  shareStatus?: string | null
  defaultCard?: boolean | null
  profileUserId?: number | null
  templateId?: number | null
  configId?: number | null
  bindingConsistent?: boolean | null
  issueCount?: number | null
  historyCount?: number | null
  totalContactRequestCount?: number | null
  pendingContactRequestCount?: number | null
  approvedContactRequestCount?: number | null
  createTime?: string | null
  lastUpdate?: string | null
}

export interface ContentShareCardGovernanceDetail {
  cardInfo?: {
    shareCardId?: number | null
    templateSceneCode?: string | null
    templateName?: string | null
    shareStatus?: string | null
    defaultCard?: boolean | null
    profileUserId?: number | null
    templateId?: number | null
    configId?: number | null
    createTime?: string | null
    lastUpdate?: string | null
  } | null
  ownerInfo?: {
    userId?: number | null
    userName?: string | null
    nickName?: string | null
    displayName?: string | null
    phone?: string | null
    avatarUrl?: string | null
    realAuthStatus?: number | null
    validInviteCount?: number | null
  } | null
  bindingInfo?: {
    configId?: number | null
    configTemplateSceneCode?: string | null
    configProfileUserId?: number | null
    configTemplateId?: number | null
    bindingConsistent?: boolean | null
    issues?: string[] | null
  } | null
  statsInfo?: {
    historyCount?: number | null
    totalContactRequestCount?: number | null
    pendingContactRequestCount?: number | null
    approvedContactRequestCount?: number | null
    rejectedContactRequestCount?: number | null
    latestViewedAt?: string | null
    latestRequestedAt?: string | null
  } | null
}

export interface TemplateItem {
  templateId: number
  templateCode: string
  templateSceneCode: string
  templateName: string
  tier?: string
  requiredLevel?: number
  requiredInviteCount?: number
  unlockRequired?: boolean
  status: number
  sortNo?: number
  updateTime?: string
}

export interface TemplateDetail extends TemplateItem {
  description?: string
  layoutVariant?: string
  baseThemeJson?: string
  artifactPresetJson?: string
  createUserName?: string
  createTime?: string
  updateUserName?: string
  lastUpdate?: string
  publishLogs?: unknown[]
}

export interface TemplatePublishLogItem {
  publishLogId: number
  templateId?: number | null
  targetType?: string | null
  targetCode?: string | null
  publishVersion?: string | null
  draftVersion?: string | null
  sourceVersion?: string | null
  targetVersion?: string | null
  actionType?: string | null
  publishedBy?: number | null
  publishNote?: string | null
  diffSummaryJson?: string | null
  snapshotJson?: string | null
  publishedAt?: string | null
}

export interface ThemeTokenItem {
  templateId: number
  templateCode?: string | null
  templateSceneCode?: string | null
  templateName?: string | null
  status?: number | null
  baseThemeJson?: string | null
  updateTime?: string | null
}

export interface ThemeTokenUpdatePayload {
  baseThemeJson: string
}

export interface ShareArtifactItem {
  templateId: number
  templateCode?: string | null
  templateSceneCode?: string | null
  templateName?: string | null
  status?: number | null
  artifactPresetJson?: string | null
  updateTime?: string | null
}

export interface ShareArtifactUpdatePayload {
  artifactPresetJson: string
}

export interface ContactRequestDecisionPayload {
  decisionNote?: string
}

export interface TemplateCreatePayload {
  templateCode: string
  templateSceneCode: string
  templateName: string
  description?: string
  layoutVariant?: string
  tier?: string
  requiredLevel?: number
  requiredInviteCount?: number
  unlockRequired?: boolean
  baseThemeJson?: string
  artifactPresetJson?: string
}

export interface TemplateUpdatePayload {
  templateName?: string
  description?: string
  layoutVariant?: string
  tier?: string
  requiredLevel?: number
  requiredInviteCount?: number
  unlockRequired?: boolean
  baseThemeJson?: string
  artifactPresetJson?: string
}

export interface TemplateSortPayload {
  sortNo: number
}

export interface TemplatePublishPayload {
  publishVersion?: string
  publishNote?: string
}

export interface TemplateRollbackPayload {
  sourceVersion: string
  publishNote?: string
}

export type TemplatePageResult = PageResult<TemplateItem>
export type TemplatePublishLogPageResult = PageResult<TemplatePublishLogItem>
export type ThemeTokenPageResult = PageResult<ThemeTokenItem>
export type ShareArtifactPageResult = PageResult<ShareArtifactItem>
export type ContentContactRequestPageResult = PageResult<ContentContactRequestItem>
export type ContentShareCardGovernancePageResult = PageResult<ContentShareCardGovernanceItem>
export type TemplateQuery = TemplateListQuery
export type CreateTemplatePayload = TemplateCreatePayload
export type UpdateTemplatePayload = TemplateUpdatePayload
export type SortTemplatePayload = TemplateSortPayload
export type TemplateDetailPayload = TemplateDetail
export type PublishTemplatePayload = TemplatePublishPayload
export type RollbackTemplatePayload = TemplateRollbackPayload
