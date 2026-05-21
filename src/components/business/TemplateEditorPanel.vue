<script setup lang="ts">
import { computed } from 'vue'
import TemplateConfigPanel from '@/components/business/TemplateConfigPanel.vue'
import TemplateMiniProgramPreview from '@/components/business/TemplateMiniProgramPreview.vue'
import TemplateOptionGrid from '@/components/business/TemplateOptionGrid.vue'
import TemplateToggleGrid from '@/components/business/TemplateToggleGrid.vue'
import { ADMIN_BRAND } from '@/constants/brand'
import type {
  ArtifactConfigState,
  EditorFormState,
  HeroStyle,
  PageConfigState,
  PageDensity,
  PageLayoutPreset,
  PageSurface,
  PrimaryAction,
  SecondaryAction,
  TemplateColorField,
  TemplateConfigOption,
  TemplatePreviewStatItem,
  TemplatePreviewStyle,
  TemplatePreviewTimelineItem,
  TemplateToggleItem,
  ThemeConfigState,
} from '@/types/template-editor'

const editorForm = defineModel<EditorFormState>('editorForm', { required: true })
const themeConfig = defineModel<ThemeConfigState>('themeConfig', { required: true })
const artifactConfig = defineModel<ArtifactConfigState>('artifactConfig', { required: true })
const pageConfig = defineModel<PageConfigState>('pageConfig', { required: true })

defineProps<{
  themeColorFields: readonly TemplateColorField[]
  layoutPresetOptions: readonly TemplateConfigOption<PageLayoutPreset>[]
  surfaceOptions: readonly TemplateConfigOption<PageSurface>[]
  densityOptions: readonly TemplateConfigOption<PageDensity>[]
  heroStyleOptions: readonly TemplateConfigOption<HeroStyle>[]
  primaryActionOptions: readonly TemplateConfigOption<PrimaryAction>[]
  secondaryActionOptions: readonly TemplateConfigOption<SecondaryAction>[]
  previewLayout: PageLayoutPreset
  previewSurface: PageSurface
  previewHeroStyle: HeroStyle
  previewThemeStyle: TemplatePreviewStyle
  previewSurfaceLabel: string
  previewLayoutLabel: string
  previewHeroLabel: string
  previewFocusItems: readonly string[]
  previewProfileTitle: string
  previewProfileText: string
  previewStatItems: readonly TemplatePreviewStatItem[]
  previewTimelineItems: readonly TemplatePreviewTimelineItem[]
  previewPrimaryActionLabel: string
  previewSecondaryActionLabel: string
}>()

type SectionToggleKey = 'showProfile' | 'showStats' | 'showTimeline' | 'showContactCta'

const sectionToggleItems = computed<TemplateToggleItem[]>(() => [
  {
    key: 'showProfile',
    label: '档案信息卡',
    description: '展示一句话简介与身份说明。',
    value: pageConfig.value.showProfile,
  },
  {
    key: 'showStats',
    label: '数据指标块',
    description: '展示等级、邀请门槛和发布状态。',
    value: pageConfig.value.showStats,
  },
  {
    key: 'showTimeline',
    label: '内容节奏区',
    description: '展示页面叙事和模块承接顺序。',
    value: pageConfig.value.showTimeline,
  },
  {
    key: 'showContactCta',
    label: '底部行动区',
    description: '展示主 CTA 与次 CTA 按钮。',
    value: pageConfig.value.showContactCta,
  },
])

function updateLayoutPreset(value: string) {
  pageConfig.value.layoutPreset = value as PageLayoutPreset
}

function updateSurface(value: string) {
  pageConfig.value.surface = value as PageSurface
}

function updateDensity(value: string) {
  pageConfig.value.density = value as PageDensity
}

function updateHeroStyle(value: string) {
  pageConfig.value.heroStyle = value as HeroStyle
}

function updateSectionToggle(key: string, value: boolean) {
  pageConfig.value[key as SectionToggleKey] = value
}
</script>

