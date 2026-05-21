<template>
  <PageContainer>
    <el-card class="table-card content-shell-card" shadow="never">
      <div class="content-shell-card__toolbar">
        <div class="content-tabs" role="tablist" aria-label="分享内容视图">
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
          <button
            type="button"
            class="content-view-button"
            :data-active="viewMode === 'gallery'"
            @click="viewMode = 'gallery'"
          >
            卡片视图
          </button>
          <button
            type="button"
            class="content-view-button"
            :data-active="viewMode === 'table'"
            @click="viewMode = 'table'"
          >
            列表视图
          </button>
        </div>
      </div>

      <div class="content-shell-card__stats">
        <div class="content-stat">
          <span>当前页内容</span>
          <strong>{{ rows.length }}</strong>
        </div>
        <div class="content-stat">
          <span>待修绑定</span>
          <strong>{{ inconsistentCount }}</strong>
        </div>
        <div class="content-stat">
          <span>默认卡</span>
          <strong>{{ defaultCount }}</strong>
        </div>
        <div class="content-stat">
          <span>有申请内容</span>
          <strong>{{ cardsWithRequestsCount }}</strong>
        </div>
      </div>
    </el-card>

    <FilterPanel
      class="share-filter-panel"
      description="按分享卡、持卡人、场景和状态回看真实内容；页面主表达为内容卡片墙，详情与治理动作只认真实分享卡事实源。"
    >
      <el-form :model="filters" inline>
        <el-form-item label="分享卡 ID">
          <el-input v-model.number="filters.shareCardId" clearable placeholder="分享卡 ID" />
        </el-form-item>
        <el-form-item label="持卡人 ID">
          <el-input v-model.number="filters.holderUserId" clearable placeholder="持卡人 ID" />
        </el-form-item>
        <el-form-item label="场景">
          <el-input v-model="filters.templateSceneCode" clearable placeholder="模板场景码" />
        </el-form-item>
        <el-form-item label="分享状态">
          <el-select v-model="filters.shareStatus" clearable placeholder="全部状态" style="width: 160px">
            <el-option label="active" value="active" />
            <el-option label="archived" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认卡">
          <el-select v-model="defaultCardValue" clearable placeholder="全部" style="width: 140px">
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadList">查询</el-button>
      </template>
    </FilterPanel>

    <section v-if="viewMode === 'gallery'" class="content-gallery-shell">
      <div v-if="loading" class="content-gallery__loading">内容加载中…</div>
      <template v-else-if="rows.length">
        <div class="content-gallery">
          <article v-for="row in rows" :key="row.shareCardId" class="content-card">
            <div class="content-card__cover" :data-cover-tone="resolveSceneTone(row.templateSceneCode)">
              <div class="content-card__cover-meta">
                <span class="content-card__cover-type">{{ row.defaultCard ? '默认卡' : '分享卡' }}</span>
                <StatusTag :label="resolveShareStatusLabel(row.shareStatus)" :tone="resolveShareStatusTone(row.shareStatus)" />
              </div>
              <div class="content-card__cover-copy">
                <strong>{{ resolveCardSceneLabel(row.templateSceneCode, row.templateName) }}</strong>
                <span>{{ row.ownerName || '--' }}</span>
              </div>
            </div>

            <div class="content-card__body">
              <div class="content-card__summary">
                <div>
                  <p>{{ row.templateName || '模板' }}</p>
                  <strong>{{ row.ownerName || '--' }}</strong>
                </div>
                <span class="content-card__scene">{{ row.templateSceneCode || '--' }}</span>
              </div>

              <div class="content-card__metrics">
                <div>
                  <strong>{{ row.historyCount || 0 }}</strong>
                  <span>历史打开</span>
                </div>
                <div>
                  <strong>{{ row.totalContactRequestCount || 0 }}</strong>
                  <span>联系方式申请</span>
                </div>
              </div>

              <div class="content-card__foot">
                <div class="content-card__signals">
                  <span>{{ row.bindingConsistent ? '已收口' : '待修正' }}</span>
                  <small>{{ `${row.pendingContactRequestCount || 0} 待处理 / ${row.approvedContactRequestCount || 0} 已同意` }}</small>
                </div>
                <el-button link type="primary" @click="openDetail(row.shareCardId)">查看详情</el-button>
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
        <strong>当前条件下没有分享内容</strong>
        <p>可以切换状态、场景或持卡人，查看其它真实分享卡实例。</p>
      </div>
    </section>

    <el-card v-else class="table-card content-table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">CONTENT LIST / 分享内容</p>
          <h3>列表视图</h3>
        </div>
        <span class="table-header__hint">列表视图用于回看真实分享卡实例与治理状态，和卡片视图共享同一事实源。</span>
      </div>
      <el-table class="content-table" :data="rows" v-loading="loading">
        <el-table-column prop="shareCardId" label="分享卡 ID" min-width="120" />
        <el-table-column label="卡片信息" min-width="200">
          <template #default="{ row }">
            <StackCell :title="resolveCardSceneLabel(row.templateSceneCode, row.templateName)" :subtitle="row.templateSceneCode ? `模板场景码：${row.templateSceneCode}` : '--'" />
          </template>
        </el-table-column>
        <el-table-column label="持卡人" min-width="180">
          <template #default="{ row }">
            <StackCell :title="row.ownerName || '--'" :subtitle="row.holderUserId ?? '--'" />
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <StatusTag :label="resolveShareStatusLabel(row.shareStatus)" :tone="resolveShareStatusTone(row.shareStatus)" />
          </template>
        </el-table-column>
        <el-table-column label="实例绑定" min-width="180">
          <template #default="{ row }">
            <StackCell :title="row.bindingConsistent ? '已收口' : '需校准'" :subtitle="`configId：${row.configId ?? '--'}`" />
          </template>
        </el-table-column>
        <el-table-column label="互动统计" min-width="180">
          <template #default="{ row }">
            <StackCell
              :title="`${row.historyCount || 0} 历史 / ${row.totalContactRequestCount || 0} 申请`"
              :subtitle="`${row.pendingContactRequestCount || 0} 待处理 / ${row.approvedContactRequestCount || 0} 已同意`"
            />
          </template>
        </el-table-column>
        <el-table-column label="默认卡" min-width="100">
          <template #default="{ row }">{{ row.defaultCard ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="问题数" min-width="100">
          <template #default="{ row }">
            <el-tag :type="(row.issueCount || 0) > 0 ? 'warning' : 'success'">{{ row.issueCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.lastUpdate) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="108">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.shareCardId)">查看详情</el-button>
            </TableActions>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <strong>当前条件下没有分享内容</strong>
            <p>可以切换持卡人、状态或场景，回看其它真实卡片实例的绑定情况。</p>
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

    <AdminDetailDrawer v-model="detailVisible" title="分享内容详情" size="860px" destroy-on-close class="content-detail-drawer">
      <div v-loading="detailLoading" class="detail-layout">
        <section v-if="detail?.cardInfo" class="drawer-hero">
          <div>
            <p>SHARE CONTENT DETAIL / 内容详情</p>
            <strong>{{ resolveCardSceneLabel(detail.cardInfo.templateSceneCode, detail.cardInfo.templateName) }}</strong>
            <span>{{ detail.cardInfo.shareCardId ?? '--' }} · {{ detail.ownerInfo?.displayName || '--' }}</span>
          </div>
          <StatusTag :label="resolveShareStatusLabel(detail.cardInfo.shareStatus)" :tone="resolveShareStatusTone(detail.cardInfo.shareStatus)" />
        </section>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>卡片概览</h3></template>
          <DetailGrid :items="cardBlocks" />
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>持卡人信息</h3></template>
          <DetailGrid :items="ownerBlocks" />
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>绑定状态</h3></template>
          <DetailGrid :items="bindingBlocks" />
          <div class="issue-section">
            <h4>发现的问题</h4>
            <div v-if="detail?.bindingInfo?.issues?.length" class="issue-list">
              <div v-for="item in detail.bindingInfo.issues" :key="item" class="issue-item">{{ item }}</div>
            </div>
            <div v-else class="issue-empty">当前分享卡实例绑定一致，无需额外修正。</div>
          </div>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>互动统计</h3></template>
          <DetailGrid :items="statsBlocks" />
        </el-card>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchContentShareCardDetail, fetchContentShareCards } from '@/api/content'
