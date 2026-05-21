<template>
  <PageContainer>
    <GovernanceOverviewCards :cards="overviewCards" />

    <FilterPanel description="按模板、发布版本、动作类型、操作人和发布时间回看模板发布与回滚台账。">
      <el-form :model="filters" inline>
        <el-form-item label="模板 ID">
          <el-input v-model.number="filters.templateId" clearable placeholder="模板 ID" />
        </el-form-item>
        <el-form-item label="发布版本">
          <el-input v-model="filters.publishVersion" clearable placeholder="发布版本" />
        </el-form-item>
        <el-form-item label="动作类型">
          <el-select v-model="filters.actionType" clearable placeholder="全部动作" style="width: 160px">
            <el-option label="发布" value="publish" />
            <el-option label="回滚" value="rollback" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人 ID">
          <el-input v-model.number="filters.publishedBy" clearable placeholder="操作人 ID" />
        </el-form-item>
        <el-form-item label="发布时间">
          <el-date-picker
            v-model="publishedAtRange"
            type="datetimerange"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadLogs">查询</el-button>
      </template>
    </FilterPanel>

    <el-card class="table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">PUBLISH GOVERNANCE</p>
          <h3>模板发布记录</h3>
        </div>
        <span class="table-header__hint">当前页只承接模板发布、回滚与版本变更台账回看，不扩展新的模板治理动作。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="publishLogId" label="记录 ID" min-width="110" />
        <el-table-column prop="templateId" label="模板 ID" min-width="110" />
        <el-table-column label="目标模板" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.targetCode || '--' }}</strong>
              <span>{{ row.targetType || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="动作" min-width="120">
          <template #default="{ row }">
            <StatusTag v-bind="resolveActionMeta(row.actionType)" />
          </template>
        </el-table-column>
        <el-table-column prop="publishVersion" label="发布版本" min-width="210" show-overflow-tooltip />
        <el-table-column label="版本链" min-width="220">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.targetVersion || row.publishVersion || '--' }}</strong>
              <span>{{ resolveVersionChain(row) }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column prop="publishedBy" label="操作人 ID" min-width="120" />
        <el-table-column prop="publishNote" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="发布时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.publishedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="120">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
            </TableActions>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <strong>当前条件下没有模板发布记录</strong>
            <p>可以切换模板、动作类型或发布时间窗口，查看发布与回滚台账。</p>
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
          @current-change="loadLogs"
          @size-change="loadLogs"
        />
      </div>
    </el-card>

    <AdminDetailDrawer v-model="detailVisible" title="发布记录详情" size="860px" destroy-on-close>
      <div v-if="currentLog" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>PUBLISH DETAIL / 发布台账</p>
            <strong>{{ currentLog.publishLogId }}</strong>
            <span>{{ currentLog.targetCode || '--' }} · {{ resolveActionMeta(currentLog.actionType).label }}</span>
          </div>
          <StatusTag v-bind="resolveActionMeta(currentLog.actionType)" />
        </section>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>记录概览</h3></template>
          <DetailGrid :items="detailBlocks" />
        </el-card>

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>diff 摘要</h3></template>
            <pre class="payload-pre">{{ formatJsonPayload(currentLog.diffSummaryJson) }}</pre>
          </el-card>

          <el-card class="detail-card" shadow="never">
            <template #header><h3>快照摘要</h3></template>
            <pre class="payload-pre">{{ formatJsonPayload(currentLog.snapshotJson) }}</pre>
          </el-card>
        </div>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchTemplatePublishLogs } from '@/api/content'
import FilterPanel from '@/components/business/FilterPanel.vue'
import GovernanceOverviewCards from '@/components/business/GovernanceOverviewCards.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import type { TemplatePublishLogItem, TemplatePublishLogQuery } from '@/types/content'
import { formatDateTime } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type DateRangeValue = [string, string] | []

const loading = ref(false)
const rows = ref<TemplatePublishLogItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const currentLog = ref<TemplatePublishLogItem | null>(null)

const filters = reactive<TemplatePublishLogQuery>({
  pageNo: 1,
  pageSize: 20,
  templateId: undefined,
  publishVersion: '',
  actionType: '',
  publishedBy: undefined,
  publishedAtFrom: undefined,
  publishedAtTo: undefined,
})

