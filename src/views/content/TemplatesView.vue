<template>
  <PageContainer>
    <template #actions>
      <PermissionButton action="action.content.template.create" type="primary" @click="openCreate">新建模板</PermissionButton>
    </template>

    <TemplateOverviewPanel
      v-model:view-mode="viewMode"
      :segments="segmentOptions"
      :active-segment="activeSegment"
      :stats="overviewStats"
      @switch-segment="switchSegment"
    />

    <FilterPanel
      class="template-filter-panel"
      description="按场景、状态和层级筛选风格模板；页面主表达为模板卡片库，发布、回滚、启停用均基于当前真实模板配置。"
    >
      <el-form :model="filters" inline>
        <el-form-item label="场景">
          <el-input v-model="filters.templateSceneCode" clearable placeholder="模板场景码" />
        </el-form-item>
        <el-form-item label="层级">
          <el-input v-model="filters.tier" clearable placeholder="tier" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusValue" clearable style="width: 160px" placeholder="全部状态">
            <el-option label="草稿" :value="0" />
            <el-option label="已发布" :value="1" />
            <el-option label="已停用" :value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadList">查询</el-button>
      </template>
    </FilterPanel>

    <section v-if="viewMode === 'gallery'" class="template-gallery-shell">
      <div v-if="loading" class="template-gallery__loading">模板加载中…</div>
      <template v-else-if="rows.length">
        <div class="template-gallery">
          <TemplateGalleryCard
            v-for="row in rows"
            :key="row.templateId"
            :row="row"
            :cover-tone="resolveSceneTone(row.templateSceneCode)"
            :tier-label="resolveTierLabel(row.tier)"
            :status-meta="resolveTemplateStatus(row.status)"
            :updated-at="formatDateTime(row.updateTime)"
            @edit="openEdit"
            @toggle-status="toggleStatus"
            @sort="openSort"
            @publish="openPublish"
            @rollback="openRollback"
          />
        </div>

        <div class="pager">
          <AdminPager
            v-model:current-page="filters.pageNo"
            v-model:page-size="filters.pageSize"
            layout="total, prev, pager, next"
            :total="total"
            @current-change="loadList"
          />
        </div>
      </template>
      <div v-else class="table-empty">
        <strong>当前条件下没有风格模板</strong>
        <p>可以切换状态、场景或层级，查看其它真实模板配置。</p>
      </div>
    </section>

    <el-card v-else class="table-card template-table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">TEMPLATE LIST / 风格模板</p>
          <h3>列表视图</h3>
        </div>
        <span class="table-header__hint">列表视图用于配置、发布与回滚排查；主表达已切回模板库卡片网格。</span>
      </div>
      <el-table class="template-table" :data="rows" v-loading="loading">
        <el-table-column label="模板编码" min-width="164">
          <template #default="{ row }">
            <span class="template-code-cell">{{ row.templateCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板名称" min-width="180" />
        <el-table-column prop="templateSceneCode" label="场景" min-width="120" />
        <el-table-column prop="tier" label="层级" min-width="120" />
        <el-table-column prop="requiredLevel" label="等级门槛" min-width="100" />
        <el-table-column prop="requiredInviteCount" label="邀请门槛" min-width="100" />
        <el-table-column label="解锁条件" min-width="110">
          <template #default="{ row }">{{ row.unlockRequired ? '需解锁' : '公开' }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="resolveTemplateStatus(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="220">
          <template #default="{ row }">
            <TableActions>
              <PermissionButton link type="primary" action="action.content.template.edit" @click="openEdit(row)">基础编辑</PermissionButton>
              <PermissionButton link type="warning" action="action.content.template.sort" @click="openSort(row)">排序</PermissionButton>
              <PermissionButton link type="success" action="action.content.template.publish" @click="openPublish(row)">发布</PermissionButton>
              <PermissionButton link type="danger" action="action.content.template.rollback" @click="openRollback(row)">回滚</PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <AdminPager
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          layout="total, prev, pager, next"
          :total="total"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <el-dialog v-model="editorVisible" :title="editorMode === 'create' ? '新建模板' : '基础编辑'" width="1120px" destroy-on-close>
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">TEMPLATE EDITOR / 模板编辑</p>
        <strong>{{ editorMode === 'create' ? '创建模板' : '编辑模板基础字段' }}</strong>
        <p>当前用可视化配置生成模板运行参数，不再要求直接手写主题或产物 JSON。</p>
      </section>
      <el-form label-position="top" :model="editorForm">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="模板编码"><el-input v-model="editorForm.templateCode" :disabled="editorMode === 'edit'" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="模板名称"><el-input v-model="editorForm.templateName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="场景"><el-input v-model="editorForm.templateSceneCode" :disabled="editorMode === 'edit'" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="层级"><el-input v-model="editorForm.tier" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="布局变体（派生）"><el-input :model-value="pageConfig.layoutPreset" disabled /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="等级门槛（派生）"><el-input-number v-model="editorForm.requiredLevel" :min="0" style="width: 100%" disabled /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="邀请门槛"><el-input-number v-model="editorForm.requiredInviteCount" :min="0" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="说明"><el-input v-model="editorForm.description" type="textarea" :rows="3" /></el-form-item></el-col>
          <el-col :span="24">
            <TemplateEditorPanel
              v-model:editor-form="editorForm"
              v-model:theme-config="themeConfig"
              v-model:artifact-config="artifactConfig"
              v-model:page-config="pageConfig"
              :theme-color-fields="themeColorFields"
              :layout-preset-options="layoutPresetOptions"
              :surface-options="surfaceOptions"
              :density-options="densityOptions"
              :hero-style-options="heroStyleOptions"
              :primary-action-options="primaryActionOptions"
              :secondary-action-options="secondaryActionOptions"
              :preview-layout="pageConfig.layoutPreset"
              :preview-surface="pageConfig.surface"
              :preview-hero-style="pageConfig.heroStyle"
              :preview-theme-style="previewThemeStyle"
              :preview-surface-label="previewSurfaceLabel"
              :preview-layout-label="previewLayoutLabel"
              :preview-hero-label="previewHeroLabel"
              :preview-focus-items="previewFocusItems"
              :preview-profile-title="previewProfileTitle"
              :preview-profile-text="previewProfileText"
              :preview-stat-items="previewStatItems"
              :preview-timeline-items="previewTimelineItems"
              :preview-primary-action-label="previewPrimaryActionLabel"
              :preview-secondary-action-label="previewSecondaryActionLabel"
            />
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEditor">{{ editorMode === 'create' ? '创建模板' : '保存修改' }}</el-button>
      </template>
    </el-dialog>

    <AuditConfirmDialog
      v-model="publishVisible"
      title="发布模板"
      confirm-text="确认发布"
      reason-label="发布说明"
      placeholder="请输入版本说明"
      :meta="publishMeta"
      @submit="submitPublish"
    />

    <AuditConfirmDialog
      v-model="rollbackVisible"
      title="回滚模板"
      confirm-text="确认回滚"
      reason-label="回滚说明"
      placeholder="请输入回滚原因"
      :meta="rollbackMeta"
      @submit="submitRollback"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AuditConfirmDialog from '@/components/dialogs/AuditConfirmDialog.vue'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import TemplateEditorPanel from '@/components/business/TemplateEditorPanel.vue'
import TemplateGalleryCard from '@/components/business/TemplateGalleryCard.vue'
import TemplateOverviewPanel from '@/components/business/TemplateOverviewPanel.vue'
import {
  createTemplate,
  disableTemplate,
  enableTemplate,
  fetchTemplateDetail,
  fetchTemplates,
  publishTemplate,
  rollbackTemplate,
  sortTemplate,
  updateTemplate,
} from '@/api/content'
import { templateStatusMap } from '@/constants/status'
import { formatDateTime } from '@/utils/format'
import type { CreateTemplatePayload, TemplateItem, TemplateQuery, UpdateTemplatePayload } from '@/types/content'
import type {
  ArtifactConfigState,
  EditorFormState,
  HeroStyle,
  PageConfigState,
  PageDensity,
  PageLayoutPreset,
  PageLayoutVariant,
  PageSurface,
  PrimaryAction,
  SecondaryAction,
  TemplateColorField,
  TemplateConfigOption,
  TemplateOverviewStat,
  TemplateSegmentKey,
  TemplateSegmentOption,
  TemplateViewMode,
  ThemeConfigState,
} from '@/types/template-editor'
import AdminPager from '@/components/business/AdminPager.vue'

const loading = ref(false)
const submitting = ref(false)
const rows = ref<TemplateItem[]>([])
const total = ref(0)
const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const publishVisible = ref(false)
const rollbackVisible = ref(false)
const currentRow = ref<TemplateItem | null>(null)
const currentTemplateStatus = ref(1)
const activeSegment = ref<TemplateSegmentKey>('all')
const viewMode = ref<TemplateViewMode>('gallery')

const filters = reactive<TemplateQuery>({
  pageNo: 1,
  pageSize: 20,
  templateSceneCode: '',
  status: undefined,
  tier: '',
})

const statusValue = computed({
  get: () => filters.status,
  set: (value: number | undefined) => {
    filters.status = value == null ? undefined : Number(value)
  },
})

const publishedCount = computed(() => rows.value.filter((item) => item.status === 1).length)
const draftCount = computed(() => rows.value.filter((item) => item.status === 0).length)
const unlockRequiredCount = computed(() => rows.value.filter((item) => item.unlockRequired).length)

const segmentOptions = computed<TemplateSegmentOption[]>(() => [
  { key: 'all' as TemplateSegmentKey, label: '全部', count: total.value },
  { key: 'draft' as TemplateSegmentKey, label: '草稿', count: draftCount.value },
  { key: 'published' as TemplateSegmentKey, label: '已发布', count: publishedCount.value },
  { key: 'disabled' as TemplateSegmentKey, label: '已停用', count: rows.value.filter((item) => item.status === 2).length },
])

const overviewStats = computed<TemplateOverviewStat[]>(() => [
  { label: '当前筛选模板', value: total.value },
  { label: '已发布', value: publishedCount.value },
  { label: '草稿', value: draftCount.value },
  { label: '进阶模板', value: unlockRequiredCount.value },
])

const editorForm = reactive<EditorFormState>({
  templateCode: '',
  templateName: '',
  templateSceneCode: '',
  description: '',
  layoutVariant: '',
  tier: '',
  requiredLevel: 0,
  requiredInviteCount: 0,
  unlockRequired: false,
  baseThemeJson: '',
  artifactPresetJson: '',
})

const themeJsonDraft = ref<Record<string, unknown>>({})
const artifactJsonDraft = ref<Record<string, unknown>>({})

const themeConfig = reactive<ThemeConfigState>({
  primary: '#2F6B5F',
  accent: '#D6EAD9',
  background: '#102A26',
  text: '#F3F7F6',
  heroText: '#FFFFFF',
})

const artifactConfig = reactive<ArtifactConfigState>({
  coverImage: '',
  heroEyebrow: '',
  focus1: '',
  focus2: '',
  focus3: '',
  shareCardEnabled: true,
  shareCardRatio: '1:1',
  posterEnabled: true,
  posterRatio: '3:4',
})

const pageConfig = reactive<PageConfigState>({
  layoutPreset: 'magazine',
  surface: 'paper',
  density: 'balanced',
  heroStyle: 'editorial',
  showProfile: true,
  showStats: true,
  showTimeline: true,
  showContactCta: true,
  primaryAction: 'contact',
  secondaryAction: 'share',
})

const themeColorFields = [
  { key: 'primary', label: '主色' },
  { key: 'accent', label: '强调色' },
  { key: 'background', label: '背景色' },
  { key: 'text', label: '正文色' },
  { key: 'heroText', label: '首屏文字色' },
] as const satisfies readonly TemplateColorField[]

const layoutPresetOptions = [
  { key: 'magazine', label: '杂志首屏', description: '大标题、短摘要和轻内容节奏。' },
  { key: 'portfolio', label: '作品集', description: '强化档案信息与作品亮点。' },
  { key: 'casting', label: '选角名片', description: '突出行动区和快速联系。' },
] as const satisfies readonly TemplateConfigOption<PageLayoutPreset>[]

const surfaceOptions = [
  { key: 'paper', label: '纸感', description: '温和留白' },
  { key: 'softlight', label: '棚拍', description: '柔光层次' },
  { key: 'cinema', label: '电影', description: '暗场聚焦' },
] as const satisfies readonly TemplateConfigOption<PageSurface>[]

const densityOptions = [
  { key: 'compact', label: '紧凑', description: '首屏信息更多' },
  { key: 'balanced', label: '均衡', description: '中等节奏' },
  { key: 'immersive', label: '沉浸', description: '大间距强视觉' },
] as const satisfies readonly TemplateConfigOption<PageDensity>[]

const heroStyleOptions = [
  { key: 'editorial', label: '编辑叙事', description: '标题驱动' },
  { key: 'poster', label: '海报视觉', description: '封面驱动' },
  { key: 'profile', label: '档案卡片', description: '身份驱动' },
] as const satisfies readonly TemplateConfigOption<HeroStyle>[]

const primaryActionOptions = [
  { key: 'contact', label: '联系本人' },
  { key: 'save', label: '收藏名片' },
  { key: 'apply', label: '发起合作' },
] as const satisfies readonly TemplateConfigOption<PrimaryAction>[]

const secondaryActionOptions = [
  { key: 'none', label: '不展示' },
  { key: 'share', label: '转发名片' },
  { key: 'poster', label: '生成海报' },
] as const satisfies readonly TemplateConfigOption<SecondaryAction>[]

const layoutPresetKeys = layoutPresetOptions.map((item) => item.key)
const surfaceKeys = surfaceOptions.map((item) => item.key)
const densityKeys = densityOptions.map((item) => item.key)
const heroStyleKeys = heroStyleOptions.map((item) => item.key)
const primaryActionKeys = primaryActionOptions.map((item) => item.key)
const secondaryActionKeys = secondaryActionOptions.map((item) => item.key)

const layoutVariantByPreset: Record<PageLayoutPreset, PageLayoutVariant> = {
  magazine: 'magazine',
  portfolio: 'spacious',
  casting: 'compact',
}

const previewDensityMap = {
  compact: {
    gap: '10px',
    padding: '10px',
    heroPadding: '14px',
    heroMinHeight: '140px',
  },
  balanced: {
    gap: '12px',
    padding: '12px',
    heroPadding: '16px',
    heroMinHeight: '156px',
  },
  immersive: {
    gap: '16px',
    padding: '14px',
    heroPadding: '18px',
    heroMinHeight: '182px',
  },
} as const

const previewThemeStyle = computed(() => {
  const densityToken = previewDensityMap[pageConfig.density]
  return {
    '--template-preview-primary': themeConfig.primary,
    '--template-preview-accent': themeConfig.accent,
    '--template-preview-background': themeConfig.background,
    '--template-preview-text': themeConfig.text,
    '--template-preview-hero-text': themeConfig.heroText,
    '--template-preview-gap': densityToken.gap,
    '--template-preview-padding': densityToken.padding,
    '--template-preview-hero-padding': densityToken.heroPadding,
    '--template-preview-hero-min-height': densityToken.heroMinHeight,
  }
})

const previewFocusItems = computed(() =>
  [artifactConfig.focus1, artifactConfig.focus2, artifactConfig.focus3].map((item) => item.trim()).filter(Boolean),
)

const previewLayoutLabel = computed(() => layoutPresetOptions.find((item) => item.key === pageConfig.layoutPreset)?.label || '杂志首屏')
const previewHeroLabel = computed(() => heroStyleOptions.find((item) => item.key === pageConfig.heroStyle)?.label || '编辑叙事')
const previewSurfaceLabel = computed(() => surfaceOptions.find((item) => item.key === pageConfig.surface)?.label || '纸感')
const previewPrimaryActionLabel = computed(
  () => primaryActionOptions.find((item) => item.key === pageConfig.primaryAction)?.label || '联系本人',
)
const previewSecondaryActionLabel = computed(
  () => secondaryActionOptions.find((item) => item.key === pageConfig.secondaryAction)?.label || '转发名片',
)
const previewProfileTitle = computed(() => `${editorForm.unlockRequired ? '进阶模板' : '公开模板'} · ${resolveTierLabel(editorForm.tier)}`)
const previewProfileText = computed(() => {
  const summary = editorForm.description?.trim()
  if (summary) {
    return summary
  }
  return ''
})
const previewStatItems = computed(() => [
  { label: '等级', value: `L${editorForm.requiredLevel || 1}` },
  { label: '邀请', value: `${editorForm.requiredInviteCount ?? 0}` },
  { label: '模板', value: resolveTemplateStatus(currentTemplateStatus.value).label },
  { label: '布局', value: previewLayoutLabel.value },
])
const previewEnabledSections = computed(() => {
  const result: string[] = []
  if (pageConfig.showProfile) {
    result.push('档案')
  }
  if (pageConfig.showStats) {
    result.push('指标')
  }
  if (pageConfig.showTimeline) {
    result.push('节奏')
  }
  if (pageConfig.showContactCta) {
    result.push('行动')
  }
  return result
})
const previewTimelineItems = computed(() => [
  { title: '首屏骨架', description: `${previewLayoutLabel.value} · ${previewHeroLabel.value}` },
  { title: '模块承接', description: previewEnabledSections.value.join(' / ') || '仅保留 Hero' },
  {
    title: '转化动作',
    description: pageConfig.showContactCta
      ? `${previewPrimaryActionLabel.value}${pageConfig.secondaryAction !== 'none' ? ` / ${previewSecondaryActionLabel.value}` : ''}`
      : '已关闭 CTA',
  },
])

const publishMeta = computed(() => [
  { label: '模板', value: currentRow.value?.templateName },
  { label: '模板编码', value: currentRow.value?.templateCode },
  { label: '当前状态', value: templateStatusMap[currentRow.value?.status || 0]?.label },
])

const rollbackMeta = computed(() => [
  { label: '模板', value: currentRow.value?.templateName },
  { label: '模板编码', value: currentRow.value?.templateCode },
  { label: '回滚来源版本', value: '需手动填写 sourceVersion' },
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRequiredObjectJson(raw: string | null | undefined, label: string) {
  if (!raw?.trim()) {
    throw new Error(`${label} 为空，无法编辑模板配置`)
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      throw new Error(`${label} 必须是 JSON 对象`)
    }
    return parsed
  } catch {
    throw new Error(`${label} 不是有效 JSON 对象`)
  }
}

function readOptionalText(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readRequiredText(record: Record<string, unknown>, key: string, label: string) {
  const value = readOptionalText(record, key)
  if (!value) {
    throw new Error(`${label} 缺失`)
  }
  return value
}

function readRequiredBoolean(record: Record<string, unknown>, key: string, label: string) {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`${label} 缺失或格式错误`)
  }
  return value
}

function readRequiredOption<T extends string>(record: Record<string, unknown>, key: string, options: readonly T[], label: string) {
  const value = readRequiredText(record, key, label)
  if (!options.includes(value as T)) {
    throw new Error(`${label} 不在当前枚举内`)
  }
  return value as T
}

function readCurrentStringArray(record: Record<string, unknown>, key: string) {
  const candidate = record[key]
  if (candidate == null) {
    return []
  }
  if (!Array.isArray(candidate)) {
    throw new Error(`${key} 必须是字符串数组`)
  }
  return candidate.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function readRequiredRecord(record: Record<string, unknown>, key: string, label: string) {
  const value = record[key]
  if (!isRecord(value)) {
    throw new Error(`${label} 缺失或格式错误`)
  }
  return value
}

function readOptionalRecord(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return isRecord(value) ? value : null
}

function readOptionalTextWithFallback(record: Record<string, unknown> | null, key: string, fallback: string) {
  if (!record) {
    return fallback
  }
  const value = readOptionalText(record, key)
  return value || fallback
}

function readOptionalBooleanWithFallback(record: Record<string, unknown> | null, key: string, fallback: boolean) {
  if (!record) {
    return fallback
  }
  const value = record[key]
  return typeof value === 'boolean' ? value : fallback
}

function readOptionalOptionWithFallback<T extends string>(
  record: Record<string, unknown> | null,
  key: string,
  options: readonly T[],
  fallback: T,
) {
  if (!record) {
    return fallback
  }
  const value = readOptionalText(record, key)
  return options.includes(value as T) ? value as T : fallback
}

function writeJson(record: Record<string, unknown>) {
  return JSON.stringify(record, null, 2)
}

function initializeThemeConfig() {
  themeJsonDraft.value = {}
  themeConfig.primary = '#2F6B5F'
  themeConfig.accent = '#D6EAD9'
  themeConfig.background = '#102A26'
  themeConfig.text = '#F3F7F6'
  themeConfig.heroText = '#FFFFFF'
}

function initializeArtifactConfig() {
  artifactJsonDraft.value = {}
  artifactConfig.coverImage = ''
  artifactConfig.heroEyebrow = ''
  artifactConfig.focus1 = ''
  artifactConfig.focus2 = ''
  artifactConfig.focus3 = ''
  artifactConfig.shareCardEnabled = true
  artifactConfig.shareCardRatio = '1:1'
  artifactConfig.posterEnabled = true
  artifactConfig.posterRatio = '3:4'
  pageConfig.layoutPreset = 'magazine'
  pageConfig.surface = 'paper'
  pageConfig.density = 'balanced'
  pageConfig.heroStyle = 'editorial'
  pageConfig.showProfile = true
  pageConfig.showStats = true
  pageConfig.showTimeline = true
  pageConfig.showContactCta = true
  pageConfig.primaryAction = 'contact'
  pageConfig.secondaryAction = 'share'
}

function hydrateThemeConfig(raw?: string | null) {
  initializeThemeConfig()
  const parsedRoot = parseRequiredObjectJson(raw, 'baseThemeJson')
  themeJsonDraft.value = parsedRoot
  const themeNode = readOptionalRecord(parsedRoot, 'themeColors')
  themeConfig.primary = readOptionalTextWithFallback(themeNode, 'primary', themeConfig.primary)
  themeConfig.accent = readOptionalTextWithFallback(themeNode, 'accent', themeConfig.accent)
  themeConfig.background = readOptionalTextWithFallback(themeNode, 'background', themeConfig.background)
  themeConfig.text = readOptionalTextWithFallback(themeNode, 'text', themeConfig.text)
  themeConfig.heroText = readOptionalTextWithFallback(themeNode, 'heroText', themeConfig.heroText)
}

function hydrateArtifactConfig(raw?: string | null) {
  initializeArtifactConfig()
  const parsedRoot = parseRequiredObjectJson(raw, 'artifactPresetJson')
  artifactJsonDraft.value = parsedRoot
  artifactConfig.coverImage = readOptionalText(parsedRoot, 'coverImage')
  artifactConfig.heroEyebrow = readOptionalText(parsedRoot, 'heroEyebrow')
  const focusItems = Array.isArray(parsedRoot.contentFocus)
    ? parsedRoot.contentFocus.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  artifactConfig.focus1 = focusItems[0] || ''
  artifactConfig.focus2 = focusItems[1] || ''
  artifactConfig.focus3 = focusItems[2] || ''
  const shareCardNode = readOptionalRecord(parsedRoot, 'miniProgramCard') || readOptionalRecord(parsedRoot, 'shareCard')
  const posterNode = readOptionalRecord(parsedRoot, 'poster')
  artifactConfig.shareCardEnabled = readOptionalBooleanWithFallback(shareCardNode, 'enabled', artifactConfig.shareCardEnabled)
  artifactConfig.shareCardRatio = readOptionalTextWithFallback(shareCardNode, 'ratio', artifactConfig.shareCardRatio)
  artifactConfig.posterEnabled = readOptionalBooleanWithFallback(posterNode, 'enabled', artifactConfig.posterEnabled)
  artifactConfig.posterRatio = readOptionalTextWithFallback(posterNode, 'ratio', artifactConfig.posterRatio)

  const pageConfigNode = readOptionalRecord(parsedRoot, 'pageConfig')
  const sectionsNode = pageConfigNode ? readOptionalRecord(pageConfigNode, 'sections') : null
  const actionsNode = pageConfigNode ? readOptionalRecord(pageConfigNode, 'actions') : null
  pageConfig.layoutPreset = readOptionalOptionWithFallback(pageConfigNode, 'layoutPreset', layoutPresetKeys, pageConfig.layoutPreset)
  pageConfig.surface = readOptionalOptionWithFallback(pageConfigNode, 'surface', surfaceKeys, pageConfig.surface)
  pageConfig.density = readOptionalOptionWithFallback(pageConfigNode, 'density', densityKeys, pageConfig.density)
  pageConfig.heroStyle = readOptionalOptionWithFallback(pageConfigNode, 'heroStyle', heroStyleKeys, pageConfig.heroStyle)
  pageConfig.showProfile = readOptionalBooleanWithFallback(sectionsNode, 'profile', pageConfig.showProfile)
  pageConfig.showStats = readOptionalBooleanWithFallback(sectionsNode, 'stats', pageConfig.showStats)
  pageConfig.showTimeline = readOptionalBooleanWithFallback(sectionsNode, 'timeline', pageConfig.showTimeline)
  pageConfig.showContactCta = readOptionalBooleanWithFallback(sectionsNode, 'contactCta', pageConfig.showContactCta)
  pageConfig.primaryAction = readOptionalOptionWithFallback(actionsNode, 'primary', primaryActionKeys, pageConfig.primaryAction)
  pageConfig.secondaryAction = readOptionalOptionWithFallback(actionsNode, 'secondary', secondaryActionKeys, pageConfig.secondaryAction)
}

function buildThemeJson() {
  return writeJson({
    themeColors: {
      primary: themeConfig.primary,
      accent: themeConfig.accent,
      background: themeConfig.background,
      text: themeConfig.text,
      heroText: themeConfig.heroText,
    },
  })
}

function buildArtifactJson() {
  const focusItems = previewFocusItems.value
  const root: Record<string, unknown> = {
    requiredInviteCount: editorForm.requiredInviteCount ?? 0,
    miniProgramCard: {
      enabled: artifactConfig.shareCardEnabled,
      ratio: artifactConfig.shareCardRatio,
    },
    poster: {
      enabled: artifactConfig.posterEnabled,
      ratio: artifactConfig.posterRatio,
    },
    pageConfig: {
      layoutPreset: pageConfig.layoutPreset,
      surface: pageConfig.surface,
      density: pageConfig.density,
      heroStyle: pageConfig.heroStyle,
      sections: {
        profile: pageConfig.showProfile,
        stats: pageConfig.showStats,
        timeline: pageConfig.showTimeline,
        contactCta: pageConfig.showContactCta,
      },
      actions: {
        primary: pageConfig.primaryAction,
        secondary: pageConfig.secondaryAction,
      },
    },
  }
  const coverImage = artifactConfig.coverImage.trim()
  const heroEyebrow = artifactConfig.heroEyebrow.trim()
  if (coverImage) {
    root.coverImage = coverImage
  }
  if (heroEyebrow) {
    root.heroEyebrow = heroEyebrow
  }
  if (focusItems.length) {
    root.contentFocus = focusItems
  }

  return writeJson(root)
}

function syncVisualConfigToJson() {
  editorForm.layoutVariant = resolveLayoutVariant(pageConfig.layoutPreset)
  editorForm.baseThemeJson = buildThemeJson()
  editorForm.artifactPresetJson = buildArtifactJson()
}

function resolveLayoutVariant(layoutPreset: PageLayoutPreset) {
  return layoutVariantByPreset[layoutPreset]
}

function deriveRequiredLevel(requiredInviteCount?: number) {
  const inviteCount = requiredInviteCount ?? 0
  if (inviteCount >= 8) {
    return 5
  }
  if (inviteCount >= 5) {
    return 4
  }
  if (inviteCount >= 3) {
    return 3
  }
  if (inviteCount >= 1) {
    return 2
  }
  return 1
}

function resolveTemplateStatus(status: number) {
  return templateStatusMap[status] || templateStatusMap[0]
}

function resolveSceneTone(templateSceneCode?: string | null) {
  const normalized = (templateSceneCode || '').toLowerCase()
  if (normalized.includes('urban') || normalized.includes('modern')) {
    return 'urban'
  }
  if (normalized.includes('costume') || normalized.includes('classic') || normalized.includes('ancient')) {
    return 'costume'
  }
  return 'base'
}

function resolveTierLabel(tier?: string | null) {
  if (!tier) {
    return '基础'
  }
  if (tier === 'paid') {
    return '付费'
  }
  if (tier === 'free') {
    return '免费'
  }
  return tier
}

async function loadList() {
  loading.value = true
  try {
    const result = await fetchTemplates(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editorMode.value = 'create'
  currentRow.value = null
  currentTemplateStatus.value = 1
  editorVisible.value = true
  resetEditorForm()
}

async function openEdit(row: TemplateItem) {
  editorMode.value = 'edit'
  currentRow.value = row
  editorVisible.value = true
  submitting.value = true
  try {
    const detail = await fetchTemplateDetail(row.templateId)
    editorForm.templateCode = detail.templateCode
    editorForm.templateName = detail.templateName
    editorForm.templateSceneCode = detail.templateSceneCode
    editorForm.description = detail.description || ''
    editorForm.layoutVariant = detail.layoutVariant || ''
    editorForm.tier = detail.tier || ''
    editorForm.requiredLevel = detail.requiredLevel ?? 0
    editorForm.requiredInviteCount = detail.requiredInviteCount ?? 0
    editorForm.unlockRequired = detail.unlockRequired ?? false
    editorForm.baseThemeJson = detail.baseThemeJson || ''
    editorForm.artifactPresetJson = detail.artifactPresetJson || ''
    currentTemplateStatus.value = detail.status
    hydrateThemeConfig(detail.baseThemeJson)
    hydrateArtifactConfig(detail.artifactPresetJson)
    editorForm.layoutVariant = resolveLayoutVariant(pageConfig.layoutPreset)
  } catch (error) {
    editorVisible.value = false
    ElMessage.error(error instanceof Error ? error.message : '模板配置解析失败')
  } finally {
    submitting.value = false
  }
}

function openPublish(row: TemplateItem) {
  currentRow.value = row
  publishVisible.value = true
}

function openRollback(row: TemplateItem) {
  currentRow.value = row
  rollbackVisible.value = true
}

async function openSort(row: TemplateItem) {
  const result = await ElMessageBox.prompt('请输入新的排序值', '调整模板排序', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputValue: String(row.sortNo ?? 0),
    inputPattern: /^\d+$/,
    inputErrorMessage: '排序值必须是非负整数',
  }).then((value) => value.value)

  await sortTemplate(row.templateId, {
    sortNo: Number(result),
  })
  ElMessage.success('模板排序已更新')
  loadList()
}

async function toggleStatus(row: TemplateItem) {
  if (row.status === 2) {
    await enableTemplate(row.templateId)
    ElMessage.success('模板已启用')
  } else {
    await disableTemplate(row.templateId)
    ElMessage.success('模板已停用')
  }
  loadList()
}

async function submitEditor() {
  if (!editorForm.templateCode || !editorForm.templateName || !editorForm.templateSceneCode) {
    ElMessage.warning('请填写模板编码、模板名称和场景')
    return
  }

  submitting.value = true
  try {
    syncVisualConfigToJson()
    if (editorMode.value === 'create') {
      await createTemplate(buildCreatePayload())
    } else if (currentRow.value) {
      await updateTemplate(currentRow.value.templateId, buildUpdatePayload())
    }
    ElMessage.success(editorMode.value === 'create' ? '模板已创建' : '模板已更新')
    editorVisible.value = false
    loadList()
  } finally {
    submitting.value = false
  }
}

function buildCreatePayload(): CreateTemplatePayload {
  return {
    templateCode: editorForm.templateCode,
    templateName: editorForm.templateName,
    templateSceneCode: editorForm.templateSceneCode,
    description: editorForm.description,
    layoutVariant: editorForm.layoutVariant,
    tier: editorForm.tier,
    requiredLevel: editorForm.requiredLevel,
    requiredInviteCount: editorForm.requiredInviteCount,
    unlockRequired: editorForm.unlockRequired,
    baseThemeJson: editorForm.baseThemeJson,
    artifactPresetJson: editorForm.artifactPresetJson,
  }
}

function buildUpdatePayload(): UpdateTemplatePayload {
  return {
    templateName: editorForm.templateName,
    description: editorForm.description,
    layoutVariant: editorForm.layoutVariant,
    tier: editorForm.tier,
    requiredLevel: editorForm.requiredLevel,
    requiredInviteCount: editorForm.requiredInviteCount,
    unlockRequired: editorForm.unlockRequired,
    baseThemeJson: editorForm.baseThemeJson,
    artifactPresetJson: editorForm.artifactPresetJson,
  }
}

async function submitPublish(publishNote: string) {
  if (!currentRow.value) {
    return
  }
  await publishTemplate(currentRow.value.templateId, {
    publishVersion: `manual-${Date.now()}`,
    publishNote,
  })
  ElMessage.success('模板发布已提交')
  publishVisible.value = false
  loadList()
}

async function submitRollback(reason: string) {
  if (!currentRow.value) {
    return
  }

  const sourceVersion = await ElMessageBox.prompt('请输入 sourceVersion', '回滚版本', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPlaceholder: '例如 v2026.03.31',
  }).then((result) => result.value)

  await rollbackTemplate(currentRow.value.templateId, {
    sourceVersion,
    publishNote: reason,
  })
  ElMessage.success('模板回滚已提交')
  rollbackVisible.value = false
  loadList()
}

function switchSegment(next: TemplateSegmentKey) {
  activeSegment.value = next
  filters.pageNo = 1
  filters.status = undefined

  if (next === 'draft') {
    filters.status = 0
  } else if (next === 'published') {
    filters.status = 1
  } else if (next === 'disabled') {
    filters.status = 2
  }

  loadList()
}

function resetEditorForm() {
  editorForm.templateCode = ''
  editorForm.templateName = ''
  editorForm.templateSceneCode = ''
  editorForm.description = ''
  editorForm.layoutVariant = ''
  editorForm.tier = ''
  editorForm.requiredLevel = 0
  editorForm.requiredInviteCount = 0
  editorForm.unlockRequired = false
  editorForm.baseThemeJson = ''
  editorForm.artifactPresetJson = ''
  initializeThemeConfig()
  initializeArtifactConfig()
  editorForm.layoutVariant = resolveLayoutVariant(pageConfig.layoutPreset)
}

function resetFilters() {
  activeSegment.value = 'all'
  filters.templateSceneCode = ''
  filters.tier = ''
  filters.status = undefined
  filters.pageNo = 1
  loadList()
}

watch(
  () => editorForm.requiredInviteCount,
  (value) => {
    editorForm.requiredLevel = deriveRequiredLevel(value)
  },
)

watch(
  () => pageConfig.layoutPreset,
  (value) => {
    editorForm.layoutVariant = resolveLayoutVariant(value)
  },
)

onMounted(loadList)
</script>

<style scoped lang="scss">
.template-filter-panel :deep(.el-card__body) {
  padding: 20px 20px 18px;
}

.template-filter-panel :deep(.filter-panel__header) {
  margin-bottom: 14px;
  padding-bottom: 12px;
}

.template-filter-panel :deep(.filter-panel__header h3) {
  font-size: 15px;
}

.template-filter-panel :deep(.filter-panel__header p) {
  margin-top: 4px;
  font-size: 12px;
}

.template-filter-panel :deep(.filter-panel__body) {
  gap: 12px;
}

.template-filter-panel :deep(.el-form--inline) {
  gap: 12px 14px;
}

.template-filter-panel :deep(.el-form--inline .el-form-item) {
  gap: 10px;
}

.template-filter-panel :deep(.el-form-item__label) {
  min-height: 40px;
  font-size: 11px;
}

.template-filter-panel :deep(.el-form-item__content) {
  min-width: 164px;
}

.template-filter-panel :deep(.el-input__wrapper),
.template-filter-panel :deep(.el-select__wrapper),
.template-filter-panel :deep(.el-date-editor.el-input__wrapper) {
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
}

.template-filter-panel :deep(.filter-panel__actions .el-button) {
  min-height: 38px;
  padding-inline: 14px;
  border-radius: 12px;
}

.template-gallery-shell {
  display: grid;
  gap: 14px;
}

.template-gallery__loading {
  padding: 56px 0;
  text-align: center;
  color: rgba(47, 36, 27, 0.52);
}

.template-gallery {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 300px));
  justify-content: start;
}

.table-empty {
  display: grid;
  gap: 8px;
  padding: 32px 16px 36px;
  text-align: center;
}

.table-empty strong {
  font-size: 20px;
}

.table-empty p {
  max-width: 420px;
  margin: 0 auto;
  color: var(--kp-text-secondary);
  line-height: 1.75;
}

@media (max-width: 1400px) {
  .template-gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.template-table-card :deep(.el-card__body) {
  padding-top: 20px;
  padding-bottom: 18px;
}

.template-table-card .table-header {
  margin-bottom: 12px;
  gap: 10px;
}

.template-table-card .table-header__hint {
  max-width: 360px;
  line-height: 1.55;
}

.template-table-card :deep(.el-table th.el-table__cell) {
  padding: 11px 0;
  font-size: 11px;
}

.template-table-card :deep(.el-table td.el-table__cell) {
  padding: 11px 0;
}

.template-table-card :deep(.el-table .cell) {
  line-height: 1.45;
}

.template-table-card :deep(.el-table .el-button.is-link),
.template-table-card :deep(.el-table .el-button--link) {
  font-size: 13px;
}

.template-table-card :deep(.el-table :is(th, td).el-table-fixed-column--right) {
  background: #fffbf5 !important;
}

.template-table-card :deep(.el-table__fixed-right-patch),
.template-table-card :deep(.el-table th.el-table-fixed-column--right) {
  background: #f8f3eb !important;
}

.template-code-cell {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-family: var(--kp-font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.template-table-card :deep(.table-actions) {
  gap: 8px 10px;
}

@media (max-width: 1100px) {
  .template-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .template-gallery {
    grid-template-columns: 1fr;
  }
}
</style>
