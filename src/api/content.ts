import request from '@/utils/request'
import type {
  ContentContactRequestDetail,
  ContentContactRequestPageResult,
  ContentContactRequestQuery,
  ContactRequestDecisionPayload,
  ContentShareCardGovernanceDetail,
  ContentShareCardGovernancePageResult,
  ContentShareCardGovernanceQuery,
  ShareArtifactPageResult,
  ShareArtifactQuery,
  ShareArtifactUpdatePayload,
  ThemeTokenPageResult,
  ThemeTokenQuery,
  ThemeTokenUpdatePayload,
  TemplatePublishLogPageResult,
  TemplatePublishLogQuery,
  TemplateCreatePayload,
  TemplateDetailPayload,
  TemplateListQuery,
  TemplatePageResult,
  TemplatePublishPayload,
  TemplateRollbackPayload,
  TemplateSortPayload,
  TemplateUpdatePayload,
} from '@/types/content'

export function fetchTemplates(params: TemplateListQuery) {
  return request.get('/admin/content/templates', { params }).then((data) => data as unknown as TemplatePageResult)
}

export function fetchTemplateDetail(id: number) {
  return request.get(`/admin/content/templates/${id}`).then((data) => data as unknown as TemplateDetailPayload)
}

export function createTemplate(payload: TemplateCreatePayload) {
  return request.post('/admin/content/templates', payload)
}

export function updateTemplate(id: number, payload: TemplateUpdatePayload) {
  return request.put(`/admin/content/templates/${id}`, payload)
}

export function enableTemplate(id: number, payload: { reason?: string } = {}) {
  return request.post(`/admin/content/templates/${id}/enable`, payload)
}

export function disableTemplate(id: number, payload: { reason?: string } = {}) {
  return request.post(`/admin/content/templates/${id}/disable`, payload)
}

export function sortTemplate(id: number, payload: TemplateSortPayload) {
  return request.post(`/admin/content/templates/${id}/sort`, payload)
}

export function publishTemplate(id: number, payload: TemplatePublishPayload) {
  return request.post(`/admin/content/templates/${id}/publish`, payload)
}

export function rollbackTemplate(id: number, payload: TemplateRollbackPayload) {
  return request.post(`/admin/content/templates/${id}/rollback`, payload)
}

export function fetchTemplatePublishLogs(params: TemplatePublishLogQuery) {
  return request.get('/admin/content/publish-logs', { params }).then((data) => data as unknown as TemplatePublishLogPageResult)
}

export function fetchThemeTokens(params: ThemeTokenQuery) {
  return request.get('/admin/content/theme-tokens', { params }).then((data) => data as unknown as ThemeTokenPageResult)
}

export function updateThemeTokens(templateId: number, payload: ThemeTokenUpdatePayload) {
  return request.put(`/admin/content/theme-tokens/${templateId}`, payload)
}

export function fetchShareArtifacts(params: ShareArtifactQuery) {
  return request.get('/admin/content/share-artifacts', { params }).then((data) => data as unknown as ShareArtifactPageResult)
}

export function updateShareArtifacts(templateId: number, payload: ShareArtifactUpdatePayload) {
  return request.put(`/admin/content/share-artifacts/${templateId}`, payload)
}

export function fetchContentContactRequests(params: ContentContactRequestQuery) {
  return request.get('/admin/content/contact-requests', { params }).then((data) => data as unknown as ContentContactRequestPageResult)
}

export function fetchContentContactRequestDetail(id: number) {
  return request.get(`/admin/content/contact-requests/${id}`).then((data) => data as unknown as ContentContactRequestDetail)
}

export function approveContentContactRequest(id: number, payload: ContactRequestDecisionPayload) {
  return request.post(`/admin/content/contact-requests/${id}/approve`, payload)
}

export function rejectContentContactRequest(id: number, payload: ContactRequestDecisionPayload) {
  return request.post(`/admin/content/contact-requests/${id}/reject`, payload)
}

export function fetchContentShareCards(params: ContentShareCardGovernanceQuery) {
  return request.get('/admin/content/share-cards', { params }).then((data) => data as unknown as ContentShareCardGovernancePageResult)
}

export function fetchContentShareCardDetail(shareCardId: number) {
  return request.get(`/admin/content/share-cards/${shareCardId}`).then((data) => data as unknown as ContentShareCardGovernanceDetail)
}