import DetailGrid from '@/components/business/DetailGrid.vue'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import StackCell from '@/components/tables/StackCell.vue'
import TableActions from '@/components/tables/TableActions.vue'
import type {
  ContentShareCardGovernanceDetail,
  ContentShareCardGovernanceItem,
  ContentShareCardGovernanceQuery,
} from '@/types/content'
import { formatDateTime, maskPhone } from '@/utils/format'
import { resolveShareCardSceneDisplayLabel } from '@/utils/shareCard'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type ContentSegmentKey = 'all' | 'active' | 'default' | 'archived'
type ViewMode = 'gallery' | 'table'
type StatusTone = 'info' | 'warning' | 'success' | 'danger'

const loading = ref(false)
const detailLoading = ref(false)
const rows = ref<ContentShareCardGovernanceItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<ContentShareCardGovernanceDetail | null>(null)
const activeSegment = ref<ContentSegmentKey>('all')
const viewMode = ref<ViewMode>('gallery')

const filters = reactive<ContentShareCardGovernanceQuery>({
  pageNo: 1,
  pageSize: 20,
  shareCardId: undefined,
  holderUserId: undefined,
  templateSceneCode: '',
  shareStatus: '',
  defaultCard: undefined,
})

const defaultCardValue = computed<boolean | undefined>({
  get: () => filters.defaultCard,
  set: (value) => {
    filters.defaultCard = typeof value === 'boolean' ? value : undefined
  },
})

