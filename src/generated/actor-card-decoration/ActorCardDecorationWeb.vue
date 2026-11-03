<!-- GENERATED: content/template/styles are sourced from the mini-program renderer. -->
<template>
  <div class="actor-card-decoration" :style="pageStyle">
    <div class="actor-card-decoration__hero" :style="heroStyle">
      <img
        v-if="heroImageUrl && !mediaErrors.hero"
        :src="heroImageUrl"
        style="object-fit: cover"
        class="actor-card-decoration__hero-image"
        :style="heroImageStyle"
        @error="markMediaError('hero')"
      />
      <div v-else class="actor-card-decoration__hero-placeholder">
        <span class="actor-card-decoration__hero-placeholder-name">{{ model.profile.name || model.title || '演员卡' }}</span>
        <span class="actor-card-decoration__hero-placeholder-copy">主视觉暂不可用</span>
      </div>
      <div class="actor-card-decoration__hero-shade" :style="heroOverlayStyle" />

      <div
        v-for="module in heroModules"
        :key="module.id" :data-module="module.id"
        class="actor-card-decoration__module actor-card-decoration__module--hero"
        :style="moduleStyle(module)"
      >
        <template v-if="module.type === 'identity'">
          <template v-if="module.presentation === 'profileHero'">
            <span v-if="module.identityOptions?.eyebrow" class="actor-card-decoration__eyebrow" :style="identityEyebrowStyle(module)">{{ module.identityOptions.eyebrow }}</span>
            <span class="actor-card-decoration__name actor-card-decoration__profile-hero-name" :style="identityNameStyle(module)">{{ model.profile.name || model.title || '演员' }}</span>
            <span v-if="profileHeroMeta(module)" class="actor-card-decoration__profile-hero-meta" :style="identityMetaStyle(module)">{{ profileHeroMeta(module) }}</span>
          </template>
          <template v-else>
            <span class="actor-card-decoration__name">{{ model.profile.name || model.title || '演员' }}</span>
            <span v-if="identityMeta" class="actor-card-decoration__muted">{{ identityMeta }}</span>
          </template>
        </template>

        <template v-else-if="module.type === 'promotion'">
          <span class="actor-card-decoration__promotion-pill" :style="promotionPillStyle(module)">{{ promotionText }}</span>
        </template>

        <template v-else-if="module.type === 'highlights'">
          <div class="actor-card-decoration__chips">
            <span v-for="skill in skills" :key="`${module.id}-${skill}`" class="actor-card-decoration__chip">{{ skill }}</span>
          </div>
        </template>

        <template v-else-if="module.type === 'introduction'">
          <span class="actor-card-decoration__summary" :style="summaryStyle(module)">{{ model.profile.introduction }}</span>
        </template>
      </div>
    </div>

    <div class="actor-card-decoration__flow" :style="flowStyle">
      <div
        v-for="module in flowModules"
        :key="module.id" :data-module="module.id"
        class="actor-card-decoration__module actor-card-decoration__module--flow"
        :style="moduleStyle(module)"
      >
        <template v-if="module.type === 'identity'">
          <span class="actor-card-decoration__name">{{ model.profile.name || model.title || '演员' }}</span>
          <span v-if="identityMeta" class="actor-card-decoration__muted">{{ identityMeta }}</span>
        </template>

        <template v-else-if="module.type === 'highlights'">
          <span class="actor-card-decoration__heading">技能亮点</span>
          <div class="actor-card-decoration__chips">
            <span v-for="skill in skills" :key="`${module.id}-${skill}`" class="actor-card-decoration__chip">{{ skill }}</span>
          </div>
        </template>

        <template v-else-if="module.type === 'profile'">
          <span class="actor-card-decoration__heading">演员资料</span>
          <div class="actor-card-decoration__profile">
            <div v-for="row in profileRows" :key="row.label" class="actor-card-decoration__profile-row">
              <span class="actor-card-decoration__profile-label">{{ row.label }}</span>
              <span class="actor-card-decoration__profile-value">{{ row.value }}</span>
            </div>
          </div>
          <div v-if="languages.length" class="actor-card-decoration__chips">
            <span v-for="language in languages" :key="`${module.id}-${language}`" class="actor-card-decoration__chip">{{ language }}</span>
          </div>
        </template>

        <template v-else-if="module.type === 'introduction'">
          <span class="actor-card-decoration__heading">个人简介</span>
          <span
            class="actor-card-decoration__introduction"
            :class="{ 'actor-card-decoration__summary': module.presentation === 'summary' }"
            :style="module.presentation === 'summary' ? summaryStyle(module) : undefined"
          >{{ model.profile.introduction }}</span>
        </template>

        <template v-else-if="module.type === 'works'">
          <span class="actor-card-decoration__heading">参演作品</span>
          <div
            class="actor-card-decoration__works"
            :class="{ 'actor-card-decoration__works--list': module.presentation === 'list' }"
          >
            <div v-for="work in model.works" :key="work.id" class="actor-card-decoration__work">
              <img
                v-if="workCover(work) && !mediaErrors[`work-${work.id}`]"
                :src="workCover(work)"
                style="object-fit: cover"
                class="actor-card-decoration__work-image"
                @click="previewImages(work.stills, workCover(work))"
                @error="markMediaError(`work-${work.id}`)"
              />
              <div class="actor-card-decoration__work-copy">
                <span class="actor-card-decoration__work-title">{{ work.title || '未命名作品' }}</span>
                <span v-if="workMeta(work)" class="actor-card-decoration__muted">{{ workMeta(work) }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="module.type === 'stills'">
          <span class="actor-card-decoration__heading">作品剧照</span>
          <div
            class="actor-card-decoration__media-grid"
            :class="{ 'actor-card-decoration__media-grid--carousel': module.presentation === 'carousel' }"
          >
            <img
              v-for="(item, index) in stills"
              v-show="!mediaErrors[`still-${index}`]"
              :key="`${item.workId}-${index}`"
              :src="item.url"
              style="object-fit: cover"
              class="actor-card-decoration__media-image"
              loading="lazy"
              @click="previewImages(stillUrls, item.url)"
              @error="markMediaError(`still-${index}`)"
            />
          </div>
        </template>

        <template v-else-if="module.type === 'photos'">
          <span class="actor-card-decoration__heading">生活照片</span>
          <div
            class="actor-card-decoration__media-grid"
            :class="{ 'actor-card-decoration__media-grid--carousel': module.presentation === 'carousel' }"
          >
            <img
              v-for="(url, index) in photos"
              v-show="!mediaErrors[`photo-${index}`]"
              :key="`${module.id}-${index}`"
              :src="url"
              style="object-fit: cover"
              class="actor-card-decoration__media-image"
              loading="lazy"
              @click="previewImages(photos, url)"
              @error="markMediaError(`photo-${index}`)"
            />
          </div>
        </template>

        <template v-else-if="module.type === 'video'">
          <span class="actor-card-decoration__heading">视频简历</span>
          <div
            v-if="module.presentation === 'poster'"
            class="actor-card-decoration__video-poster"
            @click="openVideo"
          >
            <img
              v-if="videoPoster"
              :src="videoPoster"
              style="object-fit: cover"
              class="actor-card-decoration__video-poster-image"
            />
            <div class="actor-card-decoration__video-poster-mask">播放视频</div>
          </div>
          <video v-else :src="model.video?.url" class="actor-card-decoration__video" controls />
        </template>

        <template v-else-if="module.type === 'pdf'">
          <span class="actor-card-decoration__heading">PDF 简历</span>
          <span v-if="model.attachment?.filename" class="actor-card-decoration__muted">{{ model.attachment.filename }}</span>
          <div v-if="module.presentation === 'pages' && attachmentPages.length" class="actor-card-decoration__pdf-pages">
            <img
              v-for="(url, index) in attachmentPages"
              v-show="!mediaErrors[`pdf-${index}`]"
              :key="`${module.id}-${index}`"
              :src="url"
              style="height: auto"
              class="actor-card-decoration__pdf-page"
              loading="lazy"
              @click="previewImages(attachmentPages, url)"
              @error="markMediaError(`pdf-${index}`)"
            />
          </div>
          <div v-else class="actor-card-decoration__pdf-entry" @click="requestAttachmentPreview">
            <span>{{ attachmentLoading ? '加载中...' : '查看 PDF 附件' }}</span>
          </div>
          <span v-if="attachmentError" class="actor-card-decoration__error">{{ attachmentError }}</span>
        </template>

        <template v-else-if="module.type === 'cooperation'">
          <span class="actor-card-decoration__heading">合作联系</span>
          <span class="actor-card-decoration__contact" @click="callContact">{{ model.profile.contact }}</span>
        </template>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { webPlatform } from '../../utils/decoration-web-platform';

import { computed, reactive, watch } from 'vue';
import type { ActorCardRenderModel } from './actor-card-render-model';
import {
  buildDecorationFlowStyle,
  buildDecorationHeroImageStyle,
  buildDecorationHeroOverlayStyle,
  buildDecorationHeroStyle,
  buildDecorationIdentityEyebrowStyle,
  buildDecorationIdentityMeta,
  buildDecorationIdentityMetaStyle,
  buildDecorationIdentityNameStyle,
  buildDecorationModuleStyle,
  buildDecorationPageStyle,
  buildDecorationPromotionPillStyle,
  collectActorCardSkills,
  getActorCardPromotionText,
  isDecorationModuleVisible,
  isRemoteActorCardMediaUrl,
  type ActorCardDecorationModule,
  type NormalizedActorCardDecoration,
} from './actor-card-decoration-schema';

const props = withDefaults(defineProps<{
  model: ActorCardRenderModel;
  decoration: NormalizedActorCardDecoration;
  attachmentLoading?: boolean;
  attachmentError?: string;
  allowAttachmentLookup?: boolean;
}>(), {
  attachmentLoading: false,
  attachmentError: '',
  allowAttachmentLookup: false,
});

const emit = defineEmits<{ previewAttachment: [assetId: number] }>();
const mediaErrors = reactive<Record<string, boolean>>({});
const cleanText = (value: unknown) => String(value ?? '').trim();
const withUnit = (value: unknown, unit: string) => {
  const normalized = cleanText(value);
  if (!normalized) return '';
  return /[a-zA-Z\u4e00-\u9fa5]/.test(normalized) ? normalized : `${normalized}${unit}`;
};
const genderLabel = computed(() => {
  const value = cleanText(props.model.profile.gender).toLowerCase();
  return value === 'male' || value === '1' ? '男' : value === 'female' || value === '2' ? '女' : '';
});
const identityMeta = computed(() => [
  genderLabel.value,
  props.model.profile.age ? `${props.model.profile.age}岁` : '',
  withUnit(props.model.profile.height, 'cm'),
  cleanText(props.model.profile.city),
].filter(Boolean).join(' · '));
const skills = computed(() => collectActorCardSkills(props.model));
const languages = computed(() => Array.from(new Set((props.model.profile.languages || []).map(cleanText).filter(Boolean))));
const profileRows = computed(() => [
  { label: '性别', value: genderLabel.value },
  { label: '年龄', value: props.model.profile.age ? `${props.model.profile.age}岁` : '' },
  { label: '身高', value: withUnit(props.model.profile.height, 'cm') },
  { label: '体重', value: withUnit(props.model.profile.weight, 'kg') },
  { label: '常驻地', value: cleanText(props.model.profile.city) },
  { label: '院校', value: cleanText(props.model.profile.school) },
  { label: '形象', value: cleanText(props.model.profile.bodyType) },
  { label: '发型', value: cleanText(props.model.profile.hairStyle) },
].filter(row => row.value));
const heroImageUrl = computed(() => [props.model.previewImageUrl, props.model.backgroundImageUrl]
  .find(isRemoteActorCardMediaUrl) || '');
const photos = computed(() => props.model.photos.filter(isRemoteActorCardMediaUrl));
const stills = computed(() => props.model.works.flatMap(work => work.stills
  .filter(isRemoteActorCardMediaUrl)
  .map(url => ({ workId: work.id, url }))));
const stillUrls = computed(() => stills.value.map(item => item.url));
const attachmentPages = computed(() => (props.model.attachment?.pageImages || []).filter(isRemoteActorCardMediaUrl));
const videoPoster = computed(() => photos.value[0] || heroImageUrl.value);
const visibleModules = computed(() => props.decoration.modules.filter(module => isDecorationModuleVisible(module, props.model)));
const heroModules = computed(() => visibleModules.value.filter(module => module.layout.zone === 'hero'));
const flowModules = computed(() => visibleModules.value.filter(module => module.layout.zone === 'flow'));
const pageStyle = computed(() => buildDecorationPageStyle(props.decoration));
const heroStyle = computed(() => buildDecorationHeroStyle(props.decoration));
const heroImageStyle = computed(() => buildDecorationHeroImageStyle(props.decoration));
const heroOverlayStyle = computed(() => buildDecorationHeroOverlayStyle(props.decoration));
const flowStyle = computed(() => buildDecorationFlowStyle(props.decoration));
const moduleStyle = (module: ActorCardDecorationModule) => buildDecorationModuleStyle(module);
const profileHeroMeta = (module: ActorCardDecorationModule) => buildDecorationIdentityMeta(module, props.model);
const identityEyebrowStyle = (module: ActorCardDecorationModule) => buildDecorationIdentityEyebrowStyle(module);
const identityNameStyle = (module: ActorCardDecorationModule) => buildDecorationIdentityNameStyle(module);
const identityMetaStyle = (module: ActorCardDecorationModule) => buildDecorationIdentityMetaStyle(module);
const promotionPillStyle = (module: ActorCardDecorationModule) => buildDecorationPromotionPillStyle(module);
const promotionText = computed(() => getActorCardPromotionText(props.model));
const summaryStyle = (module: ActorCardDecorationModule) => ({ WebkitLineClamp: String(module.maxLines || 3) });
const markMediaError = (key: string) => { mediaErrors[key] = true; };
const workCover = (work: ActorCardRenderModel['works'][number]) => work.stills.find(isRemoteActorCardMediaUrl) || '';
const workMeta = (work: ActorCardRenderModel['works'][number]) => [work.workType, work.role ? `饰 ${work.role}` : ''].filter(Boolean).join(' · ');
const previewImages = (urls: string[], current: string) => {
  const available = urls.filter(isRemoteActorCardMediaUrl);
  if (!available.length) return;
  webPlatform.previewImage({ urls: available, current: available.includes(current) ? current : available[0] });
};
const openVideo = () => {
  const url = props.model.video?.url;
  if (!isRemoteActorCardMediaUrl(url)) return;
  webPlatform.navigateTo({ url: `/pkg-tools/video-player/index?type=profile&url=${encodeURIComponent(url)}` });
};
const requestAttachmentPreview = () => {
  if (props.model.settings.showAttachment === false || !props.model.attachment || props.attachmentLoading) return;
  if (attachmentPages.value.length) {
    previewImages(attachmentPages.value, attachmentPages.value[0]);
    return;
  }
  if (!props.allowAttachmentLookup) {
    webPlatform.showToast({ title: '暂无可匿名预览的页图', icon: 'none' });
    return;
  }
  emit('previewAttachment', props.model.attachment.assetId);
};
const callContact = () => {
  const phoneNumber = cleanText(props.model.profile.contact);
  if (!phoneNumber) return;
  webPlatform.makePhoneCall({ phoneNumber, fail: () => webPlatform.showToast({ title: '拨号失败，请稍后重试', icon: 'none' }) });
};

watch(() => props.model, () => {
  Object.keys(mediaErrors).forEach(key => delete mediaErrors[key]);
});
</script>
<style scoped>
/* WeChat view/text defaults, isolated from admin typography/reset. */
.actor-card-decoration div { box-sizing: border-box; }
.actor-card-decoration img { max-width: 100%; }
.actor-card-decoration {
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 28px;
  line-height: 1.5;
  width: 750px;
}

:where(.actor-card-decoration div, .actor-card-decoration span, .actor-card-decoration img, .actor-card-decoration video) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:where(.actor-card-decoration img) {
  display: block;
}

.actor-card-decoration {
  min-height: 100%;
  padding-bottom: 32px;
  box-sizing: border-box;
  color: #171a21;
}
.actor-card-decoration__hero {
  position: relative;
  width: 750px;
  max-width: 750px;
  overflow: hidden;
  background: #eef2ff;
}
.actor-card-decoration__hero-image, .actor-card-decoration__hero-placeholder, .actor-card-decoration__hero-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.actor-card-decoration__hero-image {
  display: block;
}
.actor-card-decoration__hero-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 60px;
  box-sizing: border-box;
  text-align: center;
}
.actor-card-decoration__hero-placeholder-name {
  color: #171a21;
  font-size: 40px;
  font-weight: 700;
}
.actor-card-decoration__hero-placeholder-copy {
  color: #667080;
  font-size: 24px;
}
.actor-card-decoration__hero-shade {
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.24));
}
.actor-card-decoration__flow {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-top: 24px;
  padding-bottom: 24px;
  box-sizing: border-box;
}
.actor-card-decoration__module {
  min-width: 0;
  flex-direction: column;
}
.actor-card-decoration__module--flow {
  max-width: 100%;
  align-self: flex-start;
}
.actor-card-decoration__name {
  display: block;
  font-size: 1.35em;
  font-weight: 700;
  line-height: 1.15;
}
.actor-card-decoration__eyebrow {
  display: block;
  max-width: 100%;
  word-break: break-all;
}
.actor-card-decoration__profile-hero-name {
  width: 100%;
  word-break: break-all;
}
.actor-card-decoration__profile-hero-meta {
  display: block;
  max-width: 100%;
  word-break: break-word;
}
.actor-card-decoration__promotion-pill {
  flex-shrink: 0;
}
.actor-card-decoration__heading {
  display: block;
  width: 100%;
  font-size: 1.05em;
  font-weight: 700;
}
.actor-card-decoration__muted {
  display: block;
  color: inherit;
  font-size: 0.82em;
  line-height: 1.5;
  opacity: 0.72;
}
.actor-card-decoration__summary {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
  -webkit-box-orient: vertical;
}
.actor-card-decoration__introduction {
  display: block;
  width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
}
.actor-card-decoration__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}
.actor-card-decoration__chip {
  padding: 7px 16px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.78em;
  line-height: 1.35;
}
.actor-card-decoration__profile {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
.actor-card-decoration__profile-row {
  min-width: 0;
}
.actor-card-decoration__profile-label {
  display: block;
  font-size: 0.76em;
  opacity: 0.65;
}
.actor-card-decoration__profile-value {
  display: block;
  margin-top: 5px;
  font-weight: 700;
  word-break: break-word;
}
.actor-card-decoration__works {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.actor-card-decoration__works--list {
  grid-template-columns: minmax(0, 1fr);
}
.actor-card-decoration__work {
  display: flex;
  min-width: 0;
  gap: 14px;
}
.actor-card-decoration__work-image {
  width: 128px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #eef2ff;
}
.actor-card-decoration__work-copy {
  min-width: 0;
  flex: 1;
}
.actor-card-decoration__work-title {
  display: block;
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actor-card-decoration__media-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.actor-card-decoration__media-grid--carousel {
  display: flex;
  overflow-x: auto;
}
.actor-card-decoration__media-grid--carousel .actor-card-decoration__media-image {
  width: 300px;
  flex: 0 0 300px;
}
.actor-card-decoration__media-image {
  display: block;
  width: 100%;
  height: 260px;
  border-radius: 10px;
  background: #eef2ff;
}
.actor-card-decoration__video, .actor-card-decoration__video-poster {
  display: block;
  width: 100%;
  height: 360px;
  overflow: hidden;
  border-radius: 10px;
  background: #171a21;
}
.actor-card-decoration__video-poster {
  position: relative;
}
.actor-card-decoration__video-poster-image {
  display: block;
  width: 100%;
  height: 100%;
}
.actor-card-decoration__video-poster-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.38);
  color: #ffffff;
  font-weight: 700;
}
.actor-card-decoration__pdf-pages {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.actor-card-decoration__pdf-page {
  display: block;
  width: 100%;
  min-height: 240px;
  border: 1px solid #e8e8e8;
  background: #f6f7f9;
  box-sizing: border-box;
}
.actor-card-decoration__pdf-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 76px;
  border: 1px solid currentColor;
  border-radius: 10px;
  font-weight: 700;
}
.actor-card-decoration__error {
  display: block;
  color: #ff3b30;
  font-size: 22px;
}
.actor-card-decoration__contact {
  display: block;
  width: 100%;
  font-weight: 700;
  word-break: break-all;
}
</style>
