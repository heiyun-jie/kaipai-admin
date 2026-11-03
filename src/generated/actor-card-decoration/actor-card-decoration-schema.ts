// GENERATED from kaipai-frontend; run node scripts/generate-decoration-renderer.mjs.
import type { ActorCardRenderModel } from './actor-card-render-model';

export const ACTOR_CARD_DECORATION_RENDERER_VERSION = 2;

export type ActorCardDecorationModuleType =
  | 'identity'
  | 'promotion'
  | 'highlights'
  | 'profile'
  | 'introduction'
  | 'works'
  | 'photos'
  | 'stills'
  | 'video'
  | 'pdf'
  | 'cooperation';

export interface ActorCardDecorationEnvelopeLike {
  versionId: number;
  templateId: number;
  templateVersion: number;
  schemaVersion: 1 | 2;
  config: unknown;
}

export interface ActorCardDecorationStyle {
  radius: number;
  padding: number;
  gap: number;
  marginTop: number;
  marginBottom: number;
  fontSize: number;
  lineHeight: number;
  fontWeight: 400 | 500 | 600 | 700;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  shadow: 'none' | 'soft' | 'medium';
  align: 'left' | 'center' | 'right';
}

export type ActorCardDecorationLayout =
  | { zone: 'flow'; width: number; align: 'left' | 'center' | 'right' }
  | { zone: 'hero'; x: number; y: number; width: number; height: number; zIndex: number };

export interface ActorCardDecorationModule {
  id: string;
  type: ActorCardDecorationModuleType;
  enabled: boolean;
  order: number;
  presentation: string;
  maxLines?: number;
  identityOptions?: ActorCardDecorationIdentityOptions;
  layout: ActorCardDecorationLayout;
  style: ActorCardDecorationStyle;
}

export type ActorCardDecorationMetaField = 'role' | 'gender' | 'age' | 'height' | 'weight' | 'city';

export interface ActorCardDecorationIdentityOptions {
  eyebrow: string;
  eyebrowFontSize: number;
  eyebrowLetterSpacing: number;
  eyebrowColor: string;
  nameFontSize: number;
  nameLineHeight: number;
  metaFontSize: number;
  metaLineHeight: number;
  roleLabel: string;
  metaFields: ActorCardDecorationMetaField[];
  weightUnit: 'kg' | 'jin';
}

export interface ActorCardDecorationOverlay {
  enabled: boolean;
  color: string;
  startOpacity: number;
  endOpacity: number;
}

export interface NormalizedActorCardDecoration {
  versionId: number;
  templateId: number;
  templateVersion: number;
  schemaVersion: 1 | 2;
  minRendererVersion: 1 | 2;
  page: { backgroundColor: string; contentPadding: number; gap: number };
  hero: { height: number; focalX: number; focalY: number; overlay?: ActorCardDecorationOverlay };
  defaults: ActorCardDecorationStyle;
  modules: ActorCardDecorationModule[];
}

type UnknownRecord = Record<string, unknown>;