const inconsistentCount = computed(() => rows.value.filter((item) => item.bindingConsistent === false).length)
const defaultCount = computed(() => rows.value.filter((item) => item.defaultCard).length)
const cardsWithRequestsCount = computed(() => rows.value.filter((item) => Number(item.totalContactRequestCount || 0) > 0).length)

const segmentOptions = computed(() => [
  { key: 'all' as ContentSegmentKey, label: '全部', count: total.value },
  { key: 'active' as ContentSegmentKey, label: '活跃内容', count: rows.value.filter((item) => item.shareStatus === 'active').length },
  { key: 'default' as ContentSegmentKey, label: '默认卡', count: defaultCount.value },
  { key: 'archived' as ContentSegmentKey, label: '已归档', count: rows.value.filter((item) => item.shareStatus === 'archived').length },
])

const cardBlocks = computed(() => {
  const cardInfo = detail.value?.cardInfo
  if (!cardInfo) {
    return []
  }
  return [
    { label: '分享卡 ID', value: cardInfo.shareCardId ?? '--' },
    { label: '展示风格', value: resolveCardSceneLabel(cardInfo.templateSceneCode, cardInfo.templateName) },
    { label: '模板场景码', value: cardInfo.templateSceneCode || '--' },
    { label: '分享状态', value: resolveShareStatusLabel(cardInfo.shareStatus) },
    { label: '默认卡', value: cardInfo.defaultCard ? '是' : '否' },
    { label: '档案用户 ID', value: cardInfo.profileUserId ?? '--' },
    { label: '模板 ID', value: cardInfo.templateId ?? '--' },
    { label: 'configId', value: cardInfo.configId ?? '--' },
    { label: '创建时间', value: formatDateTime(cardInfo.createTime) },
    { label: '更新时间', value: formatDateTime(cardInfo.lastUpdate) },
  ]
})

const ownerBlocks = computed(() => {
  const owner = detail.value?.ownerInfo
  if (!owner) {
    return []
  }
  return [
    { label: '用户 ID', value: owner.userId ?? '--' },
    { label: '展示名', value: owner.displayName || '--' },
    { label: '用户名', value: owner.userName || '--' },
    { label: '昵称', value: owner.nickName || '--' },
    { label: '手机号', value: maskPhone(owner.phone) },
    { label: '实名状态', value: formatRealAuthStatus(owner.realAuthStatus) },
    { label: '有效邀请数', value: owner.validInviteCount ?? 0 },
  ]
})