<template>
  <section class="template-editor-panel">
    <TemplateMiniProgramPreview
      :preview-layout="previewLayout"
      :preview-surface="previewSurface"
      :preview-hero-style="previewHeroStyle"
      :theme-style="previewThemeStyle"
      :surface-label="previewSurfaceLabel"
      :hero-eyebrow="artifactConfig.heroEyebrow"
      :cover-ready="Boolean(artifactConfig.coverImage.trim())"
      :template-name="editorForm.templateName || ''"
      :template-scene-code="editorForm.templateSceneCode || ''"
      :layout-label="previewLayoutLabel"
      :hero-label="previewHeroLabel"
      :focus-items="previewFocusItems"
      :show-profile="pageConfig.showProfile"
      :profile-title="previewProfileTitle"
      :profile-text="previewProfileText"
      :show-stats="pageConfig.showStats"
      :stat-items="previewStatItems"
      :show-timeline="pageConfig.showTimeline"
      :timeline-items="previewTimelineItems"
      :show-contact-cta="pageConfig.showContactCta"
      :primary-action-label="previewPrimaryActionLabel"
      :secondary-action-visible="pageConfig.secondaryAction !== 'none'"
      :secondary-action-label="previewSecondaryActionLabel"
    />

    <div class="template-editor-panel__controls">
      <TemplateConfigPanel eyebrow="THEME CONFIG / 主题配置" title="用颜色配置生成主题 JSON" hint="保存时写入 baseThemeJson">
        <div class="template-config-grid">
          <label v-for="field in themeColorFields" :key="field.key" class="template-color-row">
            <span>{{ field.label }}</span>
            <el-color-picker v-model="themeConfig[field.key]" />
            <el-input v-model="themeConfig[field.key]" />
          </label>
        </div>
      </TemplateConfigPanel>

      <TemplateConfigPanel
        eyebrow="PAGE CONFIG / 页面结构"
        title="按小程序页面结构配置"
        hint="保存时写入 artifactPresetJson.pageConfig，并派生 layoutVariant"
      >
        <div class="template-page-config">
          <div class="template-page-config__group">
            <div class="template-page-config__label">
              <strong>布局预设</strong>
              <span>决定首屏骨架与信息分布。</span>
            </div>
            <TemplateOptionGrid :options="layoutPresetOptions" :selected="pageConfig.layoutPreset" @select="updateLayoutPreset" />
          </div>

          <div class="template-page-config__inline">
            <div class="template-page-config__group">
              <div class="template-page-config__label">
                <strong>背景质感</strong>
                <span>决定页面外壳氛围。</span>
              </div>
              <TemplateOptionGrid compact :options="surfaceOptions" :selected="pageConfig.surface" @select="updateSurface" />
            </div>

            <div class="template-page-config__group">
              <div class="template-page-config__label">
                <strong>视觉密度</strong>
                <span>决定模块间距和节奏。</span>
              </div>
              <TemplateOptionGrid compact :options="densityOptions" :selected="pageConfig.density" @select="updateDensity" />
            </div>

            <div class="template-page-config__group">
              <div class="template-page-config__label">
                <strong>Hero 形式</strong>
                <span>决定首屏文案姿态。</span>
              </div>
              <TemplateOptionGrid compact :options="heroStyleOptions" :selected="pageConfig.heroStyle" @select="updateHeroStyle" />
            </div>
          </div>

          <div class="template-page-config__group">
            <div class="template-page-config__label">
              <strong>页面模块</strong>
              <span>控制小程序首页是否展示档案、数据、节奏和 CTA 模块。</span>
            </div>
            <TemplateToggleGrid :items="sectionToggleItems" @update="updateSectionToggle" />
          </div>

          <div class="template-page-config__actions">
            <el-form-item label="主行动">
              <el-select v-model="pageConfig.primaryAction" style="width: 100%">
                <el-option v-for="item in primaryActionOptions" :key="item.key" :label="item.label" :value="item.key" />
              </el-select>
            </el-form-item>
            <el-form-item label="次行动">
              <el-select v-model="pageConfig.secondaryAction" style="width: 100%">
                <el-option v-for="item in secondaryActionOptions" :key="item.key" :label="item.label" :value="item.key" />
              </el-select>
            </el-form-item>
          </div>
        </div>
      </TemplateConfigPanel>

      <TemplateConfigPanel eyebrow="ARTIFACT CONFIG / 分享产物" title="用表单生成分享产物 JSON" hint="保存时写入 artifactPresetJson">
        <div class="template-artifact-form">
          <el-form-item label="封面图 URL">
            <el-input v-model="artifactConfig.coverImage" :placeholder="`可选：${ADMIN_BRAND.platformName}封面图 URL`" />
          </el-form-item>
          <el-form-item label="首屏眉标">
            <el-input v-model="artifactConfig.heroEyebrow" placeholder="请输入首屏眉标" />
          </el-form-item>
          <div class="template-artifact-form__focus">
            <span>内容聚焦</span>
            <el-input v-model="artifactConfig.focus1" placeholder="聚焦点 1" />
            <el-input v-model="artifactConfig.focus2" placeholder="聚焦点 2" />
            <el-input v-model="artifactConfig.focus3" placeholder="聚焦点 3" />
          </div>
          <div class="template-artifact-options">
            <article>
              <div>
                <strong>小程序分享卡</strong>
                <span>生成 shareCard 配置</span>
              </div>
              <el-switch v-model="artifactConfig.shareCardEnabled" />
              <el-select v-model="artifactConfig.shareCardRatio" style="width: 120px">
                <el-option label="1:1" value="1:1" />
                <el-option label="4:5" value="4:5" />
                <el-option label="3:4" value="3:4" />
              </el-select>
            </article>
            <article>
              <div>
                <strong>分享海报</strong>
                <span>生成 poster 配置</span>
              </div>
              <el-switch v-model="artifactConfig.posterEnabled" />
              <el-select v-model="artifactConfig.posterRatio" style="width: 120px">
                <el-option label="3:4" value="3:4" />
                <el-option label="4:5" value="4:5" />
                <el-option label="9:16" value="9:16" />
              </el-select>
            </article>
          </div>
        </div>
      </TemplateConfigPanel>
    </div>
  </section>
