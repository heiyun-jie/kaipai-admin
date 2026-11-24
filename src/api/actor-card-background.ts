import request from '@/utils/request'
import type { PublicBackground, EditorBackgroundApi } from '../types/actor-card-background'
const base = '/admin/content/actor-card-backgrounds'
export const publicBackgroundApi = {
  list: (style: string, page: number, includeDisabled = true) => request.get(base, { params: { style, page, size: 30, includeDisabled } }) as unknown as Promise<PublicBackground[]>,
  /** 00-267: 一次取全量（≤100）用于找出不属于任何风格模板的旧分类 */
  listAll: () => request.get(base, { params: { page: 1, size: 100, includeDisabled: true } }) as unknown as Promise<PublicBackground[]>,
  upload(file: File, style: string) {
    const data = new FormData(); data.append('file', file); data.append('style', style)
    return request.post(base, data, { timeout: 60000 }) as unknown as Promise<PublicBackground>
  },
  update(item: PublicBackground, changes: Pick<PublicBackground, 'style' | 'sortOrder' | 'enabled'>) {
    return request.patch(`${base}/${item.id}`, { ...changes, expectedStyle: item.style, expectedSortOrder: item.sortOrder, expectedEnabled: item.enabled }) as unknown as Promise<PublicBackground>
  },
  context: id => request.get(`/admin/content/templates/${id}/decoration/editor-background`) as unknown as ReturnType<EditorBackgroundApi['context']>,
  saveContext: (id, data) => request.put(`/admin/content/templates/${id}/decoration/editor-background`, data) as unknown as ReturnType<EditorBackgroundApi['saveContext']>,
} satisfies EditorBackgroundApi & Record<string, unknown>
