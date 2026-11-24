export interface PublicBackground { id: number; style: string; imageUrl: string; thumbnailUrl: string; sortOrder: number; enabled: number }
export interface EditorBackgroundContext { revision: number; backgroundId: number | null; background: PublicBackground | null }
export interface EditorBackgroundApi {
  context(id: number): Promise<EditorBackgroundContext>
  saveContext(id: number, payload: { expectedRevision: number; backgroundId: number | null }): Promise<EditorBackgroundContext>
}