import request from '@/utils/request'
import type { DecorationBindingApi, DecorationSource } from '../types/actor-card-decoration-binding'
export function createDecorationBindingApi(transport: Pick<typeof request, 'get' | 'put'>): DecorationBindingApi {
  const base = '/admin/content/actor-card-decoration-bindings'
  const path = (s: DecorationSource) => s.generationMode === 'person_ai' ? `${base}/default` : `${base}/backgrounds/${s.backgroundId}`
  return {
    load: s => transport.get(path(s)) as unknown as ReturnType<DecorationBindingApi['load']>,
    save: (s, payload) => transport.put(path(s), payload) as unknown as ReturnType<DecorationBindingApi['save']>,
    preview: (cardId, s) => transport.get(`${base}/preview/cards/${cardId}`, { params: s }) as unknown as ReturnType<DecorationBindingApi['preview']>,
  }
}
export const decorationBindingApi = createDecorationBindingApi(request)
