// GENERATED from kaipai-frontend; run node scripts/generate-decoration-renderer.mjs.
export interface ActorCardRenderDecorationEnvelope {
  versionId: number;
  templateId: number;
  templateVersion: number;
  schemaVersion: number;
  config: unknown;
}

export interface ActorCardRenderModel {
  id: number;
  title: string | null;
  style: string | null;
  backgroundImageUrl: string | null;
  previewImageUrl: string | null;
  profile: {
    name: string | null;
    /** Per-card snapshot only; absent/empty values never inherit a live actor profile. */
    heroBadgeText?: string | null;
    gender?: string | null;
    age?: number | null;
    height: string | null;
    weight?: string | null;
    city: string | null;
    school: string | null;
    bodyType?: string | null;
    hairStyle?: string | null;
    languages?: string[] | null;
    skills?: string[] | null;
    skillGroups?: {
      specialty?: string[] | null;
      professionalAbility?: string[] | null;
      roleType?: string[] | null;
    } | null;
    certified?: boolean | null;
    contact: string | null;
    introduction: string | null;
  };
  works: Array<{
    id: number;
    title: string | null;
    role: string | null;
    workType: string | null;
    stills: string[];
  }>;
  photos: string[];
  video: { url: string } | null;
  attachment: { assetId: number; filename: string | null; pageImages?: string[] | null } | null;
  settings: {
    showContact: boolean;
    showVideo: boolean;
    showAttachment: boolean;
    order: string[];
  };
  /** Absent/null means the complete legacy renderer remains authoritative. */
  decoration?: ActorCardRenderDecorationEnvelope | null;
}