const ROOT_FIELDS = ['schemaVersion', 'minRendererVersion', 'page', 'defaults', 'hero', 'modules'] as const;
const ENVELOPE_FIELDS = ['versionId', 'templateId', 'templateVersion', 'schemaVersion', 'config'] as const;
const PAGE_FIELDS = ['backgroundColor', 'contentPadding', 'gap'] as const;
const HERO_FIELDS = ['height', 'focalX', 'focalY'] as const;
const OVERLAY_FIELDS = ['enabled', 'color', 'startOpacity', 'endOpacity'] as const;
const MODULE_FIELDS = ['id', 'type', 'enabled', 'order', 'presentation', 'maxLines', 'layout', 'style'] as const;
const IDENTITY_OPTIONS_FIELDS = [
  'eyebrow', 'eyebrowFontSize', 'eyebrowLetterSpacing', 'eyebrowColor', 'nameFontSize',
  'nameLineHeight', 'metaFontSize', 'metaLineHeight', 'roleLabel', 'metaFields', 'weightUnit',
] as const;
const LAYOUT_FIELDS = ['zone', 'x', 'y', 'width', 'height', 'zIndex', 'align'] as const;
const FLOW_LAYOUT_FIELDS = ['zone', 'width', 'align'] as const;
const HERO_LAYOUT_FIELDS = ['zone', 'x', 'y', 'width', 'height', 'zIndex'] as const;
const STYLE_FIELDS = [
  'radius', 'padding', 'gap', 'marginTop', 'marginBottom', 'fontSize', 'lineHeight',
  'fontWeight', 'color', 'backgroundColor', 'borderColor', 'borderWidth', 'shadow', 'align',
] as const;
const HERO_MODULE_TYPES = new Set<ActorCardDecorationModuleType>(['identity', 'highlights', 'introduction', 'promotion']);
const PRESENTATIONS: Record<ActorCardDecorationModuleType, readonly string[]> = {
  identity: ['standard'],
  promotion: ['pill'],
  highlights: ['chips'],
  profile: ['rows'],
  introduction: ['full', 'summary'],
  works: ['cards', 'list'],
  photos: ['grid', 'carousel'],
  stills: ['grid', 'carousel'],
  video: ['player', 'poster'],
  pdf: ['button', 'pages'],
  cooperation: ['contact'],
};
const MODULE_TYPES = new Set<ActorCardDecorationModuleType>(Object.keys(PRESENTATIONS) as ActorCardDecorationModuleType[]);
const ALIGNMENTS = new Set(['left', 'center', 'right'] as const);
const FONT_WEIGHTS = new Set([400, 500, 600, 700] as const);
const SHADOWS = new Set(['none', 'soft', 'medium'] as const);
const ID_PATTERN = /^[a-z][a-z0-9_-]{0,47}$/;
const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const META_FIELDS = new Set<ActorCardDecorationMetaField>(['role', 'gender', 'age', 'height', 'weight', 'city']);
const UNSAFE_TEXT_PATTERN = /[<>\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

const BASE_STYLE: ActorCardDecorationStyle = {
  radius: 16,
  padding: 24,
  gap: 16,
  marginTop: 0,
  marginBottom: 0,
  fontSize: 28,
  lineHeight: 42,
  fontWeight: 400,
  color: '#1F2937',
  backgroundColor: '#FFFFFF',
  borderColor: '#E5E7EB',
  borderWidth: 0,
  shadow: 'none',
  align: 'left',
};

function record(value: unknown, allowed: readonly string[]): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
  const source = value as UnknownRecord;
  if (Object.keys(source).some(key => !allowed.includes(key))) throw new Error('unknown field');
  return source;
}

function optionalRecord(source: UnknownRecord, field: string, allowed: readonly string[]): UnknownRecord {
  return field in source ? record(source[field], allowed) : {};
}

function integer(source: UnknownRecord, field: string, fallback: number | undefined, min: number, max: number): number {
  const value = Object.prototype.hasOwnProperty.call(source, field) ? source[field] : fallback;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new Error('integer out of range');
  return value as number;
}

function booleanValue(source: UnknownRecord, field: string, fallback: boolean): boolean {
  const value = Object.prototype.hasOwnProperty.call(source, field) ? source[field] : fallback;
  if (typeof value !== 'boolean') throw new Error('boolean required');
  return value;
}

function text(source: UnknownRecord, field: string, fallback?: string): string {
  const value = Object.prototype.hasOwnProperty.call(source, field) ? source[field] : fallback;
  if (typeof value !== 'string') throw new Error('string required');
  return value;
}

function choice<T extends string>(source: UnknownRecord, field: string, fallback: T, choices: Set<T>): T {
  const value = text(source, field, fallback);
  if (!choices.has(value as T)) throw new Error('unsupported value');
  return value as T;
}

function color(source: UnknownRecord, field: string, fallback: string, transparent: boolean): string {
  const value = text(source, field, fallback);
  if (!HEX_PATTERN.test(value) && !(transparent && value === 'transparent')) throw new Error('unsafe color');
  return value;
}

function safeText(source: UnknownRecord, field: string, fallback: string, maxLength: number): string {
  const value = text(source, field, fallback);
  if (UNSAFE_TEXT_PATTERN.test(value)) throw new Error('unsafe text');
  if (value.length > maxLength) throw new Error('text too long');
  return value;
}