const bindingBlocks = computed(() => {
  const binding = detail.value?.bindingInfo
  if (!binding) {
    return []
  }
  return [
    { label: '实例 configId', value: binding.configId ?? '--' },
    { label: '配置模板场景码', value: binding.configTemplateSceneCode || '--' },
    { label: '配置档案用户 ID', value: binding.configProfileUserId ?? '--' },
    { label: '配置 templateId', value: binding.configTemplateId ?? '--' },
    { label: '绑定一致性', value: binding.bindingConsistent ? '一致' : '待修正' },
  ]
})

const statsBlocks = computed(() => {
  const stats = detail.value?.statsInfo
  if (!stats) {
    return []
  }
  return [
    { label: '历史记录数', value: stats.historyCount ?? 0 },
    { label: '联系方式申请总数', value: stats.totalContactRequestCount ?? 0 },
    { label: '待处理申请', value: stats.pendingContactRequestCount ?? 0 },
    { label: '已同意申请', value: stats.approvedContactRequestCount ?? 0 },
    { label: '已拒绝申请', value: stats.rejectedContactRequestCount ?? 0 },
    { label: '最近查看时间', value: formatDateTime(stats.latestViewedAt) },
    { label: '最近申请时间', value: formatDateTime(stats.latestRequestedAt) },
  ]
})

function resolveCardSceneLabel(templateSceneCode?: string | null, templateName?: string | null) {
  return resolveShareCardSceneDisplayLabel(templateSceneCode, templateName)
}

function resolveShareStatusLabel(status?: string | null) {
  if (status === 'active') {
    return '公开中'
  }
  if (status === 'archived') {
    return '已归档'
  }
  return '未知状态'
}

function resolveShareStatusTone(status?: string | null): StatusTone {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'archived') {
    return 'info'
  }
  return 'warning'
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

function formatRealAuthStatus(status?: number | null) {
  if (status === 2) {
    return '已实名'
  }
  if (status === 1) {
    return '审核中'
  }
  if (status === 3) {
    return '已拒绝'
  }
  return '未实名'
}

async function loadList() {
  loading.value = true
  try {
    const result = await fetchContentShareCards(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function openDetail(shareCardId: number) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await fetchContentShareCardDetail(shareCardId)
  } finally {
    detailLoading.value = false
  }
}

function switchSegment(next: ContentSegmentKey) {
  activeSegment.value = next
  filters.pageNo = 1
  filters.shareStatus = ''
  filters.defaultCard = undefined

  if (next === 'active') {
    filters.shareStatus = 'active'
  } else if (next === 'default') {
    filters.defaultCard = true
  } else if (next === 'archived') {
    filters.shareStatus = 'archived'
  }

  loadList()
}

function resetFilters() {
  activeSegment.value = 'all'
  filters.pageNo = 1
  filters.pageSize = 20
  filters.shareCardId = undefined
  filters.holderUserId = undefined
  filters.templateSceneCode = ''
  filters.shareStatus = ''
  filters.defaultCard = undefined
  loadList()
}

onMounted(async () => {
  await loadList()
})
</script>

<style scoped lang="scss">
:deep(.content-shell-card > .el-card__body) {
  padding: 18px 20px;
}

.content-shell-card__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.content-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content-tab,
.content-view-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(80, 63, 47, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
  color: rgba(47, 36, 27, 0.64);
  cursor: pointer;
}

.content-tab span,
.content-view-button {
  font-weight: 700;
}

.content-tab small {
  color: rgba(47, 36, 27, 0.46);
}

.content-tab[data-active='true'],
.content-view-button[data-active='true'] {
  background: #221f1c;
  color: #f6efe6;
  box-shadow: 0 12px 24px rgba(34, 31, 28, 0.14);
}

.content-tab[data-active='true'] small {
  color: rgba(246, 239, 230, 0.68);
}

.content-shell-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-shell-card__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.content-stat {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(80, 63, 47, 0.08);
}

.content-stat span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.content-stat strong {
  font-size: 22px;
}

.share-filter-panel :deep(.el-card__body) {
  padding: 20px 20px 18px;
}

.share-filter-panel :deep(.filter-panel__header) {
  margin-bottom: 14px;
  padding-bottom: 12px;
}

.share-filter-panel :deep(.filter-panel__header h3) {
  font-size: 15px;
}

.share-filter-panel :deep(.filter-panel__header p) {
  margin-top: 4px;
  font-size: 12px;
}

.share-filter-panel :deep(.filter-panel__body) {
  gap: 12px;
}

.share-filter-panel :deep(.el-form--inline) {
  gap: 12px 14px;
}

.share-filter-panel :deep(.el-form--inline .el-form-item) {
  gap: 10px;
}

.share-filter-panel :deep(.el-form-item__label) {
  min-height: 40px;
  font-size: 11px;
}

.share-filter-panel :deep(.el-form-item__content) {
  min-width: 164px;
}

.share-filter-panel :deep(.el-input__wrapper),
.share-filter-panel :deep(.el-select__wrapper),
.share-filter-panel :deep(.el-date-editor.el-input__wrapper) {
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
}

.share-filter-panel :deep(.filter-panel__actions .el-button) {
  min-height: 38px;
  padding-inline: 14px;
  border-radius: 12px;
}

.content-gallery-shell {
  display: grid;
  gap: 14px;
}

.content-gallery__loading {
  padding: 56px 0;
  text-align: center;
  color: rgba(47, 36, 27, 0.52);
}

.content-gallery {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 300px));
  justify-content: start;
}

