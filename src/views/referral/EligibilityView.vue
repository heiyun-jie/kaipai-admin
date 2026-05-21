<template>
  <PageContainer>
    <template #actions>
      <PermissionButton action="action.referral.eligibility.grant" type="primary" @click="openAction('grant')">
        手工发放
      </PermissionButton>
    </template>

    <ReferralGovernanceNav />
    <GovernanceOverviewCards :cards="overviewCards" />
    <FilterPanel description="按用户、资格码、资格类型和来源筛选资格记录，手工发放动作要求明确治理来源。">
      <el-form :model="filters" inline>
        <el-form-item label="用户 ID">
          <el-input v-model.number="filters.userId" placeholder="用户 ID" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="filters.phone" placeholder="手机号" clearable />
        </el-form-item>
        <el-form-item label="资格类型">
          <el-input v-model="filters.grantType" placeholder="invite_eligibility" clearable />
        </el-form-item>
        <el-form-item label="资格码">
          <el-input v-model="filters.grantCode" placeholder="资格码" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable style="width: 160px">
            <el-option label="生效中" :value="1" />
            <el-option label="已过期" :value="2" />
            <el-option label="已撤销" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="filters.sourceType" placeholder="manual / policy / payment" clearable />
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker
            v-model="effectiveRange"
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
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">ELIGIBILITY GOVERNANCE / 资格治理</p>
          <h3>邀请资格清单</h3>
        </div>
        <span class="table-header__hint">围绕资格码、来源、生效时间和策略关联治理当前邀请资格。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="grantId" label="资格 ID" min-width="110" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.nickname || '--' }}</strong>
              <span>{{ `${row.userId ?? '--'} / ${maskPhone(row.phone)}` }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column prop="grantType" label="资格类型" min-width="150" />
        <el-table-column prop="grantCode" label="资格码" min-width="160" />
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="resolveEntitlementStatusTag(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="生效时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.effectiveTime) }}</template>
        </el-table-column>
        <el-table-column label="过期时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.expireTime) }}</template>
        </el-table-column>
        <el-table-column label="来源" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.sourceType || '--' }}</strong>
              <span>{{ row.sourceRefId ?? '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" min-width="220">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.grantId)">查看详情</el-button>
              <PermissionButton v-if="isActive(row.status)" link action="action.referral.eligibility.extend" @click="openAction('extend', row)">
                延期
              </PermissionButton>
              <PermissionButton v-if="isActive(row.status)" link type="danger" action="action.referral.eligibility.revoke" @click="openAction('revoke', row)">
                撤销
              </PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
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

    <AdminDetailDrawer v-model="detailVisible" title="资格详情" size="860px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-layout">
        <section v-if="detail?.grantInfo" class="drawer-hero">
          <div>
            <p>ELIGIBILITY DETAIL / 邀请资格</p>
            <strong>{{ detail.grantInfo.grantCode || '资格详情' }}</strong>
            <span>{{ detail.grantInfo.userName || detail.grantInfo.userId || '--' }} · {{ detail.grantInfo.grantType || '--' }}</span>
          </div>
          <StatusTag v-bind="resolveEntitlementStatusTag(detail.grantInfo.status)" />
        </section>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>资格概览</h3></template>
          <DetailGrid>
            <DetailBlock v-for="item in grantBlocks" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </DetailBlock>
          </DetailGrid>
        </el-card>

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>来源信息</h3></template>
            <DetailGrid>
              <DetailBlock v-for="item in sourceBlocks" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </DetailBlock>
            </DetailGrid>
          </el-card>

          <el-card class="detail-card" shadow="never">
            <template #header><h3>关联策略</h3></template>
            <DetailGrid>
              <DetailBlock v-for="item in policyBlocks" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </DetailBlock>
            </DetailGrid>
          </el-card>
        </div>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>关联订单</h3></template>
          <DetailGrid>
            <DetailBlock v-for="item in orderBlocks" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </DetailBlock>
          </DetailGrid>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>操作日志</h3></template>
          <el-table :data="detail?.operatorLogSummary?.recentLogs || []" empty-text="暂无操作日志">
            <el-table-column prop="operationLogId" label="日志 ID" min-width="110" />
            <el-table-column label="操作人" min-width="140">
              <template #default="{ row }">{{ row.adminUserName || row.adminUserId || '--' }}</template>
            </el-table-column>
            <el-table-column prop="operationCode" label="操作" min-width="140" />
            <el-table-column label="结果" min-width="100">
              <template #default="{ row }">
                <StatusTag :label="row.operationResult === 1 ? '成功' : '失败'" :tone="row.operationResult === 1 ? 'success' : 'danger'" />
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="180">
              <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="上下文" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">{{ row.extraContextJson || '--' }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </AdminDetailDrawer>

    <el-dialog v-model="actionVisible" :title="actionDialogTitle" width="620px" destroy-on-close>
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">ELIGIBILITY ACTION / 资格处置</p>
        <strong>{{ actionDialogTitle }}</strong>
        <p>在当前邀请资格模型内执行手工发放、延期和撤销动作。</p>
      </section>
      <el-form label-position="top">
        <template v-if="actionMode === 'grant'">
          <el-form-item label="用户 ID">
            <el-input v-model.number="form.userId" />
          </el-form-item>
          <el-form-item label="资格类型">
            <el-input v-model="form.grantType" placeholder="invite_eligibility" />
          </el-form-item>
          <el-form-item label="资格码">
            <el-input v-model="form.grantCode" placeholder="例如 invite_manual_001" />
          </el-form-item>
          <el-form-item label="生效时间">
            <el-date-picker v-model="form.effectiveTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="过期时间">
            <el-date-picker v-model="form.expireTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="来源类型">
            <el-input v-model="form.sourceType" placeholder="manual" />
          </el-form-item>
          <el-form-item label="来源单据 ID">
            <el-input v-model.number="form.sourceRefId" />
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="资格 ID">
            <el-input :model-value="form.grantId" disabled />
          </el-form-item>
          <el-form-item label="资格码">
            <el-input :model-value="currentRow?.grantCode || '--'" disabled />
          </el-form-item>
          <el-form-item v-if="actionMode === 'extend'" label="新的过期时间">
            <el-date-picker v-model="form.expireTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
          </el-form-item>
        </template>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  extendReferralEligibility,
  fetchReferralEligibilityDetail,
  fetchReferralEligibilityList,
  grantReferralEligibility,
  revokeReferralEligibility,
} from '@/api/referral'
import FilterPanel from '@/components/business/FilterPanel.vue'
import GovernanceOverviewCards from '@/components/business/GovernanceOverviewCards.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import ReferralGovernanceNav from '@/components/business/ReferralGovernanceNav.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { entitlementStatusMap } from '@/constants/status'
import {
  getDashboardContextSummary,
  getDashboardContextTitle,
  readRouteQueryString,
  resolveDashboardRouteSource,
} from '@/utils/dashboard-context'
import type {
  ReferralEligibilityDetail,
  ReferralEligibilityItem,
  ReferralEligibilityQuery,
} from '@/types/referral'
import { formatCurrency, formatDateTime, maskPhone } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type ActionMode = 'grant' | 'extend' | 'revoke'
type DateRangeValue = [string, string] | []

const unknownStatusTag = { label: '未知', tone: 'info' as const }

const loading = ref(false)
const route = useRoute()
const router = useRouter()
const detailLoading = ref(false)
const submitting = ref(false)
const rows = ref<ReferralEligibilityItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const actionVisible = ref(false)
const detail = ref<ReferralEligibilityDetail | null>(null)
const currentDetailId = ref<number | null>(null)
const currentRow = ref<ReferralEligibilityItem | null>(null)
const actionMode = ref<ActionMode>('grant')

const filters = reactive<ReferralEligibilityQuery>({
  pageNo: 1,
  pageSize: 20,
  userId: undefined,
  phone: '',
  grantType: '',
  grantCode: '',
  status: undefined,
  sourceType: '',
  effectiveFrom: undefined,
  effectiveTo: undefined,
  expireFrom: undefined,
  expireTo: undefined,
})

const overviewCards = computed(() => {
  const activeCount = rows.value.filter((item) => item.status === 1).length
  const inactiveCount = rows.value.filter((item) => item.status === 2 || item.status === 3).length
  const manualCount = rows.value.filter((item) => item.sourceType === 'manual').length

  return [
    {
      label: '查询规模',
      badge: '当前查询',
      tone: null,
      value: `${total.value} 条`,
      hint: '当前筛选条件下命中的邀请资格总数。',
    },
    {
      label: '当前页生效中',
      badge: '生效中',
      tone: 'success' as const,
      value: `${activeCount} 条`,
      hint: '当前页样本中仍处于生效状态的邀请资格。',
    },
    {
      label: '当前页已失效',
      badge: '状态',
      tone: 'warning' as const,
      value: `${inactiveCount} 条`,
      hint: '当前页样本中已过期或已撤销的邀请资格。',
    },
    {
      label: '当前页手工来源',
      badge: '治理动作',
      tone: 'info' as const,
      value: `${manualCount} 条`,
      hint: '当前页样本中由后台手工发放的邀请资格。',
    },
  ]
})

const effectiveRange = computed<DateRangeValue>({
  get: (): DateRangeValue =>
    filters.effectiveFrom && filters.effectiveTo ? [filters.effectiveFrom, filters.effectiveTo] as [string, string] : [],
  set: (value: DateRangeValue) => {
    if (Array.isArray(value) && value.length === 2) {
      filters.effectiveFrom = value[0]
      filters.effectiveTo = value[1]
      return
    }
    filters.effectiveFrom = undefined
    filters.effectiveTo = undefined
  },
})

const form = reactive({
  grantId: undefined as number | undefined,
  userId: undefined as number | undefined,
  grantType: 'invite_eligibility',
  grantCode: '',
  effectiveTime: '',
  expireTime: '',
  sourceType: 'manual',
  sourceRefId: undefined as number | undefined,
  remark: '',
})

const actionDialogTitle = computed(() => {
  if (actionMode.value === 'extend') {
    return '延期邀请资格'
  }
  if (actionMode.value === 'revoke') {
    return '撤销邀请资格'
  }
  return '手工发放邀请资格'
})
const dashboardContextSource = computed(() => resolveDashboardRouteSource(route.query.source))
const dashboardContextTitle = computed(() => getDashboardContextTitle(dashboardContextSource.value))
const dashboardContextSummary = computed(() => {
  const parts: string[] = []
  if (filters.effectiveFrom && filters.effectiveTo) {
    parts.push(`生效时间 ${formatDateTime(filters.effectiveFrom)} 至 ${formatDateTime(filters.effectiveTo)}`)
  }
  return parts.join('；') || getDashboardContextSummary(dashboardContextSource.value)
})

const grantBlocks = computed(() => {
  const info = detail.value?.grantInfo
  if (!info) {
    return []
  }
  return [
    { label: '资格 ID', value: info.grantId ?? '--' },
    { label: '用户 ID', value: info.userId ?? '--' },
    { label: '用户名', value: info.userName || '--' },
    { label: '昵称', value: info.nickname || '--' },
    { label: '手机号', value: maskPhone(info.phone) },
    { label: '实名状态', value: formatRealAuthStatus(info.realAuthStatus) },
    { label: '有效邀请数', value: info.validInviteCount ?? 0 },
    { label: '资格类型', value: info.grantType || '--' },
    { label: '资格码', value: info.grantCode || '--' },
    { label: '状态', value: resolveEntitlementStatusTag(info.status).label },
    { label: '生效时间', value: formatDateTime(info.effectiveTime) },
    { label: '过期时间', value: formatDateTime(info.expireTime) },
    { label: '备注', value: info.remark || '--' },
    { label: '创建人', value: info.createUserName || info.createUserId || '--' },
    { label: '创建时间', value: formatDateTime(info.createTime) },
    { label: '最后更新时间', value: formatDateTime(info.lastUpdate) },
  ]
})

const sourceBlocks = computed(() => {
  const source = detail.value?.sourceInfo
  return [
    { label: '来源类型', value: source?.sourceType || '--' },
    { label: '来源单据 ID', value: source?.sourceRefId ?? '--' },
    { label: '来源标题', value: source?.sourceTitle || '--' },
    { label: '来源状态', value: source?.sourceStatus || '--' },
    { label: '关联业务类型', value: source?.relatedBizType || '--' },
    { label: '关联业务 ID', value: source?.relatedBizId ?? '--' },
  ]
})

function resolveEntitlementStatusTag(status?: number | null) {
  return entitlementStatusMap[status || 0] || unknownStatusTag
}

const policyBlocks = computed(() => {
  const policy = detail.value?.relatedPolicy
  return [
    { label: '策略 ID', value: policy?.policyId ?? '--' },
    { label: '策略名称', value: policy?.policyName || '--' },
    { label: '启用状态', value: policy?.enabled == null ? '--' : policy.enabled === 1 ? '启用中' : '已停用' },
    { label: '自动发放', value: policy?.autoGrantEnabled == null ? '--' : policy.autoGrantEnabled === 1 ? '开启' : '关闭' },
    { label: '更新人', value: policy?.updateUserName || '--' },
    { label: '更新时间', value: formatDateTime(policy?.lastUpdate) },
  ]
})

const orderBlocks = computed(() => {
  const order = detail.value?.relatedOrder
  return [
    { label: '支付单 ID', value: order?.paymentOrderId ?? '--' },
    { label: '订单号', value: order?.orderNo || '--' },
    { label: '业务类型', value: order?.bizType || '--' },
    { label: '业务 ID', value: order?.bizRefId ?? '--' },
    { label: '金额', value: formatCurrency(order?.amount) },
    { label: '支付状态', value: order?.payStatus ?? '--' },
    { label: '支付渠道', value: order?.payChannel || '--' },
    { label: '支付时间', value: formatDateTime(order?.paidAt) },
  ]
})

function applyRouteFilters() {
  filters.effectiveFrom = readRouteQueryString(route.query.effectiveFrom)
  filters.effectiveTo = readRouteQueryString(route.query.effectiveTo)
}

function clearDashboardContext() {
  router.replace({ path: route.path })
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

function isActive(status?: number | null) {
  return status === 1
}

function resetActionForm() {
  form.grantId = undefined
  form.userId = undefined
  form.grantType = 'invite_eligibility'
  form.grantCode = ''
  form.effectiveTime = ''
  form.expireTime = ''
  form.sourceType = 'manual'
  form.sourceRefId = undefined
  form.remark = ''
}

async function loadList() {
  loading.value = true
  try {
    const result = await fetchReferralEligibilityList(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  currentDetailId.value = id
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await fetchReferralEligibilityDetail(id)
  } finally {
    detailLoading.value = false
  }
}

function openAction(mode: ActionMode, row?: ReferralEligibilityItem) {
  actionMode.value = mode
  actionVisible.value = true
  currentRow.value = row || null
  resetActionForm()
  if (!row) {
    return
  }
  form.grantId = row.grantId
  form.userId = row.userId == null ? undefined : row.userId
  form.grantType = row.grantType || 'invite_eligibility'
  form.grantCode = row.grantCode || ''
  form.expireTime = row.expireTime || ''
}

async function submitAction() {
  submitting.value = true
  try {
    if (actionMode.value === 'grant') {
      if (!form.userId || !form.grantType || !form.grantCode || !form.sourceType) {
        ElMessage.warning('请填写完整的资格发放信息')
        return
      }
      await grantReferralEligibility({
        userId: form.userId,
        grantType: form.grantType,
        grantCode: form.grantCode,
        effectiveTime: form.effectiveTime || undefined,
        expireTime: form.expireTime || undefined,
        sourceType: form.sourceType,
        sourceRefId: form.sourceRefId,
        remark: form.remark || undefined,
      })
      ElMessage.success('资格发放已提交')
    } else if (actionMode.value === 'extend') {
      if (!form.grantId || !form.expireTime) {
        ElMessage.warning('请填写新的过期时间')
        return
      }
      await extendReferralEligibility({
        grantId: form.grantId,
        expireTime: form.expireTime,
        remark: form.remark || undefined,
      })
      ElMessage.success('资格延期已提交')
    } else {
      if (!form.grantId) {
        ElMessage.warning('未找到可撤销的资格记录')
        return
      }
      await revokeReferralEligibility({
        grantId: form.grantId,
        remark: form.remark || undefined,
      })
      ElMessage.success('资格撤销已提交')
    }

    actionVisible.value = false
    await loadList()
    if (currentDetailId.value) {
      await openDetail(currentDetailId.value)
    }
  } finally {
    submitting.value = false
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.userId = undefined
  filters.phone = ''
  filters.grantType = ''
  filters.grantCode = ''
  filters.status = undefined
  filters.sourceType = ''
  filters.effectiveFrom = undefined
  filters.effectiveTo = undefined
  filters.expireFrom = undefined
  filters.expireTo = undefined
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

.context-alert {
  margin-bottom: 16px;
}

.context-alert__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 960px) {
  .context-alert__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