function normalizeIdentityOptions(source: UnknownRecord): ActorCardDecorationIdentityOptions {
  const rawFields = 'metaFields' in source ? source.metaFields : ['role', 'height', 'weight'];
  if (!Array.isArray(rawFields) || rawFields.length > 6
    || rawFields.some(field => typeof field !== 'string' || !META_FIELDS.has(field as ActorCardDecorationMetaField))
    || new Set(rawFields).size !== rawFields.length) throw new Error('invalid meta fields');
  const options: ActorCardDecorationIdentityOptions = {
    eyebrow: safeText(source, 'eyebrow', 'ACTOR PROFILE', 40),
    eyebrowFontSize: integer(source, 'eyebrowFontSize', 28, 16, 40),
    eyebrowLetterSpacing: integer(source, 'eyebrowLetterSpacing', 6, 0, 12),
    eyebrowColor: color(source, 'eyebrowColor', '#D8E0EA', false),
    nameFontSize: integer(source, 'nameFontSize', 104, 32, 120),
    nameLineHeight: integer(source, 'nameLineHeight', 124, 40, 160),
    metaFontSize: integer(source, 'metaFontSize', 36, 16, 48),
    metaLineHeight: integer(source, 'metaLineHeight', 48, 24, 80),
    roleLabel: safeText(source, 'roleLabel', '演员', 16),
    metaFields: [...rawFields] as ActorCardDecorationMetaField[],
    weightUnit: choice(source, 'weightUnit', 'jin', new Set(['kg', 'jin'] as const)),
  };
  if (options.nameLineHeight < options.nameFontSize || options.metaLineHeight < options.metaFontSize) throw new Error('line height too small');
  return options;
}

function normalizeStyle(input: UnknownRecord, inherited: ActorCardDecorationStyle): ActorCardDecorationStyle {
  record(input, STYLE_FIELDS);
  const normalized: ActorCardDecorationStyle = {
    radius: integer(input, 'radius', inherited.radius, 0, 96),
    padding: integer(input, 'padding', inherited.padding, 0, 96),
    gap: integer(input, 'gap', inherited.gap, 0, 96),
    marginTop: integer(input, 'marginTop', inherited.marginTop, 0, 160),
    marginBottom: integer(input, 'marginBottom', inherited.marginBottom, 0, 160),
    fontSize: integer(input, 'fontSize', inherited.fontSize, 16, 72),
    lineHeight: integer(input, 'lineHeight', inherited.lineHeight, 24, 120),
    fontWeight: integer(input, 'fontWeight', inherited.fontWeight, 400, 700) as ActorCardDecorationStyle['fontWeight'],
    color: color(input, 'color', inherited.color, false),
    backgroundColor: color(input, 'backgroundColor', inherited.backgroundColor, true),
    borderColor: color(input, 'borderColor', inherited.borderColor, true),
    borderWidth: integer(input, 'borderWidth', inherited.borderWidth, 0, 8),
    shadow: choice(input, 'shadow', inherited.shadow, SHADOWS),
    align: choice(input, 'align', inherited.align, ALIGNMENTS),
  };
  if (!FONT_WEIGHTS.has(normalized.fontWeight)) throw new Error('unsupported font weight');
  if (normalized.lineHeight < normalized.fontSize) throw new Error('line height too small');
  return normalized;
}

function normalizeLayout(
  source: UnknownRecord,
  type: ActorCardDecorationModuleType,
  page: NormalizedActorCardDecoration['page'],
  hero: NormalizedActorCardDecoration['hero'],
): ActorCardDecorationLayout {
  record(source, LAYOUT_FIELDS);
  const zone = choice(source, 'zone', 'flow', new Set(['flow', 'hero'] as const));
  if (zone === 'flow') {
    if (type === 'promotion') throw new Error('promotion requires hero zone');
    record(source, FLOW_LAYOUT_FIELDS);
    const availableWidth = 750 - (2 * page.contentPadding);
    return {
      zone,
      width: integer(source, 'width', availableWidth, 1, availableWidth),
      align: choice(source, 'align', 'left', ALIGNMENTS),
    };
  }
  record(source, HERO_LAYOUT_FIELDS);
  if (!HERO_MODULE_TYPES.has(type)) throw new Error('module cannot use hero zone');
  const x = integer(source, 'x', undefined, 0, 750);
  const y = integer(source, 'y', undefined, 0, hero.height);
  const width = integer(source, 'width', undefined, 1, 750);
  const height = integer(source, 'height', undefined, 1, hero.height);
  if (x + width > 750 || y + height > hero.height) throw new Error('hero bounds exceeded');
  return { zone, x, y, width, height, zIndex: integer(source, 'zIndex', 0, 0, 20) };
}