.content-card {
  display: grid;
  overflow: hidden;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.94), rgba(250, 244, 236, 0.9)),
    rgba(255, 251, 245, 0.92);
  box-shadow: 0 16px 34px rgba(63, 42, 20, 0.08);
}

.content-card__cover {
  display: grid;
  align-content: space-between;
  min-height: 220px;
  padding: 14px;
  background: linear-gradient(180deg, #3a342d, #1f1c19);
  background-size: cover;
  position: relative;
  overflow: hidden;
}

.content-card__cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(17, 15, 13, 0.08), rgba(17, 15, 13, 0.62)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 10px);
}

.content-card__cover[data-cover-tone='urban'] {
  background: linear-gradient(180deg, #293249, #1c2536);
}

.content-card__cover[data-cover-tone='costume'] {
  background: linear-gradient(180deg, #4a2422, #2f1615);
}

.content-card__cover-meta,
.content-card__cover-copy {
  position: relative;
  z-index: 1;
}

.content-card__cover-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.content-card__cover-type {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(17, 15, 13, 0.78);
  color: rgba(247, 239, 230, 0.92);
  font-size: 12px;
  font-weight: 700;
}

.content-card__cover-copy {
  display: grid;
  gap: 6px;
  color: #f7efe3;
}

.content-card__cover-copy strong {
  font-size: 26px;
  line-height: 1.12;
}

.content-card__cover-copy span {
  color: rgba(247, 239, 230, 0.76);
}

.content-card__body {
  display: grid;
  gap: 14px;
  padding: 16px 14px 14px;
}

.content-card__summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.content-card__summary p {
  margin: 0 0 4px;
  color: rgba(47, 36, 27, 0.46);
  font-size: 12px;
}

.content-card__summary strong {
  font-size: 17px;
}

.content-card__scene {
  color: rgba(47, 36, 27, 0.5);
  font-size: 12px;
}

.content-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.content-card__metrics div {
  display: grid;
  gap: 4px;
}

.content-card__metrics strong {
  font-size: 28px;
  line-height: 1;
}

.content-card__metrics span {
  color: rgba(47, 36, 27, 0.44);
  font-size: 12px;
  letter-spacing: 0.14em;
}

.content-card__foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-end;
}

.content-card__signals {
  display: grid;
  gap: 3px;
}

.content-card__signals span {
  font-weight: 700;
}

.content-card__signals small {
  color: rgba(47, 36, 27, 0.52);
  line-height: 1.6;
}

.content-table-card :deep(.el-card__body) {
  padding-top: 20px;
  padding-bottom: 18px;
}

.content-table-card .table-header {
  margin-bottom: 12px;
  gap: 10px;
}

.content-table-card .table-header__hint {
  max-width: 360px;
  line-height: 1.55;
}

.content-table-card :deep(.el-table th.el-table__cell) {
  padding: 11px 0;
  font-size: 11px;
}

.content-table-card :deep(.el-table td.el-table__cell) {
  padding: 11px 0;
}

.content-table-card :deep(.el-table .cell) {
  line-height: 1.45;
}

.content-table-card :deep(.el-table .el-button.is-link),
.content-table-card :deep(.el-table .el-button--link) {
  font-size: 13px;
}

.content-table-card :deep(.el-table :is(th, td).el-table-fixed-column--right) {
  background: #fffbf5 !important;
}

.content-table-card :deep(.el-table__fixed-right-patch),
.content-table-card :deep(.el-table th.el-table-fixed-column--right) {
  background: #f8f3eb !important;
}

.stack-cell {
  display: grid;
  gap: 3px;
}

.stack-cell strong {
  font-size: 14px;
  line-height: 1.25;
}

.stack-cell span {
  color: rgba(47, 36, 27, 0.5);
  font-size: 11px;
  line-height: 1.45;
}

.content-table-card .pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
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

.detail-layout {
  display: grid;
  gap: 14px;
}

:deep(.content-detail-drawer .el-drawer__body .drawer-hero) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.95), rgba(248, 242, 233, 0.9)),
    rgba(255, 251, 245, 0.92);
}