const publishedAtRange = computed<DateRangeValue>({
  get: (): DateRangeValue =>
    filters.publishedAtFrom && filters.publishedAtTo ? [filters.publishedAtFrom, filters.publishedAtTo] as [string, string] : [],
  set: (value: DateRangeValue) => {
    if (Array.isArray(value) && value.length === 2) {
      filters.publishedAtFrom = value[0]
      filters.publishedAtTo = value[1]
      return
    }
    filters.publishedAtFrom = undefined
    filters.publishedAtTo = undefined
  },
})

const overviewCards = computed(() => {
  const publishCount = rows.value.filter((item) => item.actionType === 'publish').length
  const rollbackCount = rows.value.filter((item) => item.actionType === 'rollback').length
  const uniqueTemplateCount = new Set(rows.value.map((item) => item.templateId).filter((item) => item != null)).size

  return [
    {
      label: '查询规模',
      badge: '当前查询',
      tone: null,
      value: `${total.value} 条`,
      hint: '当前筛选条件下的模板发布记录总数。',
    },
    {
      label: '当前页动作',
      badge: `${publishCount + rollbackCount} 条`,
      tone: 'info' as const,
      value: `${publishCount} 发布 / ${rollbackCount} 回滚`,
      hint: '当前页发布与回滚动作分布。',
    },
    {
      label: '当前页模板',
      badge: '模板覆盖',
      tone: 'success' as const,
      value: `${uniqueTemplateCount} 个`,
      hint: '当前页覆盖到的模板数量。',
    },
  ]
})

const detailBlocks = computed(() => {
  if (!currentLog.value) {
    return []
  }
  return [
    { label: '记录 ID', value: currentLog.value.publishLogId },
    { label: '模板 ID', value: currentLog.value.templateId ?? '--' },
    { label: '目标模板', value: currentLog.value.targetCode || '--' },
    { label: '动作', value: resolveActionMeta(currentLog.value.actionType).label },
    { label: '发布版本', value: currentLog.value.publishVersion || '--' },
    { label: '草稿版本', value: currentLog.value.draftVersion || '--' },
    { label: '来源版本', value: currentLog.value.sourceVersion || '--' },
    { label: '目标版本', value: currentLog.value.targetVersion || '--' },
    { label: '操作人 ID', value: currentLog.value.publishedBy ?? '--' },
    { label: '发布时间', value: formatDateTime(currentLog.value.publishedAt) },
    { label: '备注', value: currentLog.value.publishNote || '--' },
    { label: '目标类型', value: currentLog.value.targetType || '--' },
  ]
})

function resolveActionMeta(actionType?: string | null) {
  if (actionType === 'publish') {
    return { label: '发布', tone: 'success' as const }
  }
  if (actionType === 'rollback') {
    return { label: '回滚', tone: 'warning' as const }
  }
  return { label: actionType || '未知动作', tone: 'info' as const }
}

function resolveVersionChain(row: TemplatePublishLogItem) {
  const source = row.sourceVersion || row.draftVersion || '--'
  const target = row.targetVersion || row.publishVersion || '--'
  return `${source} -> ${target}`
}

function formatJsonPayload(raw?: string | null) {
  if (!raw) {
    return '--'
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const result = await fetchTemplatePublishLogs(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function openDetail(row: TemplatePublishLogItem) {
  currentLog.value = row
  detailVisible.value = true
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.templateId = undefined
  filters.publishVersion = ''
  filters.actionType = ''
  filters.publishedBy = undefined
  filters.publishedAtFrom = undefined
  filters.publishedAtTo = undefined
  loadLogs()
}

onMounted(loadLogs)
</script>

<style scoped lang="scss">
.table-empty {
  display: grid;
  gap: 8px;
  padding: 32px 16px 36px;
  text-align: center;

  strong {
    font-size: 20px;
  }

  p {
    max-width: 420px;
    margin: 0 auto;
    color: var(--kp-text-secondary);
    line-height: 1.75;
  }
}

.payload-pre {
  min-height: 180px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(34, 31, 28, 0.04);
  color: rgba(47, 36, 27, 0.78);
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