function normalizeConfig(config: unknown): Omit<NormalizedActorCardDecoration, 'versionId' | 'templateId' | 'templateVersion'> {
  const source = record(config, ROOT_FIELDS);
  const schemaVersion = integer(source, 'schemaVersion', undefined, 1, ACTOR_CARD_DECORATION_RENDERER_VERSION) as 1 | 2;
  const minRendererVersion = integer(source, 'minRendererVersion', schemaVersion, schemaVersion, schemaVersion) as 1 | 2;
  const pageSource = optionalRecord(source, 'page', PAGE_FIELDS);
  const page = {
    backgroundColor: color(pageSource, 'backgroundColor', '#F3F4F6', false),
    contentPadding: integer(pageSource, 'contentPadding', 24, 0, 96),
    gap: integer(pageSource, 'gap', 16, 0, 96),
  };
  const heroSource = optionalRecord(source, 'hero', schemaVersion === 2 ? [...HERO_FIELDS, 'overlay'] : HERO_FIELDS);
  const hero: NormalizedActorCardDecoration['hero'] = {
    height: integer(heroSource, 'height', 1334, 400, 1800),
    focalX: integer(heroSource, 'focalX', 50, 0, 100),
    focalY: integer(heroSource, 'focalY', 50, 0, 100),
  };
  if (schemaVersion === 2) {
    const overlay = optionalRecord(heroSource, 'overlay', OVERLAY_FIELDS);
    hero.overlay = {
      enabled: booleanValue(overlay, 'enabled', true),
      color: color(overlay, 'color', '#0F172A', false),
      startOpacity: integer(overlay, 'startOpacity', 6, 0, 100),
      endOpacity: integer(overlay, 'endOpacity', 24, 0, 100),
    };
  }
  const defaults = normalizeStyle(optionalRecord(source, 'defaults', STYLE_FIELDS), BASE_STYLE);
  if (!Array.isArray(source.modules) || source.modules.length < 1 || source.modules.length > 16) throw new Error('modules required');
  const ids = new Set<string>();
  const zoneTypes = new Set<string>();
  const modules = source.modules.map((raw, sourceIndex) => {
    const moduleSource = record(raw, schemaVersion === 2 ? [...MODULE_FIELDS, 'identityOptions'] : MODULE_FIELDS);
    const id = text(moduleSource, 'id');
    if (!ID_PATTERN.test(id) || ids.has(id)) throw new Error('invalid module id');
    ids.add(id);
    const type = choice(moduleSource, 'type', '' as ActorCardDecorationModuleType, MODULE_TYPES);
    if (schemaVersion === 1 && type === 'promotion') throw new Error('promotion requires schema v2');
    const layout = normalizeLayout(optionalRecord(moduleSource, 'layout', LAYOUT_FIELDS), type, page, hero);
    const zoneType = `${layout.zone}:${type}`;
    if (zoneTypes.has(zoneType)) throw new Error('duplicate zone type');
    zoneTypes.add(zoneType);
    const allowedPresentations = new Set(schemaVersion === 2 && type === 'identity' ? ['standard', 'profileHero'] : PRESENTATIONS[type]);
    const defaultPresentation = layout.zone === 'hero' && type === 'introduction'
      ? 'summary'
      : PRESENTATIONS[type][0];
    const presentation = choice(moduleSource, 'presentation', defaultPresentation, allowedPresentations);
    if (presentation === 'profileHero' && layout.zone !== 'hero') throw new Error('profileHero requires hero zone');
    if ('identityOptions' in moduleSource && (type !== 'identity' || presentation !== 'profileHero')) throw new Error('identityOptions requires profileHero');
    if (layout.zone === 'hero' && type === 'introduction' && presentation !== 'summary') throw new Error('hero intro must summarize');
    const normalized: ActorCardDecorationModule & { sourceIndex?: number } = {
      id,
      type,
      enabled: booleanValue(moduleSource, 'enabled', true),
      order: integer(moduleSource, 'order', 0, 0, 10000),
      presentation,
      layout,
      style: normalizeStyle(optionalRecord(moduleSource, 'style', STYLE_FIELDS), defaults),
      sourceIndex,
    };
    if (type === 'identity' && presentation === 'profileHero') {
      normalized.identityOptions = normalizeIdentityOptions(optionalRecord(moduleSource, 'identityOptions', IDENTITY_OPTIONS_FIELDS));
    }
    if (type === 'introduction' && presentation === 'summary') {
      normalized.maxLines = integer(moduleSource, 'maxLines', 3, 1, 6);
    } else if ('maxLines' in moduleSource) {
      throw new Error('maxLines only supports summaries');
    }
    return normalized;
  });
  const hasHeroIntroduction = modules.some(module => module.enabled && module.type === 'introduction' && module.layout.zone === 'hero');
  const hasFullIntroduction = modules.some(module => module.enabled && module.type === 'introduction'
    && module.layout.zone === 'flow' && module.presentation === 'full');
  if (hasHeroIntroduction && !hasFullIntroduction) throw new Error('full introduction required');
  modules.sort((left, right) => left.order - right.order || (left.sourceIndex ?? 0) - (right.sourceIndex ?? 0));
  modules.forEach(module => { delete module.sourceIndex; });
  return { schemaVersion, minRendererVersion, page, hero, defaults, modules };
}

