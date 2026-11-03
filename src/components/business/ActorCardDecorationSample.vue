<script setup lang="ts">
import type { DecorationModule } from '../../types/actor-card-decoration'
import { MODULE_LABELS } from '../../utils/actor-card-decoration'
defineProps<{ module: DecorationModule }>()
</script>
<template>
  <strong>{{ MODULE_LABELS[module.type] }}</strong>
  <template v-if="module.type === 'identity'">
    <b>示例演员</b><span>演员 · 个人作品集</span>
  </template>
  <div v-else-if="module.type === 'highlights'" class="sample-chips"><span>表演</span><span>舞蹈</span><span>普通话</span></div>
  <template v-else-if="module.type === 'profile'"><span>身高 172 cm · 体重 55 kg</span><span>常驻城市：示例城市</span></template>
  <p v-else-if="module.type === 'introduction'" :style="module.presentation === 'summary' || module.layout?.zone === 'hero' ? { display: '-webkit-box', WebkitLineClamp: module.maxLines ?? 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}">这是一段用于检查排版的示例简介。擅长角色塑造与舞台表演，持续积累镜头和舞台经验。完整简介用于检查长文本换行、内边距与模块间距，不代表真实演员资料。</p>
  <div v-else-if="module.type === 'works'" class="sample-works" :data-presentation="module.presentation ?? 'cards'"><div>示例作品 A<br>角色：主要角色</div><div>示例作品 B<br>角色：特别出演</div></div>
  <div v-else-if="module.type === 'photos' || module.type === 'stills'" class="sample-media" :data-presentation="module.presentation ?? 'grid'"><span v-for="n in 3" :key="n">照片 {{ n }}</span></div>
  <div v-else-if="module.type === 'video'" class="sample-video">{{ module.presentation === 'poster' ? '视频封面' : '▷ 示例视频播放器' }}</div>
  <div v-else-if="module.type === 'pdf'" class="sample-pdf" :data-presentation="module.presentation ?? 'button'">{{ module.presentation === 'pages' ? 'PDF · 示例预览页 1 / 3' : '查看 PDF 资料 ↗' }}</div>
  <span v-else>合作联系 · 实际内容受名片隐私设置控制</span>
</template>
<style scoped>
strong, b, span, p { overflow-wrap: anywhere; }
p { margin: 0; }
.sample-chips { display: flex; flex-wrap: wrap; gap: inherit; }
.sample-chips span { border: 1px solid currentColor; border-radius: 999px; padding: 0 6px; }
.sample-media { display: grid; grid-template-columns: repeat(3, 1fr); gap: inherit; }
.sample-media span { display: grid; place-items: center; aspect-ratio: 3 / 4; background: #94a3b833; }
.sample-media[data-presentation="carousel"] { display: flex; overflow: hidden; }
.sample-media[data-presentation="carousel"] span { min-width: 80%; }
.sample-works { display: grid; gap: inherit; }
.sample-works[data-presentation="cards"] div { border: 1px solid currentColor; padding: 6px; border-radius: inherit; }
.sample-video { aspect-ratio: 16 / 9; display: grid; place-items: center; background: #94a3b833; }
.sample-pdf { border: 1px solid currentColor; padding: 6px; text-align: center; }
.sample-pdf[data-presentation="pages"] { aspect-ratio: 3 / 4; display: grid; place-items: center; }
</style>
