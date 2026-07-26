import type { PageResult } from './common'

export interface AdminAiResumePatch {
  patchId: string
  fieldType: string
  fieldKey: string
  label: string
  targetId?: string | null
  beforeValue?: string | null
  afterValue?: string | null
  reason?: string | null
  status?: string | null
}

export interface AdminAiResumeFieldSnapshot {
  fieldKey: string
  value?: string | null
}

export interface AdminAiResumeHistoryItem {
  historyId: string
  userId: number
  userName: string
  phone?: string | null
  realAuthStatus?: number | null
  level?: number | null
  draftId: string
  requestId: string
  conversationId: string
  instruction: string
  reply: string
  status: string
  patchCount: number
  patches: AdminAiResumePatch[]
  beforeSnapshot: AdminAiResumeFieldSnapshot[]
  afterSnapshot: AdminAiResumeFieldSnapshot[]
  createdAt?: string | null
  appliedAt?: string | null
  rolledBackAt?: string | null
}

export interface AdminAiResumeFailureItem {
  failureId: string
  userId: number
  userName: string
  phone?: string | null
  realAuthStatus?: number | null
  level?: number | null
  requestId?: string | null
  conversationId?: string | null
  instruction?: string | null
  errorCode?: number | null
  errorMessage?: string | null
  failureType?: string | null
  hitKeyword?: string | null
  handlingStatus?: string | null
  handlingNote?: string | null
  handledByAdminId?: number | null
  handledByAdminName?: string | null
  assignedAdminId?: number | null
  assignedAdminName?: string | null
  assignedAt?: string | null
  escalationRoleCode?: string | null
  escalationRoleName?: string | null
  assignmentAcknowledgedByAdminId?: number | null
  assignmentAcknowledgedByAdminName?: string | null
  assignmentAcknowledgedAt?: string | null
  reminderCount?: number | null
  lastRemindedByAdminId?: number | null
  lastRemindedByAdminName?: string | null
  lastRemindedAt?: string | null
  claimDeadlineAt?: string | null
  collaborationStatus?: string | null
  notificationStatus?: string | null
  notificationDeliveryId?: number | null
  notificationSourceType?: string | null
  notificationChannelCode?: string | null
  notificationRecipient?: string | null
  notificationProviderCode?: string | null
  notificationProviderMessageId?: string | null
  notificationSentAt?: string | null
  notificationFailureReason?: string | null
  notificationReceiptStatus?: string | null
  notificationReceiptSourceType?: string | null
  notificationReceiptAt?: string | null
  notificationReceiptFailureReason?: string | null
  autoRemindStage?: string | null
  slaStatus?: string | null
  manualTakeoverByAdminId?: number | null
  manualTakeoverByAdminName?: string | null
  manualTakeoverAt?: string | null
  autoRemindSkippedByAdminId?: number | null
  autoRemindSkippedByAdminName?: string | null
  autoRemindSkippedAt?: string | null
  handledAt?: string | null
  createdAt?: string | null
  handlingNotes?: AdminAiResumeFailureHandlingNote[]
}

export interface AdminAiResumeFailureHandlingNote {
  actionType?: string | null
  handlingStatus?: string | null
  handlingNote?: string | null
  handledByAdminId?: number | null
  handledByAdminName?: string | null
  assignedAdminId?: number | null
  assignedAdminName?: string | null
  assignedAt?: string | null
  escalationRoleCode?: string | null
  escalationRoleName?: string | null
  assignmentAcknowledgedByAdminId?: number | null
  assignmentAcknowledgedByAdminName?: string | null
  assignmentAcknowledgedAt?: string | null
  notificationStatus?: string | null
  notificationDeliveryId?: number | null
  notificationSourceType?: string | null
  notificationChannelCode?: string | null
  notificationRecipient?: string | null
  notificationProviderCode?: string | null
  notificationProviderMessageId?: string | null
  notificationSentAt?: string | null
  notificationFailureReason?: string | null
  notificationReceiptStatus?: string | null
  notificationReceiptSourceType?: string | null
  notificationReceiptAt?: string | null
  notificationReceiptFailureReason?: string | null
  reminderCount?: number | null
  lastRemindedByAdminId?: number | null
  lastRemindedByAdminName?: string | null
  lastRemindedAt?: string | null
  manualTakeoverByAdminId?: number | null
  manualTakeoverByAdminName?: string | null
  manualTakeoverAt?: string | null
  autoRemindSkippedByAdminId?: number | null
  autoRemindSkippedByAdminName?: string | null
  autoRemindSkippedAt?: string | null
  handledAt?: string | null
}

