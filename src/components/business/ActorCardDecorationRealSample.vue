<script setup lang="ts">
import { computed } from 'vue'
import type { DecorationModule } from '../../types/actor-card-decoration'
import type { DecorationCardPreview } from '../../types/actor-card-decoration-binding'
import { MODULE_LABELS } from '../../utils/actor-card-decoration'
const props = defineProps<{ module: DecorationModule; card: DecorationCardPreview }>()
const clean = (v: unknown) => String(v ?? '').trim();
const unit = (v: unknown, suffix: string) => clean(v) ? new RegExp(`${suffix}$`, 'i').test(clean(v)) ? clean(v) : `${clean(v)}${suffix}` : '';
const gender = computed(() => ['male', '1'].includes(clean(props.card.profile?.gender).toLowerCase()) ? '男' : ['female', '2'].includes(clean(props.card.profile?.gender).toLowerCase()) ? '女' : '');
const skills = computed(() => [...new Set([...(props.card.profile?.skillGroups?.professionalAbility ?? []), ...(props.card.profile?.skillGroups?.specialty ?? []), ...(props.card.profile?.skillGroups?.roleType ?? []), ...(props.card.profile?.skills ?? [])].map(clean).filter(Boolean))]);
const languages = computed(() => [...new Set((props.card.profile?.languages ?? []).map(clean).filter(Boolean))]);
const identity = computed(() => [gender.value, props.card.profile?.age ? `${props.card.profile.age}岁` : '', unit(props.card.profile?.height, 'cm'), props.card.profile?.city].filter(Boolean).join(' · '));
const rows = computed(() => [
  ['性别', gender.value], ['年龄', props.card.profile?.age ? `${props.card.profile.age}岁` : ''], ['身高', unit(props.card.profile?.height, 'cm')], ['体重', unit(props.card.profile?.weight, 'kg')], ['常驻地', clean(props.card.profile?.city)], ['院校', clean(props.card.profile?.school)], ['形象', clean(props.card.profile?.bodyType)], ['发型', clean(props.card.profile?.hairStyle)],
].filter(row => row[1]));
const photos = computed(() => (props.module.type === 'stills' ? props.card.works?.flatMap(w => w.stills ?? []) : props.card.photos)?.filter(url => url.startsWith('https://')) ?? [])
const pages = computed(() => props.card.settings?.showAttachment === false ? [] : props.card.attachment?.pageImages?.filter(u => u.startsWith('https://')) ?? [])
</script>
<template>
  <strong v-if="module.type !== 'identity' && !(module.type === 'highlights' && module.layout?.zone === 'hero')">{{ MODULE_LABELS[module.type] }}</strong>
  <template v-if="module.type === 'identity'"><b>{{ card.profile?.name || '未填写姓名' }}</b><span>{{ identity }}</span></template>
  <div v-else-if="module.type === 'highlights'" class="real-chips"><span v-for="skill in skills" :key="skill">{{ skill }}</span></div>
  <template v-else-if="module.type === 'profile'"><div class="real-profile"><div v-for="row in rows" :key="row[0]"><small>{{ row[0] }}</small><b>{{ row[1] }}</b></div></div><div class="real-chips"><span v-for="lang in languages" :key="lang">{{ lang }}</span></div></template>
  <p v-else-if="module.type === 'introduction'" :style="module.presentation === 'summary' ? { display: '-webkit-box', WebkitLineClamp: module.maxLines ?? 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}">{{ card.profile?.introduction || '未填写简介' }}</p>
  <div v-else-if="module.type === 'works'" class="real-works" :class="{ list: module.presentation === 'list' }"><div v-for="(work, i) in card.works" :key="work.id ?? i" class="real-work"><img v-if="work.stills?.[0]?.startsWith('https://')" :src="work.stills[0]" alt="作品剧照" /><div><b>{{ work.title }}</b><p>{{ work.role }}</p></div></div></div>
  <div v-else-if="module.type === 'photos' || module.type === 'stills'" class="real-photos" :class="{ carousel: module.presentation === 'carousel' }"><img v-for="(url, i) in photos" :key="i" :src="url" alt="授权卡片图片" loading="lazy" /></div>
  <span v-else-if="module.type === 'video'">{{ card.settings?.showVideo !== false && card.video?.url ? '▷ 已关联真实视频（请在小程序验证播放）' : '无可展示视频' }}</span>
  <div v-else-if="module.type === 'pdf'"><span>{{ card.settings?.showAttachment !== false ? card.attachment?.filename || '无可展示附件' : '附件已隐藏' }}</span><img v-for="(url, i) in (module.presentation === 'pages' ? pages : [])" :key="i" :src="url" class="pdf-page" alt="PDF页" loading="lazy" /></div>
  <span v-else-if="module.type === 'cooperation'">{{ card.settings?.showContact !== false ? card.profile?.contact || '未公开联系方式' : '联系方式已隐藏' }}</span>
</template>
<style scoped>
.real-profile { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: calc(18 * var(--design-unit)) calc(24 * var(--design-unit)); }
.real-profile small, .real-profile b { display: block; }
.real-profile small { font-size: .76em; opacity: .65; }
.real-profile b { margin-top: calc(5 * var(--design-unit)); }
.real-chips { display: flex; flex-wrap: wrap; width: 100%; gap: calc(10 * var(--design-unit)); }
.real-chips span { padding: calc(7 * var(--design-unit)) calc(16 * var(--design-unit)); border: calc(1 * var(--design-unit)) solid currentColor; border-radius: 999px; font-size: .78em; line-height: 1.35; }
p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.real-photos { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: calc(12 * var(--design-unit)); }
.real-photos img { display: block; width: 100%; height: calc(260 * var(--design-unit)); border-radius: calc(10 * var(--design-unit)); object-fit: cover; }
.real-photos.carousel { display: flex; overflow-x: auto; }
.real-photos.carousel img { width: calc(300 * var(--design-unit)); flex: 0 0 calc(300 * var(--design-unit)); }
.real-works { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: calc(16 * var(--design-unit)); }
.real-works.list { grid-template-columns: minmax(0, 1fr); }
.real-work { display: flex; min-width: 0; gap: calc(14 * var(--design-unit)); }
.real-work img { width: calc(128 * var(--design-unit)); height: calc(96 * var(--design-unit)); flex-shrink: 0; object-fit: cover; border-radius: calc(10 * var(--design-unit)); }
.real-work > div { min-width: 0; }
.real-work b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pdf-page { display: block; width: 100%; }
</style>