/**
 * Runtime capability boundary. Any malformed or future schema returns null so the caller can render legacy intact.
 */
export function resolveActorCardDecoration(value: unknown): NormalizedActorCardDecoration | null {
  try {
    const envelope = record(value, ENVELOPE_FIELDS);
    const versionId = integer(envelope, 'versionId', undefined, 1, Number.MAX_SAFE_INTEGER);
    const templateId = integer(envelope, 'templateId', undefined, 1, Number.MAX_SAFE_INTEGER);
    const templateVersion = integer(envelope, 'templateVersion', undefined, 1, Number.MAX_SAFE_INTEGER);
    const schemaVersion = integer(envelope, 'schemaVersion', undefined, 1, ACTOR_CARD_DECORATION_RENDERER_VERSION);
    const config = normalizeConfig(envelope.config);
    if (schemaVersion !== config.schemaVersion) return null;
    return { versionId, templateId, templateVersion, ...config };
  } catch {
    return null;
  }
}

const SHADOW_VALUES: Record<ActorCardDecorationStyle['shadow'], string> = {
  none: 'none',
  soft: '0 8px 24px rgba(15, 23, 42, 0.10)',
  medium: '0 14px 38px rgba(15, 23, 42, 0.18)',
};

const alignmentValue = (align: ActorCardDecorationStyle['align']) => (
  align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
);

/** Only this property whitelist is ever bound to Vue style; raw server objects are never spread. */
export function buildDecorationModuleStyle(module: ActorCardDecorationModule): Record<string, string | number> {
  const style = module.style;
  const layout = module.layout;
  const isPromotion = module.type === 'promotion';
  return {
    position: layout.zone === 'hero' ? 'absolute' : 'relative',
    display: 'flex',
    alignSelf: layout.zone === 'flow' ? alignmentValue(layout.align) : 'auto',
    boxSizing: 'border-box',
    overflow: 'hidden',
    width: `${layout.width}px`,
    height: layout.zone === 'hero' ? `${layout.height}px` : 'auto',
    left: layout.zone === 'hero' ? `${layout.x}px` : 'auto',
    top: layout.zone === 'hero' ? `${layout.y}px` : 'auto',
    zIndex: layout.zone === 'hero' ? layout.zIndex : 0,
    alignItems: alignmentValue(style.align),
    justifyContent: 'flex-start',
    gap: `${style.gap}px`,
    padding: `${isPromotion ? 0 : style.padding}px`,
    marginTop: `${isPromotion ? 0 : style.marginTop}px`,
    marginBottom: `${isPromotion ? 0 : style.marginBottom}px`,
    borderRadius: `${isPromotion ? 0 : style.radius}px`,
    borderWidth: `${isPromotion ? 0 : style.borderWidth}px`,
    borderStyle: !isPromotion && style.borderWidth > 0 ? 'solid' : 'none',
    borderColor: style.borderColor,
    backgroundColor: isPromotion ? 'transparent' : style.backgroundColor,
    color: style.color,
    fontSize: `${style.fontSize}px`,
    lineHeight: `${style.lineHeight}px`,
    fontWeight: style.fontWeight,
    textAlign: style.align,
    boxShadow: isPromotion ? 'none' : SHADOW_VALUES[style.shadow],
  };
}

