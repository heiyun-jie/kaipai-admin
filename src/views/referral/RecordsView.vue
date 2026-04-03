<template>
  <PageContainer>
    <ReferralGovernanceNav />
    <GovernanceOverviewCards :cards="overviewCards" />

    <FilterPanel description="按邀请码、邀请人、被邀请人和状态筛选邀请记录，优先核对真实治理样本。">
      <el-form :model="filters" inline>
        <el-form-item label="邀请码">
          <el-input v-model="filters.inviteCode" placeholder="邀请码" clearable />
        </el-form-item>
        <el-form-item label="邀请人 ID">
          <el-input v-model.number="filters.inviterUserId" placeholder="邀请人 ID" clearable />
        </el-form-item>
        <el-form-item label="被邀请人 ID">
          <el-input v-model.number="filters.inviteeUserId" placeholder="被邀请人 ID" clearable />
        </el-form-item>
        <el-form-item label="邀请状态">
          <el-select v-model="filters.status" clearable style="width: 160px">
            <el-option label="待生效" :value="0" />
            <el-option label="有效" :value="1" />
            <el-option label="已作废" :value="2" />
            <el-option label="复核中" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险状态">
          <el-select v-model="filters.riskFlag" clearable style="width: 160px">
            <el-option label="无风险" :value="0" />
            <el-option label="命中风险" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="注册时间">
          <el-date-picker
            v-model="registeredRange"
            type="datetimerange"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker
            v-model="validatedRange"
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
        <el-button type="primary" @click="loadList">查询</el-button>
      </template>
    </FilterPanel>

    <el-alert
      v-if="dashboardContextSource"
      type="info"
      show-icon
      :closable="false"
      class="context-alert"
    >
      <template #title>{{ dashboardContextTitle }}</template>
      <template #default>
        <div class="context-alert__content">
          <span>{{ dashboardContextSummary }}</span>
          <el-button link type="primary" @click="clearDashboardContext">清空上下文</el-button>
        </div>
      </template>
    </el-alert>

    <el-card class="table-card" shadow="never">
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="referralId" label="邀请记录 ID" min-width="130" />
        <el-table-column prop="inviteCode" label="邀请码" min-width="120" />
        <el-table-column label="邀请人" min-width="180">
          <template #default="{ row }">
            <div class="stack-cell">
              <strong>{{ row.inviterName || '--' }}</strong>
              <span>{{ row.inviterUserId ?? '--' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="被邀请人" min-width="180">
          <template #default="{ row }">
            <div class="stack-cell">
              <strong>{{ row.inviteeName || '--' }}</strong>
              <span>{{ row.inviteeUserId ?? '--' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="邀请状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="referralStatusMap[row.status || 0] || referralStatusMap[0]" />
          </template>
        </el-table-column>
        <el-table-column label="风险状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="referralRiskFlagMap[row.riskFlag || 0] || referralRiskFlagMap[0]" />
          </template>
        </el-table-column>
        <el-table-column label="注册时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.registeredAt) }}</template>
        </el-table-column>
        <el-table-column label="生效时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.validatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.referralId, row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
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

    <el-drawer v-model="detailVisible" title="邀请记录详情" size="860px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-layout">
        <el-card class="detail-card" shadow="never">
          <template #header><h3>记录概览</h3></template>
          <div class="detail-grid">
            <div v-for="item in recordBlocks" :key="item.label" class="detail-block">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </el-card>

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>邀请人</h3></template>
            <div class="detail-grid">
              <div v-for="item in inviterBlocks" :key="item.label" class="detail-block">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </el-card>

          <el-card class="detail-card" shadow="never">
            <template #header><h3>被邀请人</h3></template>
            <div class="detail-grid">
              <div v-for="item in inviteeBlocks" :key="item.label" class="detail-block">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </el-card>
        </div>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>风控与资格摘要</h3></template>
          <div class="detail-grid">
            <div v-for="item in riskBlocks" :key="item.label" class="detail-block">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </el-card>
      </div>
    </el-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchReferralRecordDetail, fetchReferralRecords } from '@/api/referral'
import FilterPanel from '@/components/business/FilterPanel.vue'
import GovernanceOverviewCards from '@/components/business/GovernanceOverviewCards.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import ReferralGovernanceNav from '@/components/business/ReferralGovernanceNav.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { referralRiskFlagMap, referralStatusMap } from '@/constants/status'
import {
  getDashboardContextFallbackSummary,
  getDashboardContextTitle,
  readRouteQueryString,
  resolveDashboardRouteSource,
} from '@/utils/dashboard-context'
import type { ReferralRecordDetail, ReferralRecordItem, ReferralRecordQuery } from '@/types/referral'
import { formatDateTime, maskPhone, maskText } from '@/utils/format'

type DateRangeValue = [string, string] | []

const loading = ref(false)
const route = useRoute()
const router = useRouter()
const detailLoading = ref(false)
const rows = ref<ReferralRecordItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<ReferralRecordDetail | null>(null)

const filters = reactive<ReferralRecordQuery>({
  pageNo: 1,
  pageSize: 20,
  inviteCode: '',
  inviterUserId: undefined,
  inviteeUserId: undefined,
  status: undefined,
  riskFlag: undefined,
  registeredAtFrom: undefined,
  registeredAtTo: undefined,
  validatedAtFrom: undefined,
  validatedAtTo: undefined,
})

const overviewCards = computed(() => {
  const validCount = rows.value.filter((item) => item.status === 1).length
  const riskCount = rows.value.filter((item) => item.riskFlag === 1).length

  return [
    {
      label: '查询规模',
      badge: '当前查询',
      tone: null,
      value: `${total.value} 条`,
      hint: '当前筛选条件下的邀请记录总数。',
    },
    {
      label: '当前页有效记录',
      badge: '状态',
      tone: 'success' as const,
      value: `${validCount} 条`,
      hint: '当前页样本中处于有效状态的邀请记录。',
    },
    {
      label: '当前页风险命中',
      badge: '风控',
      tone: 'warning' as const,
      value: `${riskCount} 条`,
      hint: '当前页样本中被标记为命中风险的邀请记录。',
    },
  ]
})

const registeredRange = computed<DateRangeValue>({
  get: (): DateRangeValue =>
    filters.registeredAtFrom && filters.registeredAtTo ? [filters.registeredAtFrom, filters.registeredAtTo] as [string, string] : [],
  set: (value: DateRangeValue) => {
    if (Array.isArray(value) && value.length === 2) {
      filters.registeredAtFrom = value[0]
      filters.registeredAtTo = value[1]
      return
    }
    filters.registeredAtFrom = undefined
    filters.registeredAtTo = undefined
  },
})

const validatedRange = computed<DateRangeValue>({
  get: (): DateRangeValue =>
    filters.validatedAtFrom && filters.validatedAtTo ? [filters.validatedAtFrom, filters.validatedAtTo] as [string, string] : [],
  set: (value: DateRangeValue) => {
    if (Array.isArray(value) && value.length === 2) {
      filters.validatedAtFrom = value[0]
      filters.validatedAtTo = value[1]
      return
    }
    filters.validatedAtFrom = undefined
    filters.validatedAtTo = undefined
  },
})

const recordBlocks = computed(() => {
  const record = detail.value?.recordInfo
  if (!record) {
    return []
  }
  return [
    { label: '邀请记录 ID', value: record.referralId ?? '--' },
    { label: '邀请码', value: record.inviteCode || '--' },
    { label: '邀请码 ID', value: record.inviteCodeId ?? '--' },
    { label: '邀请状态', value: (referralStatusMap[record.status || 0] || referralStatusMap[0]).label },
    { label: '风险状态', value: (referralRiskFlagMap[record.riskFlag || 0] || referralRiskFlagMap[0]).label },
    { label: '风险原因', value: record.riskReason || '--' },
    { label: '设备指纹', value: maskText(record.registerDeviceFingerprint) },
    { label: '注册时间', value: formatDateTime(record.registeredAt) },
    { label: '生效时间', value: formatDateTime(record.validatedAt) },
  ]
})

const inviterBlocks = computed(() => buildUserBlocks(detail.value?.inviterInfo))
const inviteeBlocks = computed(() => buildUserBlocks(detail.value?.inviteeInfo))
const dashboardContextSource = computed(() => resolveDashboardRouteSource(route.query.source))
const dashboardContextTitle = computed(() => getDashboardContextTitle(dashboardContextSource.value))
const dashboardContextSummary = computed(() => {
  const parts: string[] = []
  if (filters.registeredAtFrom && filters.registeredAtTo) {
    parts.push(`注册时间 ${formatDateTime(filters.registeredAtFrom)} 至 ${formatDateTime(filters.registeredAtTo)}`)
  }
  return parts.join('；') || getDashboardContextFallbackSummary(dashboardContextSource.value)
})

const riskBlocks = computed(() => {
  const risk = detail.value?.riskInfo
  if (!risk) {
    return []
  }
  return [
    { label: '当前状态', value: (referralStatusMap[risk.status || 0] || referralStatusMap[0]).label },
    { label: '风险标记', value: (referralRiskFlagMap[risk.riskFlag || 0] || referralRiskFlagMap[0]).label },
    { label: '风险原因', value: risk.riskReason || '--' },
    { label: '设备命中数', value: risk.sameDeviceHitCount ?? 0 },
    { label: '关联资格码', value: risk.relatedGrantCodes?.length ? risk.relatedGrantCodes.join(', ') : '--' },
    { label: '设备指纹', value: maskText(risk.registerDeviceFingerprint) },
  ]
})

function buildUserBlocks(user?: ReferralRecordDetail['inviterInfo']) {
  return [
    { label: '用户 ID', value: user?.userId ?? '--' },
    { label: '用户名', value: user?.userName || '--' },
    { label: '昵称', value: user?.nickname || '--' },
    { label: '手机号', value: maskPhone(user?.phone) },
    { label: '实名状态', value: formatRealAuthStatus(user?.realAuthStatus) },
    { label: '有效邀请数', value: user?.validInviteCount ?? 0 },
  ]
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

function applyRouteFilters() {
  filters.registeredAtFrom = readRouteQueryString(route.query.registeredAtFrom)
  filters.registeredAtTo = readRouteQueryString(route.query.registeredAtTo)
}

function clearDashboardContext() {
  router.replace({ path: route.path })
}

async function loadList() {
  loading.value = true
  try {
    const result = await fetchReferralRecords(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number, row?: ReferralRecordItem) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await fetchReferralRecordDetail(id)
    if (!detail.value?.recordInfo && row) {
      detail.value = {
        recordInfo: {
          referralId: row.referralId,
          inviteCode: row.inviteCode,
          status: row.status,
          riskFlag: row.riskFlag,
          registeredAt: row.registeredAt,
          validatedAt: row.validatedAt,
        },
      }
    }
  } finally {
    detailLoading.value = false
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.inviteCode = ''
  filters.inviterUserId = undefined
  filters.inviteeUserId = undefined
  filters.status = undefined
  filters.riskFlag = undefined
  filters.registeredAtFrom = undefined
  filters.registeredAtTo = undefined
  filters.validatedAtFrom = undefined
  filters.validatedAtTo = undefined
  loadList()
}

watch(
  () => route.fullPath,
  () => {
    applyRouteFilters()
    loadList()
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.table-card,
.detail-card {
  border: 1px solid var(--kp-border);
  background: var(--kp-surface);
}

.context-alert {
  margin-bottom: 16px;
}

.context-alert__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stack-cell {
  display: grid;

  strong {
    font-size: 13px;
  }

  span {
    color: var(--kp-text-secondary);
    font-size: 12px;
  }
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-layout {
  display: grid;
  gap: 16px;
}

.detail-split {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-block {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(47, 36, 27, 0.05);

  span {
    color: var(--kp-text-secondary);
    font-size: 12px;
  }

  strong {
    font-size: 14px;
    line-height: 1.6;
    word-break: break-all;
  }
}

@media (max-width: 960px) {
  .detail-split,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .context-alert__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