</template>

<style scoped lang="scss">
.template-editor-panel {
  display: grid;
  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.template-editor-panel__controls {
  display: grid;
  gap: 14px;
}

.template-config-grid {
  display: grid;
  gap: 12px;
}

.template-color-row {
  display: grid;
  grid-template-columns: 92px 60px minmax(0, 1fr);
  gap: 12px;
  align-items: center;

  span {
    color: rgba(47, 36, 27, 0.68);
    font-size: 13px;
    font-weight: 700;
  }
}

.template-page-config {
  display: grid;
  gap: 16px;
}

.template-page-config__group {
  display: grid;
  gap: 10px;
}

.template-page-config__label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;

  strong {
    font-size: 14px;
  }

  span {
    color: rgba(47, 36, 27, 0.5);
    font-size: 12px;
    line-height: 1.5;
    text-align: right;
  }
}

.template-page-config__inline {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.template-page-config__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.template-artifact-form {
  display: grid;
  gap: 14px;
}

.template-artifact-form__focus {
  display: grid;
  gap: 10px;

  > span {
    color: rgba(47, 36, 27, 0.68);
    font-size: 13px;
    font-weight: 700;
  }
}

.template-artifact-options {
  display: grid;
  gap: 12px;

  article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid rgba(80, 63, 47, 0.08);
    border-radius: 18px;
    background: rgba(250, 245, 237, 0.76);
  }

  strong {
    display: block;
    margin-bottom: 4px;
  }

  span {
    color: rgba(47, 36, 27, 0.48);
    font-size: 12px;
  }
}

@media (max-width: 1400px) {
  .template-editor-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .template-page-config__inline,
  .template-page-config__actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .template-artifact-options article,
  .template-color-row,
  .template-page-config__label {
    grid-template-columns: 1fr;
  }
}
</style>