/** The absolute module is only a transparent boundary; the pill owns all visual styling. */
export function buildDecorationPromotionPillStyle(module: ActorCardDecorationModule): Record<string, string | number> {
  const style = module.style;
  return {
    display: '-webkit-box',
    boxSizing: 'border-box',
    width: 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
    minWidth: '0',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: '2',
    wordBreak: 'break-all',
    whiteSpace: 'normal',
    alignSelf: alignmentValue(style.align),
    padding: `${style.padding}px`,
    marginTop: `${style.marginTop}px`,
    marginBottom: `${style.marginBottom}px`,
    borderRadius: `${style.radius}px`,
    borderWidth: `${style.borderWidth}px`,
    borderStyle: style.borderWidth > 0 ? 'solid' : 'none',
    borderColor: style.borderColor,
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontSize: `${style.fontSize}px`,
    lineHeight: `${style.lineHeight}px`,
    fontWeight: style.fontWeight,
    textAlign: style.align,
    boxShadow: SHADOW_VALUES[style.shadow],
  };
}

export function buildDecorationIdentityEyebrowStyle(module: ActorCardDecorationModule): Record<string, string> {
  const options = module.identityOptions;
  return options ? {
    fontSize: `${options.eyebrowFontSize}px`,
    letterSpacing: `${options.eyebrowLetterSpacing}px`,
    color: options.eyebrowColor,
    lineHeight: '1.5',
  } : {};
}

export function buildDecorationIdentityNameStyle(module: ActorCardDecorationModule): Record<string, string> {
  const options = module.identityOptions;
  return options ? { fontSize: `${options.nameFontSize}px`, lineHeight: `${options.nameLineHeight}px` } : {};
}

export function buildDecorationIdentityMetaStyle(module: ActorCardDecorationModule): Record<string, string> {
  const options = module.identityOptions;
  return options ? { fontSize: `${options.metaFontSize}px`, lineHeight: `${options.metaLineHeight}px` } : {};
}

const cleanProfileText = (value: unknown) => String(value ?? '').trim();
const compactNumber = (value: number) => String(Number(value.toFixed(4)));

function profileWeight(value: unknown, unit: 'kg' | 'jin'): string {
  const match = /^(\d+(?:\.\d+)?|\.\d+)\s*(kg|公斤|斤)?$/i.exec(cleanProfileText(value));
  if (!match) return '';
  const raw = Number(match[1]);
  if (!Number.isFinite(raw) || raw <= 0) return '';
  const kilograms = match[2] === '斤' ? raw / 2 : raw;
  const converted = unit === 'jin' ? kilograms * 2 : kilograms;
  if (!Number.isFinite(converted)) return '';
  return `${compactNumber(converted)}${unit === 'jin' ? '斤' : 'kg'}`;
}

export function buildDecorationIdentityMeta(module: ActorCardDecorationModule, model: ActorCardRenderModel): string {
  const options = module.identityOptions;
  if (!options) return '';
  const profile = model.profile;
  const gender = cleanProfileText(profile.gender).toLowerCase();
  const height = /^(\d+(?:\.\d+)?|\.\d+)\s*(?:cm|厘米)?$/i.exec(cleanProfileText(profile.height));
  const heightNumber = height ? Number(height[1]) : 0;
  const age = Number(profile.age);
  const values: Record<ActorCardDecorationMetaField, string> = {
    role: options.roleLabel,
    gender: gender === 'male' || gender === '1' ? '男' : gender === 'female' || gender === '2' ? '女' : '',
    age: Number.isFinite(age) && age > 0 ? `${compactNumber(age)}岁` : '',
    height: Number.isFinite(heightNumber) && heightNumber > 0 ? `${compactNumber(heightNumber)}cm` : '',
    weight: profileWeight(profile.weight, options.weightUnit),
    city: cleanProfileText(profile.city),
  };
  return options.metaFields.map(field => values[field]).filter(Boolean).join(' · ');
}

