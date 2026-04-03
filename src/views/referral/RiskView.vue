<template>
  <PageContainer>
    <ReferralGovernanceNav />
    <GovernanceOverviewCards :cards="overviewCards" />

    <FilterPanel description="默认聚焦异常中的邀请记录，可按邀请码、用户和风险原因快速定位治理样本。">
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
        <el-form-item label="风险原因">
          <el-input v-model="filters.riskReason" placeholder="风险原因关键词" clearable />
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
            <el-option label="异常中" :value="1" />
            <el-option label="已解除" :value="0" />
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
        <el-table-column label="邀请人" min-width="160">
          <template #default="{ row }">
            <div class="stack-cell">
              <strong>{{ row.inviterName || '--' }}</strong>
              <span>{{ row.inviterUserId ?? '--' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="被邀请人" min-width="160">
          <template #default="{ row }">
            <div class="stack-cell">
              <strong>{{ row.inviteeName || '--' }}</strong>
              <span>{{ row.inviteeUserId ?? '--' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="riskReason" label="风险原因" min-width="220" show-overflow-tooltip />
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
        <el-table-column label="操作" fixed="right" min-width="280">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button link type="primary" @click="openDetail(row.referralId)">查看详情</el-button>
              <PermissionButton
                v-if="isOperable(row.status, row.riskFlag)"
                link
                type="success"
                action="action.referral.risk.approve"
                @click="openAction('approve', row)"
              >
                通过
              </PermissionButton>
              <PermissionButton
                v-if="isOperable(row.status, row.riskFlag)"
                link
                type="danger"
                action="action.referral.risk.invalidate"
                @click="openAction('invalidate', row)"
              >
                作废
              </PermissionButton>
              <PermissionButton
                v-if="isOperable(row.status, row.riskFlag)"
                link
                action="action.referral.risk.resolve"
                @click="openAction('resolve', row)"
              >
                标记复核完成
              </PermissionButton>
            </div>
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

    <el-drawer v-model="detailVisible" title="异常邀请详情" size="860px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-layout">
        <div v-if="detail?.recordInfo" class="detail-actions">
          <PermissionButton
            v-if="isOperable(detail.recordInfo.status, detail.recordInfo.riskFlag)"
            type="success"
            action="action.referral.risk.approve"
            @click="openAction('approve', currentRow)"
          >
            通过
          </PermissionButton>
          <PermissionButton
            v-if="isOperable(detail.recordInfo.status, detail.recordInfo.riskFlag)"
            type="danger"
            action="action.referral.risk.invalidate"
            @click="openAction('invalidate', currentRow)"
          >
            作废
          </PermissionButton>
          <PermissionButton
            v-if="isOperable(detail.recordInfo.status, detail.recordInfo.riskFlag)"
            action="action.referral.risk.resolve"
            @click="openAction('resolve', currentRow)"
          >
            标记复核完成
          </PermissionButton>
        </div>

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

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>风险摘要</h3></template>
            <div class="detail-grid">
              <div v-for="item in riskBlocks" :key="item.label" class="detail-block">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </el-card>

          <el-card class="detail-card" shadow="never">
            <template #header><h3>设备命中摘要</h3></template>
            <div class="detail-grid">
              <div v-for="item in deviceBlocks" :key="item.label" class="detail-block">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </el-card>
        </div>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>同小时命中摘要</h3></template>
          <div class="detail-grid">
            <div v-for="item in sameHourBlocks" :key="item.label" class="detail-block">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>处理日志</h3></template>
          <el-table :data="detail?.historyLogs || []" empty-text="暂无处理日志">
            <el-table-column prop="operationLogId" label="日志 ID" min-width="110" />
            <el-table-column label="操作" min-width="140">
              <template #default="{ row }">{{ getOperationLabel(row.operationCode) }}</template>
            </el-table-column>
            <el-table-column label="操作人" min-width="140">
              <template #default="{ row }">{{ row.adminUserName || row.adminUserId || '--' }}</template>
            </el-table-column>
            <el-table-column label="结果" min-width="100">
              <template #default="{ row }">
                <StatusTag :label="row.operationResult === 1 ? '成功' : '失败'" :tone="row.operationResult === 1 ? 'success' : 'danger'" />
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="180">
              <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="上下文" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">{{ row.extraContextJson || '--' }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-drawer>

    <AuditConfirmDialog
      v-model="actionVisible"
      :title="actionDialogTitle"
      :confirm-text="actionConfirmText"
      :placeholder="actionPlaceholder"
      :reason-label="'操作备注'"
      :meta="actionMeta"
      @submit="submitAction"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { approveReferralRisk, fetchReferralRiskDetail, fetchReferralRiskList, invalidateReferralRisk, resolveReferralRisk } from '@/api/referral'
import FilterPanel from '@/components/business/FilterPanel.vue'
import GovernanceOverviewCards from '@/components/business/GovernanceOverviewCards.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import ReferralGovernanceNav from '@/components/business/ReferralGovernanceNav.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import AuditConfirmDialog from '@/components/dialogs/AuditConfirmDialog.vue'
import { referralRiskFlagMap, referralStatusMap } from '@/constants/status'
import {
  getDashboardContextFallbackSummary,
  getDashboardContextTitle,
  readRouteQueryString,
  resolveDashboardRouteSource,
} from '@/utils/dashboard-context'
import type { ReferralRiskDetail, ReferralRiskItem, ReferralRiskQuery } from '@/types/referral'
import { formatDateTime, maskPhone, maskText } from '@/utils/format'

type RiskActionMode = 'approve' | 'invalidate' | 'resolve'
type DateRangeValue = [string, string] | []

const loading = ref(false)
const route = useRoute()
const router = useRouter()
const detailLoading = ref(false)
const rows = ref<ReferralRiskItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<ReferralRiskDetail | null>(null)
const currentDetailId = ref<number | null>(null)
const currentRow = ref<ReferralRiskItem | null>(null)
const actionVisible = ref(false)
const actionMode = ref<RiskActionMode>('approve')

const filters = reactive<ReferralRiskQuery>({
  pageNo: 1,
  pageSize: 20,
  inviteCode: '',
  inviterUserId: undefined,
  inviteeUserId: undefined,
  riskReason: '',
  status: 3,
  riskFlag: 1,
  registeredAtFrom: undefined,
  registeredAtTo: undefined,
})

const overviewCards = computed(() => {
  const pendingCount = rows.value.filter((item) => isOperable(item.status, item.riskFlag)).length
  const closedCount = rows.value.filter((item) => !isOperable(item.status, item.riskFlag)).length

  return [
    {
      label: '查询规模',
      badge: '当前查询',
      tone: null,
      value: `${total.value} 条`,
      hint: '当前筛选条件下命中的异常邀请记录总数。',
    },
    {
      label: '当前页待处置',
      badge: '待处理',
      tone: 'warning' as const,
      value: `${pendingCount} 条`,
      hint: '当前页样本中仍可继续通过、作废或标记完成的异常记录。',
    },
    {
      label: '当前页已处理',
      badge: '已完成',
      tone: 'success' as const,
      value: `${closedCount} 条`,
      hint: '当前页样本中已脱离待处置状态的异常记录。',
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

const recordBlocks = computed(() => {
  const record = detail.value?.recordInfo
  if (!record) {
    return []
  }
  return [
    { label: '邀请记录 ID', value: record.referralId ?? '--' },
    { label: '邀请码', value: record.inviteCode || '--' },
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

const riskBlocks = computed(() => {
  const risk = detail.value?.riskInfo
  if (!risk) {
    return []
  }
  return [
    { label: '当前邀请状态', value: (referralStatusMap[risk.currentStatus || 0] || referralStatusMap[0]).label },
    { label: '风险标记', value: (referralRiskFlagMap[risk.riskFlag || 0] || referralRiskFlagMap[0]).label },
    { label: '风险原因', value: risk.riskReason || '--' },
  ]
})

const deviceBlocks = computed(() => {
  const device = detail.value?.deviceHitSummary
  return [
    { label: '设备指纹', value: maskText(device?.deviceFingerprint) },
    { label: '命中次数', value: device?.hitCount ?? 0 },
    { label: '关联记录', value: joinIds(device?.relatedReferralIds) },
  ]
})

const sameHourBlocks = computed(() => {
  const sameHour = detail.value?.sameHourHitSummary
  return [
    { label: '邀请码', value: sameHour?.inviteCode || '--' },
    { label: '开始时间', value: formatDateTime(sameHour?.hourStart) },
    { label: '结束时间', value: formatDateTime(sameHour?.hourEnd) },
    { label: '命中次数', value: sameHour?.hitCount ?? 0 },
    { label: '关联记录', value: joinIds(sameHour?.relatedReferralIds) },
  ]
})

const actionDialogTitle = computed(() => {
  if (actionMode.value === 'approve') {
    return '确认通过异常邀请'
  }
  if (actionMode.value === 'invalidate') {
    return '确认作废异常邀请'
  }
  return '确认标记复核完成'
})

const actionConfirmText = computed(() => {
  if (actionMode.value === 'approve') {
    return '确认通过'
  }
  if (actionMode.value === 'invalidate') {
    return '确认作废'
  }
  return '确认完成'
})

const actionPlaceholder = computed(() => {
  if (actionMode.value === 'approve') {
    return '请输入通过备注，可留空'
  }
  if (actionMode.value === 'invalidate') {
    return '请输入作废原因，可留空'
  }
  return '请输入复核结论，可留空'
})

const actionMeta = computed(() => [
  { label: '邀请记录 ID', value: currentRow.value?.referralId },
  { label: '邀请码', value: currentRow.value?.inviteCode },
  { label: '风险原因', value: currentRow.value?.riskReason || '--' },
])
const dashboardContextSource = computed(() => resolveDashboardRouteSource(route.query.source))
const dashboardContextTitle = computed(() => getDashboardContextTitle(dashboardContextSource.value))
const dashboardContextSummary = computed(() => {
  const parts: string[] = []
  if (filters.inviteCode) {
    parts.push(`邀请码 ${filters.inviteCode}`)
  }
  if (filters.inviteeUserId != null) {
    parts.push(`被邀请人 ID ${filters.inviteeUserId}`)
  }
  if (filters.registeredAtFrom && filters.registeredAtTo) {
    parts.push(`注册时间 ${formatDateTime(filters.registeredAtFrom)} 至 ${formatDateTime(filters.registeredAtTo)}`)
  }
  return parts.join('；') || getDashboardContextFallbackSummary(dashboardContextSource.value)
})

function joinIds(values?: number[] | null) {
  if (!values?.length) {
    return '--'
  }
  return values.join(', ')
}

function buildUserBlocks(user?: ReferralRiskDetail['inviterInfo']) {
  return [
    { label: '用户 ID', value: user?.userId ?? '--' },
    { label: '用户名', value: user?.userName || '--' },
    { label: '昵称', value: user?.nickname || '--' },
    { label: '手机号', value: maskPhone(user?.phone) },
    { label: '实名状态', value: user?.realAuthStatus === 1 ? '已实名' : '未实名' },
    { label: '有效邀请数', value: user?.validInviteCount ?? 0 },
  ]
}

function getOperationLabel(operationCode?: string | null) {
  if (operationCode === 'approve') {
    return '异常邀请通过'
  }
  if (operationCode === 'invalidate') {
    return '异常邀请作废'
  }
  if (operationCode === 'resolve') {
    return '标记复核完成'
  }
  return operationCode || '--'
}

function isOperable(status?: number | null, riskFlag?: number | null) {
  return status === 3 && riskFlag === 1
}

function applyRouteFilters() {
  const registeredAtFrom = readRouteQueryString(route.query.registeredAtFrom)
  const registeredAtTo = readRouteQueryString(route.query.registeredAtTo)
  const inviteCode = readRouteQueryString(route.query.inviteCode)
  const inviteeUserId = readRouteQueryString(route.query.inviteeUserId)
  filters.registeredAtFrom = registeredAtFrom
  filters.registeredAtTo = registeredAtTo
  filters.inviteCode = inviteCode || ''
  filters.inviteeUserId = inviteeUserId ? Number(inviteeUserId) : undefined
}

function clearDashboardContext() {
  router.replace({ path: route.path })
}

async function loadList() {
  loading.value = true
  try {
    const result = await fetchReferralRiskList(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  currentDetailId.value = id
  currentRow.value = rows.value.find((item) => item.referralId === id) || currentRow.value
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await fetchReferralRiskDetail(id)
  } finally {
    detailLoading.value = false
  }
}

function openAction(mode: RiskActionMode, row: ReferralRiskItem | null) {
  if (!row) {
    return
  }
  actionMode.value = mode
  currentRow.value = row
  actionVisible.value = true
}

async function submitAction(remark: string) {
  if (!currentRow.value) {
    return
  }

  if (actionMode.value === 'approve') {
    await approveReferralRisk(currentRow.value.referralId, { remark })
  } else if (actionMode.value === 'invalidate') {
    await invalidateReferralRisk(currentRow.value.referralId, { remark })
  } else {
    await resolveReferralRisk(currentRow.value.referralId, { remark })
  }

  ElMessage.success('风控处理已提交')
  actionVisible.value = false
  await loadList()
  if (currentDetailId.value) {
    await openDetail(currentDetailId.value)
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.inviteCode = ''
  filters.inviterUserId = undefined
  filters.inviteeUserId = undefined
  filters.riskReason = ''
  filters.status = 3
  filters.riskFlag = 1
  filters.registeredAtFrom = undefined
  filters.registeredAtTo = undefined
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
  margin-bottom: 18px;
}

.context-alert__content {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
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

.detail-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
  .context-alert__content,
  .detail-split,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
