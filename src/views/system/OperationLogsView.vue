<template>
  <PageContainer>
    <section class="console-overview">
      <article class="console-overview-card console-overview-card--dark">
        <div class="console-overview-card__head">
          <p>OPERATION / TRACE</p>
          <span>LOG</span>
        </div>
        <strong>{{ operationLogHeadline }}</strong>
        <small>{{ operationLogHeadlineDescription }}</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>MODULE</p>
          <span>FILTER</span>
        </div>
        <strong>{{ moduleFilterLabel }}</strong>
        <small>可按模块或操作码快速收窄当前后台治理范围。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>RESULT</p>
          <span>STATE</span>
        </div>
        <strong>{{ resultFilterLabel }}</strong>
        <small>失败记录和成功记录仍走同一条留痕链路，便于统一追查。</small>
      </article>
    </section>

    <FilterPanel description="按操作人、模块、结果和目标信息筛选后台操作记录。">
      <el-form :model="filters" inline>
        <el-form-item label="后台账号 ID">
          <el-input v-model.number="filters.adminUserId" placeholder="后台账号 ID" clearable />
        </el-form-item>
        <el-form-item label="模块">
          <el-input v-model="filters.moduleCode" placeholder="模块编码" clearable />
        </el-form-item>
        <el-form-item label="操作码">
          <el-input v-model="filters.operationCode" placeholder="操作码" clearable />
        </el-form-item>
        <el-form-item label="目标类型">
          <el-input v-model="filters.targetType" placeholder="目标类型" clearable />
        </el-form-item>
        <el-form-item label="请求 ID">
          <el-input v-model="filters.requestId" placeholder="请求 ID" clearable />
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="filters.result" clearable style="width: 140px">
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
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
          <p class="table-header__eyebrow">AUDIT FEED / 后台操作留痕</p>
          <h3>操作日志清单</h3>
        </div>
        <span class="table-header__hint">{{ tableHeaderHint }}</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="operationLogId" label="日志 ID" min-width="110" />
        <el-table-column label="操作人" min-width="150">
          <template #default="{ row }">{{ row.adminUserName || row.adminUserId || '--' }}</template>
        </el-table-column>
        <el-table-column prop="moduleCode" label="模块" min-width="120" />
        <el-table-column prop="operationCode" label="操作码" min-width="160" />
        <el-table-column label="目标" min-width="180">
          <template #default="{ row }">{{ row.targetType || '--' }} / {{ row.targetId ?? '--' }}</template>
        </el-table-column>
        <el-table-column prop="requestId" label="请求 ID" min-width="180" show-overflow-tooltip />
        <el-table-column label="结果" min-width="100">
          <template #default="{ row }">
            <StatusTag :label="row.operationResult === 1 ? '成功' : '失败'" :tone="row.operationResult === 1 ? 'success' : 'danger'" />
          </template>
        </el-table-column>
        <el-table-column prop="clientIp" label="客户端 IP" min-width="140" />
        <el-table-column label="时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.operationLogId)">查看详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <strong>{{ tableEmptyTitle }}</strong>
            <p>{{ tableEmptyDescription }}</p>
            <span v-if="tableEmptyMeta" class="table-empty__meta">{{ tableEmptyMeta }}</span>
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

    <AdminDetailDrawer v-model="detailVisible" title="操作日志详情" size="860px" destroy-on-close>
      <div v-if="detailLoading" class="detail-empty">
        <strong>正在加载操作日志详情</strong>
        <p>当前正在拉取前后快照、请求链路与补充上下文。</p>
      </div>
      <div v-else-if="detailError" class="detail-empty">
        <strong>当前日志详情暂不可用</strong>
        <p>{{ detailError }}</p>
      </div>
      <div v-else-if="detail" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>LOG DETAIL / 操作详情</p>
            <strong>{{ detail.operationCode || '后台操作日志' }}</strong>
            <span>{{ detail.adminUserName || detail.adminUserId || '--' }} · {{ detail.requestId || '--' }}</span>
          </div>
          <StatusTag :label="detail.operationResult === 1 ? '成功' : '失败'" :tone="detail.operationResult === 1 ? 'success' : 'danger'" />
        </section>

        <DetailGrid>
          <DetailBlock v-for="item in detailBlocks" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </DetailBlock>
        </DetailGrid>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>变更前快照</h3></template>
          <pre class="json-block">{{ detail.beforeSnapshotJson || '--' }}</pre>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>变更后快照</h3></template>
          <pre class="json-block">{{ detail.afterSnapshotJson || '--' }}</pre>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>补充信息</h3></template>
          <pre class="json-block">{{ detail.extraContextJson || '--' }}</pre>
        </el-card>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchAdminOperationLogDetail, fetchAdminOperationLogs } from '@/api/system'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import type { AdminOperationLogDetail, AdminOperationLogItem, AdminOperationLogQuery } from '@/types/system'