export interface AdminAiResumeFailureActionPayload {
  reason?: string
  assignedAdminId?: number
  escalationRoleCode?: string
  notificationStatus?: string
  notificationReceiptStatus?: string
}

export interface AdminAiResumeFailureQuery {
  userId?: number
  handlingStatus?: string
  failureType?: string
  keyword?: string
  requestId?: string
  assignedAdminId?: number
  escalationRoleCode?: string
  collaborationStatus?: string
  notificationStatus?: string
  notificationReceiptStatus?: string
  autoRemindStage?: string
  slaStatus?: string
  limit?: number
}

export interface AdminAiResumeFailureAssigneeOption {
  adminUserId: number
  userName: string
  account?: string | null
  roleCodes?: string[]
  roleNames?: string[]
}

export interface AdminAiResumeFailureEscalationRoleOption {
  adminRoleId: number
  roleCode: string
  roleName: string
  permissionStage?: string | null
}

export interface AdminAiResumeFailureCollaborationCatalog {
  assigneeOptions: AdminAiResumeFailureAssigneeOption[]
  escalationRoleOptions: AdminAiResumeFailureEscalationRoleOption[]
}

export interface AdminAiResumeQuotaUser {
  userId: number
  userName: string
  phone?: string | null
  realAuthStatus?: number | null
  level?: number | null
  totalQuota?: number | null
  usedCount: number
}

export interface AdminAiResumeOverview {
  totalHistoryCount: number
  appliedHistoryCount: number
  rolledBackHistoryCount: number
  historyUserCount: number
  currentMonthHistoryCount: number
  currentMonthQuotaUserCount: number
  currentMonthQuotaUsageTotal: number
  topQuotaUsers: AdminAiResumeQuotaUser[]
  recentHistories: AdminAiResumeHistoryItem[]
}

export interface AdminAiResumeHistoryQuery {
  pageNo: number
  pageSize: number
  userId?: number
  status?: string
  keyword?: string
  requestId?: string
}

export type AdminAiResumeHistoryPageResult = PageResult<AdminAiResumeHistoryItem>

export interface AiImageProviderPublicConfig {
  endpoint?: string | null
  region?: string | null
  model?: string | null
  modelVersion?: string | null
  size?: string | null
  quality?: string | null
  responseFormat?: string | null
  count?: number | null
  watermark?: boolean | null
  promptRewrite?: boolean | null
  authHeader?: string | null
  resolution?: string | null
  connectTimeoutMs?: number | null
  readTimeoutMs?: number | null
  pollIntervalMs?: number | null
  maxPollAttempts?: number | null
  extraParamsJson?: string | null
}

export interface AdminAiImageProvider {
  configId: number
  providerCode: string
  displayName: string
  enabled: boolean
  active: boolean
  priority: number
  publicConfig: AiImageProviderPublicConfig
  secretConfigured: boolean
  secretMask: Record<string, string>
  secretUpdatedBy?: number | null
  secretUpdatedByName?: string | null
  secretUpdatedAt?: string | null
  lastTestStatus?: string | null
  lastTestMessage?: string | null
  lastTestAt?: string | null
  requiredSecretFields: string[]
  requiredPublicFields: string[]
  missingPublicFields: string[]
  missingSecretFields: string[]
  activationReady: boolean
  createTime?: string | null
  lastUpdate?: string | null
}

export interface AdminAiImageProviderPublicConfigSavePayload {
  publicConfig: AiImageProviderPublicConfig
  reason?: string
}

export interface AdminAiImageProviderSavePayload {
  providerCode: string
  displayName: string
  enabled: boolean
  priority: number
  publicConfig: AiImageProviderPublicConfig
  secrets?: Record<string, string>
  reason?: string
}

export interface AdminAiImageProviderSecretSavePayload {
  secrets: Record<string, string>
  reason?: string
}

export interface AdminAiImageProviderActionPayload {
  reason?: string
  confirmText?: string
}

export interface AdminAiImageProviderRevealSecretResp {
  providerCode: string
  secrets: Record<string, string>
  revealedAt?: string | null
}

export interface AdminAiImageProviderTestPayload {
  sourceImageUrl?: string
  prompt?: string
  negativePrompt?: string
  templateSceneCode?: string
  styleCode?: string
}

export interface AdminAiImageProviderTestResult {
  providerCode: string
  modelCode?: string | null
  status: string
  message?: string | null
  imageUrl?: string | null
  elapsedMs?: number | null
}