export function getActorCardPromotionText(model: ActorCardRenderModel): string {
  return typeof model.profile.heroBadgeText === 'string' ? model.profile.heroBadgeText.trim() : '';
}

export function buildDecorationPageStyle(decoration: NormalizedActorCardDecoration): Record<string, string> {
  return { backgroundColor: decoration.page.backgroundColor };
}

export function buildDecorationHeroStyle(decoration: NormalizedActorCardDecoration): Record<string, string> {
  return { height: `${decoration.hero.height}px` };
}

export function buildDecorationHeroImageStyle(decoration: NormalizedActorCardDecoration): Record<string, string> {
  return { objectPosition: `${decoration.hero.focalX}% ${decoration.hero.focalY}%` };
}

export function buildDecorationHeroOverlayStyle(decoration: NormalizedActorCardDecoration): Record<string, string> {
  const overlay = decoration.schemaVersion === 2 ? decoration.hero.overlay : undefined;
  // Returning no override is important: v1 retains the exact CSS gradient.
  if (!overlay) return {};
  if (!overlay.enabled) return { background: 'none' };
  const hex = overlay.color.slice(1);
  const expanded = hex.length === 3 ? hex.split('').map(part => part + part).join('') : hex;
  const channels = [0, 2, 4].map(offset => parseInt(expanded.slice(offset, offset + 2), 16));
  const alpha = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  const rgba = (opacity: number) => `rgba(${channels.join(', ')}, ${compactNumber(alpha * opacity / 100)})`;
  return { background: `linear-gradient(180deg, ${rgba(overlay.startOpacity)}, ${rgba(overlay.endOpacity)})` };
}

export function buildDecorationFlowStyle(decoration: NormalizedActorCardDecoration): Record<string, string> {
  return {
    gap: `${decoration.page.gap}px`,
    paddingTop: `${decoration.page.contentPadding}px`,
    paddingBottom: `${decoration.page.contentPadding}px`,
    paddingLeft: `${decoration.page.contentPadding}px`,
    paddingRight: `${decoration.page.contentPadding}px`,
  };
}

export function isRemoteActorCardMediaUrl(value: unknown): value is string {
  return typeof value === 'string'
    && /^https?:\/\//i.test(value)
    && !/^https?:\/\/tmp(?:[/:]|$)/i.test(value);
}

export function collectActorCardSkills(model: ActorCardRenderModel): string[] {
  const values = [
    ...(model.profile.skillGroups?.professionalAbility || []),
    ...(model.profile.skillGroups?.specialty || []),
    ...(model.profile.skillGroups?.roleType || []),
    ...(model.profile.skills || []),
  ];
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}

export function isDecorationModuleVisible(module: ActorCardDecorationModule, model: ActorCardRenderModel): boolean {
  if (!module.enabled) return false;
  switch (module.type) {
    case 'identity':
      return Boolean(String(model.profile.name || model.title || '').trim());
    case 'promotion':
      return Boolean(getActorCardPromotionText(model));
    case 'highlights':
      return collectActorCardSkills(model).length > 0;
    case 'profile':
      return [model.profile.gender, model.profile.age, model.profile.height, model.profile.weight,
        model.profile.city, model.profile.school, model.profile.bodyType, model.profile.hairStyle]
        .some(value => value !== null && value !== undefined && String(value).trim() !== '')
        || (model.profile.languages || []).some(value => String(value || '').trim() !== '');
    case 'introduction':
      return Boolean(String(model.profile.introduction || '').trim());
    case 'works':
      return model.works.length > 0;
    case 'stills':
      return model.works.some(work => work.stills.some(isRemoteActorCardMediaUrl));
    case 'photos':
      return model.photos.some(isRemoteActorCardMediaUrl);
    case 'video':
      return model.settings.showVideo !== false && isRemoteActorCardMediaUrl(model.video?.url);
    case 'pdf':
      return model.settings.showAttachment !== false && Boolean(model.attachment);
    case 'cooperation':
      return model.settings.showContact !== false && Boolean(String(model.profile.contact || '').trim());
    default:
      return false;
  }
}