import { formatDateTime } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

const loading = ref(false)
const rows = ref<AdminOperationLogItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<AdminOperationLogDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const sourceLoaded = ref(false)
const sourceError = ref(false)

const filters = reactive<AdminOperationLogQuery>({
  pageNo: 1,
  pageSize: 20,
  adminUserId: undefined,
  moduleCode: '',
  operationCode: '',
  targetType: '',
  requestId: '',
  result: undefined,
  dateFrom: '',
  dateTo: '',
})

const operationLogHeadline = computed(() => {
  if (sourceError.value) {
    return '加载失败'
  }
  return `${total.value} 条操作记录`
})

const operationLogHeadlineDescription = computed(() => {
  if (sourceError.value) {
    return '当前操作留痕接口暂不可用，请稍后重试。'
  }
  return sourceLoaded.value
    ? '当前页聚焦后台操作留痕、前后快照和请求链路，不扩展审计模型。'
    : '正在核对后台操作留痕、前后快照和请求链路。'
})

const moduleFilterLabel = computed(() => filters.moduleCode || '全部模块')

const resultFilterLabel = computed(() => {
  if (filters.result === 1) {
    return '成功'
  }
  if (filters.result === 0) {
    return '失败'
  }
  return sourceError.value ? '本次加载失败' : '全部结果'
})

const tableHeaderHint = computed(() => {
  if (sourceError.value) {
    return '当前 operation-logs 接口不可用，请稍后重新查询。'
  }
  return '统一查看操作人、模块、请求 ID、结果和目标对象，支撑后台复盘与问题排查。'
})

const tableEmptyTitle = computed(() => (sourceError.value ? '操作留痕加载失败' : '当前条件下没有操作记录'))

const tableEmptyDescription = computed(() => {
  if (sourceError.value) {
    return '当前 /admin/system/operation-logs 暂未返回可用数据，请稍后重新查询。'
  }
  return '可以切换操作人、模块、结果或请求 ID，查看其它后台操作留痕。'
})

const tableEmptyMeta = computed(() => (
  sourceError.value ? '接口恢复后会展示真实操作记录。' : ''
))

const detailBlocks = computed(() => {
  if (!detail.value) {
    return []
  }
  return [
    { label: '日志 ID', value: detail.value.operationLogId },
    { label: '操作人', value: detail.value.adminUserName || detail.value.adminUserId || '--' },
    { label: '模块', value: detail.value.moduleCode || '--' },
    { label: '操作码', value: detail.value.operationCode || '--' },
    { label: '目标', value: `${detail.value.targetType || '--'} / ${detail.value.targetId ?? '--'}` },
    { label: '请求 ID', value: detail.value.requestId || '--' },
    { label: '客户端 IP', value: detail.value.clientIp || '--' },
    { label: '访问设备信息', value: detail.value.userAgent || '--' },
    { label: '结果', value: detail.value.operationResult === 1 ? '成功' : '失败' },
    { label: '失败原因', value: detail.value.failReason || '--' },
    { label: '确认时间', value: formatDateTime(detail.value.confirmedAt) },
    { label: '创建时间', value: formatDateTime(detail.value.createTime) },
  ]
})

async function loadLogs() {
  loading.value = true
  sourceError.value = false
  try {
    const result = await fetchAdminOperationLogs(filters)
    rows.value = result.list || []
    total.value = Number(result.total || 0)
    sourceLoaded.value = true
  } catch {
    rows.value = []
    total.value = 0
    sourceLoaded.value = false
    sourceError.value = true
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await fetchAdminOperationLogDetail(id)
  } catch {
    detailError.value = '当前日志详情接口暂不可用，请稍后再查看前后快照。'
  } finally {
    detailLoading.value = false
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.adminUserId = undefined
  filters.moduleCode = ''
  filters.operationCode = ''
  filters.targetType = ''
  filters.requestId = ''
  filters.result = undefined
  filters.dateFrom = ''
  filters.dateTo = ''
  void loadLogs()
}

onMounted(() => {
  void loadLogs()
})
</script>

<style scoped lang="scss">
.table-empty,
.detail-empty {
  display: grid;
  gap: 8px;
  justify-items: center;
  padding: 28px 16px 32px;
  text-align: center;
}

.table-empty strong,
.detail-empty strong {
  font-size: 16px;
}

.table-empty p,
.detail-empty p {
  margin: 0;
  max-width: 520px;
  color: var(--kp-text-secondary);
  line-height: 1.7;
}

.table-empty__meta {
  color: var(--kp-ink-faint);
  font-size: 12px;
  line-height: 1.6;
}

.json-block {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
}
</style>
