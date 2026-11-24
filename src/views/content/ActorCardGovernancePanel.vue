<template>
  <el-card class="table-card content-shell-card" shadow="never">
    <div class="content-shell-card__toolbar">
      <div class="content-tabs" role="tablist" aria-label="演员卡状态">
        <button
          v-for="segment in segmentOptions"
          :key="segment.key"
          type="button"
          class="content-tab"
          :data-active="activeSegment === segment.key"
          @click="switchSegment(segment.key)"
        >
          <span>{{ segment.label }}</span>
          <small>{{ segment.count }}</small>
        </button>
      </div>

      <div class="content-shell-card__actions">
        <button type="button" class="content-view-button" :data-active="viewMode === 'gallery'" @click="viewMode = 'gallery'">
          卡片视图
        </button>
        <button type="button" class="content-view-button" :data-active="viewMode === 'table'" @click="viewMode = 'table'">
          列表视图
        </button>
      </div>
    </div>

    <div class="content-shell-card__stats">
      <div class="content-stat">
        <span>演员卡总数</span>
        <strong>{{ statusCounts.total }}</strong>
      </div>
      <div class="content-stat">
        <span>已发布</span>
        <strong>{{ statusCounts.published }}</strong>
      </div>
      <div class="content-stat">
        <span>草稿</span>
        <strong>{{ statusCounts.draft }}</strong>
      </div>
      <div class="content-stat">
        <span>当前页</span>
        <strong>{{ rows.length }}</strong>
      </div>
    </div>
  </el-card>

  <FilterPanel
    class="share-filter-panel"
    description="演员卡来自小程序 v2 向导（actor_card），含已发布与草稿，与小程序名片夹同口径；按持卡人筛选时「全部」即该用户名片夹数量。"
  >
    <el-form :model="filters" inline>
      <el-form-item label="演员卡 ID">
        <el-input v-model.number="filters.cardId" clearable placeholder="演员卡 ID" />
      </el-form-item>
      <el-form-item label="持卡人 ID">
        <el-input v-model.number="filters.userId" clearable placeholder="持卡人 ID" />
      </el-form-item>
      <el-form-item label="风格">
        <el-select v-model="filters.style" clearable placeholder="全部风格" style="width: 160px">
          <el-option v-for="option in styleOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #actions>
      <el-button @click="resetFilters">重置</el-button>
      <el-button type="primary" @click="search">查询</el-button>
    </template>
  </FilterPanel>

  <section v-if="viewMode === 'gallery'" class="content-gallery-shell">
    <div v-if="loading" class="content-gallery__loading">内容加载中…</div>
    <template v-else-if="rows.length">
      <div class="content-gallery">
        <article v-for="row in rows" :key="row.cardId" class="content-card">
          <div class="content-card__cover" :data-cover-tone="resolveStyleTone(row.style)">
            <img v-if="row.coverImageUrl" class="actor-card__cover-image" :src="row.coverImageUrl" alt="" loading="lazy" />
            <div class="content-card__cover-meta">
              <span class="content-card__cover-type">{{ resolveStyleLabel(row.style) }}</span>
              <StatusTag :label="resolveStatusLabel(row.status)" :tone="resolveStatusTone(row.status)" />
            </div>
            <div class="content-card__cover-copy">
              <strong>{{ row.title || '未命名演员卡' }}</strong>
              <span>{{ row.ownerName || '--' }}</span>
            </div>
          </div>

          <div class="content-card__body">
            <div class="content-card__summary">
              <div>
                <p>演员卡 #{{ row.cardId }}</p>
                <strong>{{ row.ownerName || '--' }}</strong>
              </div>
              <span class="content-card__scene">持卡人 {{ row.userId ?? '--' }}</span>
            </div>

            <div class="content-card__metrics">
              <div>
                <strong>{{ row.completionPercentage ?? 0 }}%</strong>
                <span>完成度</span>
              </div>
              <div>
                <strong>{{ row.publishedVersion ? `v${row.publishedVersion}` : '--' }}</strong>
                <span>发布版本</span>
              </div>
            </div>

            <div class="content-card__foot">
              <div class="content-card__signals">
                <span>{{ row.status === 'published' ? `发布于 ${formatDateTime(row.publishedAt)}` : `编辑到第 ${row.currentStep ?? '--'} 步` }}</span>
                <small>更新于 {{ formatDateTime(row.lastUpdate) }}</small>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div class="pager">
        <AdminPager
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[20, 50, 100]"
          :total="total"
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </template>
    <div v-else class="table-empty">
      <strong>当前条件下没有演员卡</strong>
      <p>可以切换状态、风格或持卡人，查看其它演员卡。</p>
    </div>
  </section>

  <el-card v-else class="table-card content-table-card" shadow="never">
    <div class="table-header">
      <div>
        <p class="table-header__eyebrow">ACTOR CARDS / 演员卡</p>
        <h3>列表视图</h3>
      </div>
      <span class="table-header__hint">与卡片视图共享同一事实源（actor_card），与小程序名片夹同口径。</span>
    </div>
    <el-table class="content-table" :data="rows" v-loading="loading">
      <el-table-column prop="cardId" label="演员卡 ID" min-width="110" />
      <el-table-column label="卡片信息" min-width="200">
        <template #default="{ row }">
          <StackCell :title="row.title || '未命名演员卡'" :subtitle="`风格：${resolveStyleLabel(row.style)}`" />
        </template>
      </el-table-column>
      <el-table-column label="持卡人" min-width="180">
        <template #default="{ row }">
          <StackCell :title="row.ownerName || '--'" :subtitle="`${row.userId ?? '--'} · ${maskPhone(row.ownerPhone)}`" />
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="110">
        <template #default="{ row }">
          <StatusTag :label="resolveStatusLabel(row.status)" :tone="resolveStatusTone(row.status)" />
        </template>
      </el-table-column>
      <el-table-column label="完成度" min-width="140">
        <template #default="{ row }">
          <StackCell :title="`${row.completionPercentage ?? 0}%`" :subtitle="`编辑到第 ${row.currentStep ?? '--'} 步`" />
        </template>
      </el-table-column>
      <el-table-column label="发布" min-width="180">
        <template #default="{ row }">
          <StackCell
            :title="row.publishedVersion ? `v${row.publishedVersion}` : '未发布'"
            :subtitle="row.publishedAt ? formatDateTime(row.publishedAt) : '--'"
          />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.lastUpdate) }}</template>
      </el-table-column>
      <template #empty>
        <div class="table-empty">
          <strong>当前条件下没有演员卡</strong>
          <p>可以切换状态、风格或持卡人，查看其它演员卡。</p>
        </div>
      </template>
    </el-table>
    <div class="pager">
      <AdminPager
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[20, 50, 100]"
        :total="total"
        @current-change="loadList"
        @size-change="loadList"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchContentActorCards } from '@/api/content'