:deep(.content-detail-drawer .el-drawer__body .drawer-hero p) {
  margin: 0 0 2px;
  color: rgba(47, 36, 27, 0.42);
  font-size: 10px;
  letter-spacing: 0.18em;
}

:deep(.content-detail-drawer .el-drawer__body .drawer-hero strong) {
  display: block;
  font-size: 17px;
  line-height: 1.2;
}

:deep(.content-detail-drawer .el-drawer__body .drawer-hero span) {
  display: block;
  margin-top: 1px;
  color: rgba(47, 36, 27, 0.54);
  font-size: 12px;
  line-height: 1.45;
}

.detail-layout .detail-card {
  border-radius: 20px;
}

.detail-layout .detail-card h3 {
  margin: 0;
  font-size: 14px;
}

.detail-layout .detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-layout .detail-block {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 70px;
  padding: 12px 14px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 14px;
  background: rgba(255, 251, 245, 0.78);
}

.detail-layout .detail-block span {
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  line-height: 1.3;
}

.detail-layout .detail-block strong {
  font-size: 15px;
  line-height: 1.35;
  word-break: break-word;
}

.issue-section {
  margin-top: 18px;
}

.issue-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.issue-list {
  display: grid;
  gap: 10px;
}

.issue-item,
.issue-empty {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 122, 69, 0.08);
  color: var(--kp-text-primary);
  line-height: 1.7;
}

:deep(.content-detail-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(80, 63, 47, 0.08);
}

:deep(.content-detail-drawer .el-drawer__title) {
  font-size: 16px;
  font-weight: 700;
}

:deep(.content-detail-drawer .el-drawer__body) {
  padding: 18px 20px 20px;
}

:deep(.content-detail-drawer .detail-card .el-card__header) {
  padding: 14px 18px 12px !important;
}

:deep(.content-detail-drawer .detail-card .el-card__body) {
  padding: 16px 18px !important;
}

.detail-layout .issue-section {
  margin-top: 12px;
}

.detail-layout .issue-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.detail-layout .issue-list {
  gap: 8px;
}

.detail-layout .issue-item,
.detail-layout .issue-empty {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.55;
}

@media (max-width: 1400px) {
  .content-gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .content-shell-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-layout .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .content-shell-card__stats,
  .content-gallery,
  .content-card__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