export interface ProfileImportConfig {
  enabled: boolean
  available: boolean
  endpoint?: string | null
  modelName?: string | null
  connectTimeoutMs?: number | null
  readTimeoutMs?: number | null
  maxInputChars?: number | null
  maxOutputTokens?: number | null
  perUserDailyLimit?: number | null
  secretMask?: string | null
  lastTestStatus?: string | null
  lastTestMessage?: string | null
  lastTestAt?: string | null
}

export interface ProfileImportConfigPayload {
  endpoint: string
  modelName: string
  connectTimeoutMs: number
  readTimeoutMs: number
  maxInputChars: number
  maxOutputTokens: number
  perUserDailyLimit: number
}

export interface ProfileImportConfigAudit {
  auditId: number
  actionCode: string
  operatorId?: number | null
  operatorName?: string | null
  resultStatus: string
  message?: string | null
  createTime?: string | null
}

export type ProfileImportPromptScene = 'full_profile' | 'works_only'
export type ProfileImportPromptLifecycle = 'draft' | 'released' | 'abandoned'
export type ProfileImportPromptTestStatus = 'untested' | 'success' | 'failed' | 'stale'
export type ProfileImportPromptReasonCode =
  | 'INITIAL_RELEASE'
  | 'QUALITY_ADJUSTMENT'
  | 'CONFIG_ALIGNMENT'
  | 'QUALITY_REGRESSION'
  | 'INCIDENT_ROLLBACK'
  | 'DRAFT_SUPERSEDED'
  | 'DRAFT_INVALID'

export interface ProfileImportPromptTemplateSummary {
  templateId: number
  templateCode: string
  scene: ProfileImportPromptScene
  displayName: string
  activeVersionId?: number | null
  activeVersionNo?: number | null
  activeVersionLabel?: string | null
  activeContentSha256?: string | null
  draftVersionId?: number | null
  draftVersionNo?: number | null
  draftVersionLabel?: string | null
  draftTestStatus?: ProfileImportPromptTestStatus | null
  version: number
}

export interface ProfileImportPromptVersionSummary {
  promptVersionId: number
  versionNo: number
  versionLabel: string
  lifecycleStatus: ProfileImportPromptLifecycle
  contentSha256: string
  testStatus: ProfileImportPromptTestStatus
  testedModelName?: string | null
  testErrorCode?: string | null
  testCandidateCount: number
  testWorkCount: number
  testElapsedMs?: number | null
  testedBy?: number | null
  testedAt?: string | null
  releasedBy?: number | null
  releasedAt?: string | null
  updateUserName?: string | null
  lastUpdate?: string | null
  version: number
}

export interface ProfileImportPromptVersionDetail extends ProfileImportPromptVersionSummary {
  systemPromptBody: string
  repairPromptBody: string
  schemaVersion: string
  contractVersion: string
  changeSummary?: string | null
}

export interface ProfileImportPromptTestResult {
  promptVersionId: number
  contentSha256: string
  runtimeSha256: string
  fixtureCode: string
  fixtureVersion: string
  fixtureSha256: string
  modelName: string
  configVersion: number
  status: 'success' | 'failed'
  candidateCount: number
  workCount: number
  elapsedMs: number
  errorCode?: string | null
  testedBy: number
  testedAt: string
}

export interface ProfileImportPromptAudit {
  promptAuditId: number
  templateId: number
  promptVersionId?: number | null
  actionCode: string
  fromVersionId?: number | null
  toVersionId?: number | null
  contentSha256?: string | null
  runtimeSha256?: string | null
  schemaVersion?: string | null
  contractVersion?: string | null
  fixtureCode?: string | null
  fixtureVersion?: string | null
  fixtureSha256?: string | null
  modelName?: string | null
  configVersion?: number | null
  testOperatorId?: number | null
  testedAt?: string | null
  operatorId: number
  operatorName?: string | null
  reasonCode: string
  resultStatus: string
  errorCode?: string | null
  message?: string | null
  createTime?: string | null
}

export interface ProfileImportPromptCreateDraftPayload {
  sourceVersionId?: number | null
  expectedTemplateVersion: number
}

export interface ProfileImportPromptUpdateDraftPayload {
  versionLabel: string
  systemPromptBody: string
  repairPromptBody: string
  changeSummary?: string | null
  expectedVersion: number
}

export interface ProfileImportPromptVersionActionPayload {
  reasonCode: ProfileImportPromptReasonCode
  expectedTemplateVersion: number
  expectedVersion: number
}

export interface ProfileImportPromptRestorePayload {
  reasonCode: ProfileImportPromptReasonCode
  expectedTemplateVersion: number
}