import AdminPager from '@/components/business/AdminPager.vue'
import FilterPanel from '@/components/business/FilterPanel.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import StackCell from '@/components/tables/StackCell.vue'
import type {
  ContentActorCardGovernanceItem,
  ContentActorCardGovernanceQuery,
  ContentActorCardStatusCounts,
} from '@/types/content'
import { formatDateTime, maskPhone } from '@/utils/format'
import { usePermissionStore } from '@/stores/permission'
import {
  actorCardStyleLabel,
  loadActorCardStyleOptions,
  normalizeActorCardStyle,
  type ActorCardStyleOption,
} from '@/utils/actor-card-style'

type SegmentKey = 'all' | 'published' | 'draft'
type ViewMode = 'gallery' | 'table'
type StatusTone = 'info' | 'warning' | 'success' | 'danger'

// 00-267: 风格 = 后台风格模板；无模板页权限时只按场景码显示默认名称
const permission = usePermissionStore()
const styleOptions = ref<ActorCardStyleOption[]>([])

const loading = ref(false)
const rows = ref<ContentActorCardGovernanceItem[]>([])
const total = ref(0)
const statusCounts = ref<ContentActorCardStatusCounts>({ total: 0, published: 0, draft: 0 })
const activeSegment = ref<SegmentKey>('all')
const viewMode = ref<ViewMode>('gallery')

const filters = reactive<ContentActorCardGovernanceQuery>({
  pageNo: 1,
  pageSize: 20,
  cardId: undefined,
  userId: undefined,
  status: '',
  style: '',
})

// 计数取后端全局计数，不随分页和当前页签变化
const segmentOptions = computed(() => [
  { key: 'all' as SegmentKey, label: '全部', count: statusCounts.value.total },
  { key: 'published' as SegmentKey, label: '已发布', count: statusCounts.value.published },
  { key: 'draft' as SegmentKey, label: '草稿', count: statusCounts.value.draft },
])

function resolveStyleLabel(style?: string | null) {
  return actorCardStyleLabel(style, styleOptions.value)
}

function resolveStyleTone(style?: string | null) {
  const normalized = normalizeActorCardStyle(style)
  if (normalized === 'urban' || normalized === 'costume') {
    return normalized
  }
  return 'base'
}

async function loadStyleOptions() {
  if (!permission.hasPage('page.content.templates')) {
    return
  }
  try {
    styleOptions.value = await loadActorCardStyleOptions()
  } catch {
    styleOptions.value = []
  }
}

function resolveStatusLabel(status?: string | null) {
  if (status === 'published') {
    return '已发布'
  }
  if (status === 'draft') {
    return '草稿'
  }
  return '未知状态'
}

function resolveStatusTone(status?: string | null): StatusTone {
  if (status === 'published') {
    return 'success'
  }
  if (status === 'draft') {
    return 'info'
  }
  return 'warning'
}

function normalizeId(value?: number | string) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

async function loadList() {
  loading.value = true
  try {
    const result = await fetchContentActorCards({
      ...filters,
      cardId: normalizeId(filters.cardId),
      userId: normalizeId(filters.userId),
      status: filters.status || undefined,
      style: filters.style || undefined,
    })
    rows.value = result.list
    total.value = result.total
    statusCounts.value = result.statusCounts ?? { total: 0, published: 0, draft: 0 }
  } finally {
    loading.value = false
  }
}

function search() {
  filters.pageNo = 1
  loadList()
}

function switchSegment(next: SegmentKey) {
  activeSegment.value = next
  filters.status = next === 'all' ? '' : next
  search()
}

function resetFilters() {
  activeSegment.value = 'all'
  filters.pageSize = 20
  filters.cardId = undefined
  filters.userId = undefined
  filters.status = ''
  filters.style = ''
  search()
}

onMounted(() => {
  void loadStyleOptions()
  loadList()
})
</script>

<style scoped lang="scss">
@use './share-content-shared';

.content-card__cover .actor-card__cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

// StatusTag 半透明底只适合浅色背景；封面是照片 / 深色兜底，需要不透明浅底才可读
.content-card__cover-meta :deep(.status-tag[data-tone]) {
  background: rgba(255, 251, 245, 0.94);
  border-color: rgba(255, 255, 255, 0.6);
}

.content-gallery-shell .pager {
  display: flex;
  justify-content: flex-end;
}
</style>
