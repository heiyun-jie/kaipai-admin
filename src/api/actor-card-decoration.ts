import request from '@/utils/request'
import type { DecorationApi, DecorationConfig, DecorationDraft, DecorationVersion } from '../types/actor-card-decoration'

type Transport = Pick<typeof request, 'get' | 'put' | 'post'>
export function createDecorationApi(transport: Transport): DecorationApi {
  const base = (id: number) => `/admin/content/templates/${id}/decoration`
  return {
    load: id => transport.get(`${base(id)}/draft`) as unknown as Promise<DecorationDraft>,
    history: id => transport.get(`${base(id)}/versions`) as unknown as Promise<DecorationVersion[]>,
    save: (id, payload) => transport.put(`${base(id)}/draft`, payload) as unknown as Promise<DecorationDraft>,
    preview: (id, config) => transport.post(`${base(id)}/preview`, { config }) as unknown as Promise<DecorationConfig>,
    publish: (id, payload) => transport.post(`${base(id)}/publish`, payload) as unknown as Promise<DecorationDraft>,
    activate: (id, version, payload) => transport.post(`${base(id)}/activate/${version}`, payload) as unknown as Promise<DecorationDraft>,
  }
}
export const decorationApi = createDecorationApi(request)
