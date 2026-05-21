import request from '@/utils/request'
import type {
  AdminAiResumeFailureActionPayload,
  AdminAiResumeFailureCollaborationCatalog,
  AdminAiResumeFailureItem,
  AdminAiResumeFailureQuery,
  AdminAiResumeHistoryItem,
  AdminAiResumeHistoryPageResult,
  AdminAiResumeHistoryQuery,
  AdminAiResumeOverview,
  AdminAiImageProvider,
  AdminAiImageProviderActionPayload,
  AdminAiImageProviderPublicConfigSavePayload,
  AdminAiImageProviderRevealSecretResp,
  AdminAiImageProviderSavePayload,
  AdminAiImageProviderSecretSavePayload,
  AdminAiImageProviderTestPayload,
  AdminAiImageProviderTestResult,
} from '@/types/ai'

export function fetchAdminAiResumeOverview() {
  return request.get('/admin/ai/resume/overview').then((data) => data as unknown as AdminAiResumeOverview)
}

export function fetchAdminAiResumeHistories(params: AdminAiResumeHistoryQuery) {
  return request.get('/admin/ai/resume/histories', { params }).then((data) => data as unknown as AdminAiResumeHistoryPageResult)
}

export function fetchAdminAiResumeHistoryDetail(historyId: string) {
  return request.get(`/admin/ai/resume/histories/${historyId}`).then((data) => data as unknown as AdminAiResumeHistoryItem)
}

export function fetchAdminAiResumeFailures(params?: AdminAiResumeFailureQuery) {
  return request.get('/admin/ai/resume/failures', { params }).then((data) => data as unknown as AdminAiResumeFailureItem[])
}

export function fetchAdminAiResumeSensitiveHits(params?: AdminAiResumeFailureQuery) {
  return request.get('/admin/ai/resume/sensitive-hits', { params }).then((data) => data as unknown as AdminAiResumeFailureItem[])
}

export function fetchAdminAiResumeFailureCollaborationCatalog() {
  return request.get('/admin/ai/resume/collaboration-catalog').then((data) => data as unknown as AdminAiResumeFailureCollaborationCatalog)
}

export function reviewAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/review`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function suggestRetryAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/suggest-retry`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function closeAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/close`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function ignoreAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/ignore`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function assignAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/assign`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function acknowledgeAdminAiResumeFailureAssignment(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/acknowledge-assignment`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function remindAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/remind`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function manualTakeoverAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/manual-takeover`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function skipAutoRemindAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/skip-auto-remind`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function recordNotificationAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/record-notification`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function recordNotificationReceiptAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/record-notification-receipt`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function escalateAdminAiResumeFailure(failureId: string, payload: AdminAiResumeFailureActionPayload) {
  return request.post(`/admin/ai/resume/failures/${failureId}/escalate`, payload).then((data) => data as unknown as AdminAiResumeFailureItem)
}

export function fetchAdminAiImageProviders() {
  return request.get('/admin/ai/image-providers').then((data) => data as unknown as AdminAiImageProvider[])
}

export function fetchAdminAiImageProvider(providerCode: string) {
  return request.get(`/admin/ai/image-providers/${providerCode}`).then((data) => data as unknown as AdminAiImageProvider)
}

export function saveAdminAiImageProvider(payload: AdminAiImageProviderSavePayload) {
  return request.post('/admin/ai/image-providers', payload).then((data) => data as unknown as AdminAiImageProvider)
}

export function saveAdminAiImageProviderPublicConfig(providerCode: string, payload: AdminAiImageProviderPublicConfigSavePayload) {
  return request.put(`/admin/ai/image-providers/${providerCode}/public-config`, payload).then((data) => data as unknown as AdminAiImageProvider)
}

export function saveAdminAiImageProviderSecret(providerCode: string, payload: AdminAiImageProviderSecretSavePayload) {
  return request.put(`/admin/ai/image-providers/${providerCode}/secret`, payload).then((data) => data as unknown as AdminAiImageProvider)
}

export function clearAdminAiImageProviderSecret(providerCode: string, payload: AdminAiImageProviderActionPayload) {
  return request.post(`/admin/ai/image-providers/${providerCode}/clear-secret`, payload).then((data) => data as unknown as AdminAiImageProvider)
}

export function enableAdminAiImageProvider(providerCode: string, payload?: AdminAiImageProviderActionPayload) {
  return request.post(`/admin/ai/image-providers/${providerCode}/enable`, payload || {}).then((data) => data as unknown as AdminAiImageProvider)
}

export function disableAdminAiImageProvider(providerCode: string, payload?: AdminAiImageProviderActionPayload) {
  return request.post(`/admin/ai/image-providers/${providerCode}/disable`, payload || {}).then((data) => data as unknown as AdminAiImageProvider)
}

export function activateAdminAiImageProvider(providerCode: string, payload?: AdminAiImageProviderActionPayload) {
  return request.post(`/admin/ai/image-providers/${providerCode}/activate`, payload || {}).then((data) => data as unknown as AdminAiImageProvider)
}

export function revealAdminAiImageProviderSecret(providerCode: string, payload: AdminAiImageProviderActionPayload) {
  return request.post(`/admin/ai/image-providers/${providerCode}/reveal-secret`, payload).then((data) => data as unknown as AdminAiImageProviderRevealSecretResp)
}

export function testAdminAiImageProvider(providerCode: string, payload: AdminAiImageProviderTestPayload) {
  return request
    .post(`/admin/ai/image-providers/${providerCode}/test`, payload, { timeout: 180000 })
    .then((data) => data as unknown as AdminAiImageProviderTestResult)
}
