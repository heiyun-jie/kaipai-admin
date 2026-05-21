<template>
  <PageContainer>
    <el-card class="table-card actions-toolbar-card" shadow="never">
      <div class="actions-toolbar">
        <div class="actions-toolbar__copy">
          <p class="actions-toolbar__eyebrow">AI-RECOMMENDED ACTIONS</p>
          <h3>运营建议 · 基于当前真实治理数据生成</h3>
          <span>当前页整合现有统计与动作入口。</span>
        </div>

        <div class="actions-toolbar__controls">
          <el-date-picker
            v-model="dateRange"
            class="actions-toolbar__date-range"
            type="datetimerange"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" :loading="loading" @click="loadActionBoard">刷新</el-button>
        </div>
      </div>
    </el-card>

    <section class="action-recommendations operate-actions-recommendations">
      <article
        v-for="action in actionCards"
        :key="action.key"
        class="action-recommendation"
        :data-featured="action.featured === true"
      >
        <div class="action-recommendation__meta">
          <div class="action-recommendation__icon">{{ action.featured ? '✦' : '↗' }}</div>
          <div class="action-recommendation__copy">
            <div class="action-recommendation__header">
              <strong>{{ action.title }}</strong>
              <span v-if="action.featured" class="action-recommendation__badge">AI 推荐</span>
            </div>
            <p>{{ action.target }}</p>
            <span>{{ action.hint }}</span>
          </div>
        </div>

        <div class="action-recommendation__side">
          <strong>{{ action.metric }}</strong>
          <small>{{ action.metricLabel }}</small>
          <el-button type="primary" plain :disabled="!action.accessible" @click="openAction(action.route)">
            {{ action.buttonLabel }}
          </el-button>
        </div>
      </article>
    </section>

    <section v-if="actionOverviewCards.length" class="page-overview operate-overview operate-overview--compact">
      <article
        v-for="item in actionOverviewCards"
        :key="item.key"
        class="page-overview-card"
      >
        <div class="page-overview-card__head">
          <p>{{ item.eyebrow }}</p>
          <span>{{ item.badge }}</span>
        </div>
        <strong>{{ item.valueLabel }}</strong>
        <small>{{ item.hint }}</small>
      </article>
    </section>

    <el-card class="table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">RECENT GOVERNANCE / 当前动态</p>
          <h3>最近治理动态</h3>
        </div>
        <span class="table-header__hint">当前展示后台概览接口返回的运营治理动态。</span>
      </div>

      <div class="governance-ledger">
        <div class="governance-ledger__head">
          <span>动态</span>
          <span>业务线</span>
          <span>状态</span>
          <span>发生时间</span>
          <span>处理</span>
        </div>
        <div v-if="visibleRecentItems.length" class="governance-ledger__body">
          <article v-for="item in visibleRecentItems" :key="`${item.bizLine}-${item.itemId}`" class="governance-ledger__row">
            <div class="governance-ledger__cell governance-ledger__cell--main">
              <strong>{{ getRecentItemTitle(item) }}</strong>
              <span>{{ getRecentItemSummary(item) }}</span>
            </div>
            <div class="governance-ledger__cell">
              <span class="governance-ledger__bizline">{{ dashboardBizLineLabelMap[item.bizLine] || item.bizLine }}</span>
            </div>
            <div class="governance-ledger__cell governance-ledger__cell--status">
              <StatusTag v-bind="getRecentStatus(item)" />
            </div>
            <div class="governance-ledger__cell">
              <span class="governance-ledger__time">{{ formatDateTime(item.occurredAt) }}</span>
            </div>
            <div class="governance-ledger__cell governance-ledger__cell--action">
              <el-button link type="primary" :disabled="!canOpenRoute(getRecentRoute(item))" @click="openAction(getRecentRoute(item), item)">
                进入处理
              </el-button>
            </div>
          </article>
        </div>
        <div v-else class="governance-ledger__empty-row">
          <strong>当前时间窗口没有治理动态</strong>
          <span>可以切换时间范围查看真实治理动态。</span>
        </div>
      </div>
    </el-card>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchDashboardOverview } from '@/api/dashboard'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { PERMISSIONS } from '@/constants/permission'
import { usePermissionStore } from '@/stores/permission'
import type { DashboardOverview, DashboardOverviewQuery, DashboardRecentItem } from '@/types/dashboard'
import { formatDateTime } from '@/utils/format'

type DateRangeValue = [string, string] | []
type StatusTone = 'info' | 'warning' | 'success' | 'danger'

const router = useRouter()
const permissionStore = usePermissionStore()
const loading = ref(false)
const overview = reactive<DashboardOverview>({
  verifyPendingCount: null,
  referralRiskPendingCount: null,
  refundPendingCount: null,
  todayPaymentOrderCount: null,
  activeShareCardCount: null,
  activeShareOwnerCount: null,
  shareViewCount: null,
  uniqueViewerCount: null,
  approvedContactRequestCount: null,
  pendingContactRequestCount: null,
  convertedViewerCount: null,
  classicSceneViewCount: null,
  urbanSceneViewCount: null,
  costumeSceneViewCount: null,
  recentItems: [],
})
const filters = reactive<DashboardOverviewQuery>({
  dateFrom: undefined,
  dateTo: undefined,
})

const dateRange = computed<DateRangeValue>({
  get: (): DateRangeValue => (filters.dateFrom && filters.dateTo ? [filters.dateFrom, filters.dateTo] : []),
  set: (value: DateRangeValue) => {
    if (Array.isArray(value) && value.length === 2) {
      filters.dateFrom = value[0]
      filters.dateTo = value[1]
      return
    }
    filters.dateFrom = undefined
    filters.dateTo = undefined
  },
})

const dashboardBizLineLabelMap: Record<string, string> = {
  verify: '实名认证治理',
  referral: '邀请治理',
  refund: '退款治理',
  payment: '支付治理',
}

const routePermissionMap: Record<string, string> = {
  '/content/contact-requests': PERMISSIONS.page.contentContactRequests,
  '/verify/pending': PERMISSIONS.page.verifyPending,
  '/referral/risk': PERMISSIONS.page.referralRisk,
  '/refund/orders': PERMISSIONS.page.refundOrders,
  '/payment/orders': PERMISSIONS.page.paymentOrders,
}

const actionCards = computed(() => [
  {
    key: 'contact',
    title: '跟进待处理联系方式申请',
    target: '目标页：联系方式申请',
    hint: '当前所有待处理联系申请仍由现有真实审批页承接。',
    metric: formatMetric(overview.pendingContactRequestCount),
    metricLabel: '待处理',
    route: '/content/contact-requests',
    requiredPagePermission: PERMISSIONS.page.contentContactRequests,
    buttonLabel: '进入处理',
    featured: Number(overview.pendingContactRequestCount || 0) > 0,
    accessible: permissionStore.hasPage(PERMISSIONS.page.contentContactRequests),
  },
  {
    key: 'verify',
    title: '复核实名认证待审队列',
    target: '目标页：实名认证待审核',
    hint: '当前认证待审由实名认证审核页承接。',
    metric: formatMetric(overview.verifyPendingCount),
    metricLabel: '待审核',
    route: '/verify/pending',
    requiredPagePermission: PERMISSIONS.page.verifyPending,
    buttonLabel: '进入复核',
    featured: Number(overview.verifyPendingCount || 0) > 0,
    accessible: permissionStore.hasPage(PERMISSIONS.page.verifyPending),
  },
  {
    key: 'referral',
    title: '跟进异常邀请待处理记录',
    target: '目标页：异常邀请',
    hint: '当前异常邀请复核由邀请治理页承接。',
    metric: formatMetric(overview.referralRiskPendingCount),
    metricLabel: '待复核',
    route: '/referral/risk',
    requiredPagePermission: PERMISSIONS.page.referralRisk,
    buttonLabel: '进入治理',
    featured: Number(overview.referralRiskPendingCount || 0) > 0,
    accessible: permissionStore.hasPage(PERMISSIONS.page.referralRisk),
  },
  {
    key: 'refund',
    title: '处理退款待审核记录',
    target: '目标页：退款单',
    hint: '当前退款审核仍由退款中心工具页承接。',
    metric: formatMetric(overview.refundPendingCount),
    metricLabel: '待审核',
    route: '/refund/orders',
    requiredPagePermission: PERMISSIONS.page.refundOrders,
    buttonLabel: '进入审核',
    featured: Number(overview.refundPendingCount || 0) > 0,
    accessible: permissionStore.hasPage(PERMISSIONS.page.refundOrders),
  },
].filter((action) => action.accessible))

const actionOverviewCards = computed(() => [
  {
    key: 'contact',
    eyebrow: 'PENDING CONTACT',
    badge: 'FOLLOW UP',
    valueLabel: formatMetric(overview.pendingContactRequestCount),
    hint: '当前待处理的联系方式申请，可直接进入正式审批页处理。',
    pagePermission: PERMISSIONS.page.contentContactRequests,
  },
  {
    key: 'verify',
    eyebrow: 'VERIFY REVIEW',
    badge: 'QUEUE',
    valueLabel: formatMetric(overview.verifyPendingCount),
    hint: '当前待审核实名认证记录，由实名认证治理页承接。',
    pagePermission: PERMISSIONS.page.verifyPending,
  },
  {
    key: 'referral',
    eyebrow: 'REFERRAL RISK',
    badge: 'REVIEW',
    valueLabel: formatMetric(overview.referralRiskPendingCount),
    hint: '当前待处理异常邀请，由邀请治理页承接。',
    pagePermission: PERMISSIONS.page.referralRisk,
  },
].filter((item) => permissionStore.hasPage(item.pagePermission)))

const visibleRecentItems = computed(() => overview.recentItems.filter((item) => canOpenRoute(getRecentRoute(item))))

function formatMetric(value?: number | null) {
  return value ?? '--'
}

function getRecentStatus(item: DashboardRecentItem) {
  if (item.bizLine === 'verify') {
    return { label: item.status === 1 ? '待审核' : `状态 ${item.status ?? '--'}`, tone: (item.status === 1 ? 'warning' : 'info') as StatusTone }
  }
  if (item.bizLine === 'referral') {
    return { label: item.status === 3 ? '待复核' : `状态 ${item.status ?? '--'}`, tone: (item.status === 3 ? 'warning' : 'info') as StatusTone }
  }
  if (item.bizLine === 'refund') {
    return { label: item.status === 0 ? '待审核' : `状态 ${item.status ?? '--'}`, tone: (item.status === 0 ? 'warning' : 'info') as StatusTone }
  }
  if (item.bizLine === 'payment') {
    return { label: item.status === 1 ? '已支付' : `状态 ${item.status ?? '--'}`, tone: (item.status === 1 ? 'success' : 'info') as StatusTone }
  }
  return { label: `状态 ${item.status ?? '--'}`, tone: 'info' as StatusTone }
}

function getRecentItemTitle(item: DashboardRecentItem) {
  if (item.itemType === 'payment_order') {
    return '支付订单动态'
  }
  return `${dashboardBizLineLabelMap[item.bizLine] || item.bizLine} · ${item.title}`
}

function getRecentItemSummary(item: DashboardRecentItem) {
  const reference = item.referenceNo ? ` · ${item.referenceNo}` : ''
  const user = item.userId != null ? ` · 用户 ${item.userId}` : ''
  return `${dashboardBizLineLabelMap[item.bizLine] || item.bizLine}${reference}${user}`
}

function getRecentRoute(item: DashboardRecentItem) {
  if (item.itemType === 'identity_verification') {
    return '/verify/pending'
  }
  if (item.itemType === 'referral_risk') {
    return '/referral/risk'
  }
  if (item.itemType === 'refund_order') {
    return '/refund/orders'
  }
  if (item.itemType === 'payment_order') {
    return '/payment/orders'
  }
  return '/dashboard/index'
}

function canOpenRoute(path: string) {
  const permission = routePermissionMap[path]
  return !permission || permissionStore.hasPage(permission)
}

function buildRouteQuery(path: string, item?: DashboardRecentItem) {
  const query: Record<string, string | number> = {}

  if (filters.dateFrom && filters.dateTo) {
    if (path === '/referral/risk') {
      query.registeredAtFrom = filters.dateFrom
      query.registeredAtTo = filters.dateTo
    }
    if (path === '/verify/pending') {
      query.submitTimeFrom = filters.dateFrom
      query.submitTimeTo = filters.dateTo
    }
    if (path === '/refund/orders' || path === '/payment/orders') {
      query.createdAtFrom = filters.dateFrom
      query.createdAtTo = filters.dateTo
    }
    if (path === '/content/contact-requests') {
      query.requestedAtFrom = filters.dateFrom
      query.requestedAtTo = filters.dateTo
    }
  }

  if (item?.itemType === 'identity_verification' && item.userId != null) {
    query.userId = item.userId
  }
  if (item?.itemType === 'referral_risk') {
    if (item.referenceNo) {
      query.inviteCode = item.referenceNo
    }
    if (item.userId != null) {
      query.inviteeUserId = item.userId
    }
  }
  if (item?.itemType === 'refund_order') {
    if (item.referenceNo) {
      query.refundNo = item.referenceNo
    }
    if (item.userId != null) {
      query.userId = item.userId
    }
  }
  if (item?.itemType === 'payment_order') {
    if (item.referenceNo) {
      query.orderNo = item.referenceNo
    }
    if (item.userId != null) {
      query.userId = item.userId
    }
  }

  return Object.keys(query).length ? query : undefined
}

function openAction(path: string, item?: DashboardRecentItem) {
  if (!canOpenRoute(path)) {
    ElMessage.warning('当前账号没有目标页面权限')
    return
  }
  router.push({
    path,
    query: buildRouteQuery(path, item),
  })
}

async function loadActionBoard() {
  loading.value = true
  try {
    const overviewData = await fetchDashboardOverview({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    })
    overview.verifyPendingCount = overviewData.verifyPendingCount
    overview.referralRiskPendingCount = overviewData.referralRiskPendingCount
    overview.refundPendingCount = overviewData.refundPendingCount
    overview.todayPaymentOrderCount = overviewData.todayPaymentOrderCount
    overview.activeShareCardCount = overviewData.activeShareCardCount
    overview.activeShareOwnerCount = overviewData.activeShareOwnerCount
    overview.shareViewCount = overviewData.shareViewCount
    overview.uniqueViewerCount = overviewData.uniqueViewerCount
    overview.approvedContactRequestCount = overviewData.approvedContactRequestCount
    overview.pendingContactRequestCount = overviewData.pendingContactRequestCount
    overview.convertedViewerCount = overviewData.convertedViewerCount
    overview.classicSceneViewCount = overviewData.classicSceneViewCount
    overview.urbanSceneViewCount = overviewData.urbanSceneViewCount
    overview.costumeSceneViewCount = overviewData.costumeSceneViewCount
    overview.recentItems = overviewData.recentItems || []
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.dateFrom = undefined
  filters.dateTo = undefined
  loadActionBoard()
}

onMounted(loadActionBoard)
</script>

<style scoped lang="scss">
.actions-toolbar-card :deep(.el-card__body) {
  padding-top: 18px;
  padding-bottom: 18px;
}

.actions-toolbar {
  display: grid;
  gap: 14px;
  align-items: start;
}

.actions-toolbar__copy {
  display: grid;
  gap: 6px;
}

.actions-toolbar__eyebrow {
  margin: 0;
  color: rgba(47, 36, 27, 0.42);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.28em;
}

.actions-toolbar__copy h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.18;
}

.actions-toolbar__copy span {
  max-width: 760px;
  color: rgba(47, 36, 27, 0.56);
  font-size: 13px;
  line-height: 1.6;
}

.actions-toolbar__controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.actions-toolbar__date-range {
  width: 320px;
}

.actions-toolbar__controls :deep(.el-range-editor.el-input__wrapper) {
  min-height: 36px;
  border-radius: 12px;
}

.actions-toolbar__controls :deep(.el-button) {
  min-height: 36px;
  padding-inline: 14px;
  border-radius: 12px;
}

.operate-overview {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.operate-overview--compact {
  gap: 12px;
}

.operate-overview--compact :deep(.page-overview-card) {
  min-height: 112px;
  padding: 14px 16px 12px;
  gap: 8px;
  border-radius: 18px;
}

.operate-overview--compact :deep(.page-overview-card__head) {
  gap: 10px;
}

.operate-overview--compact :deep(.page-overview-card__head p) {
  font-size: 10px;
}

.operate-overview--compact :deep(.page-overview-card__head span) {
  min-height: 22px;
  padding: 0 8px;
  font-size: 9px;
}

.operate-overview--compact :deep(.page-overview-card strong) {
  font-size: 22px;
}

.operate-overview--compact :deep(.page-overview-card small) {
  font-size: 12px;
  line-height: 1.55;
}

.operate-actions-recommendations {
  display: grid;
  gap: 10px;
}

.action-recommendation {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  min-height: 112px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(80, 63, 47, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(250, 244, 236, 0.92)),
    rgba(255, 251, 245, 0.92);
  box-shadow: 0 16px 34px rgba(63, 42, 20, 0.08);
}

.action-recommendation[data-featured='true'] {
  border-color: rgba(140, 111, 79, 0.24);
  box-shadow: 0 18px 38px rgba(63, 42, 20, 0.11);
}

.action-recommendation__meta {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.action-recommendation__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(140, 111, 79, 0.92), rgba(110, 80, 48, 0.92));
  color: #f7efe3;
  font-size: 17px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.action-recommendation__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.action-recommendation__header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.action-recommendation__header strong {
  font-size: 17px;
  line-height: 1.25;
}

.action-recommendation__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 10px;
  background: rgba(140, 111, 79, 0.14);
  color: #8c6f4f;
  font-size: 10px;
  font-weight: 700;
}

.action-recommendation__copy p {
  margin: 0;
  color: rgba(47, 36, 27, 0.76);
  font-size: 14px;
}

.action-recommendation__copy span {
  color: rgba(47, 36, 27, 0.52);
  font-size: 12px;
  line-height: 1.5;
}

.action-recommendation__side {
  display: grid;
  justify-items: end;
  gap: 6px;
  flex-shrink: 0;
}

.action-recommendation__side strong {
  font-size: 22px;
  line-height: 1;
}

.action-recommendation__side small {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
}

.action-recommendation__side :deep(.el-button) {
  min-height: 34px;
  padding-inline: 14px;
  border-radius: 12px;
}

.governance-ledger {
  display: grid;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.76);
}

.governance-ledger__head,
.governance-ledger__row {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(112px, 1.1fr) minmax(108px, 0.9fr) minmax(146px, 1.15fr) minmax(88px, auto);
  gap: 16px;
  align-items: center;
}

.governance-ledger__head {
  min-height: 48px;
  padding: 0 18px;
  background: rgba(248, 243, 235, 0.62);
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.governance-ledger__body {
  display: grid;
}

.governance-ledger__row {
  min-height: 74px;
  padding: 12px 18px;
  border-top: 1px solid rgba(80, 63, 47, 0.06);
}

.governance-ledger__cell {
  min-width: 0;
}

.governance-ledger__cell--main {
  display: grid;
  gap: 4px;
}

.governance-ledger__cell--main strong {
  font-size: 15px;
  line-height: 1.3;
}

.governance-ledger__cell--main span {
  color: rgba(47, 36, 27, 0.52);
  font-size: 12px;
  line-height: 1.5;
}

.governance-ledger__bizline,
.governance-ledger__time {
  color: rgba(47, 36, 27, 0.68);
  font-size: 13px;
  line-height: 1.45;
}

.governance-ledger__cell--status {
  display: flex;
  align-items: center;
}

.governance-ledger__cell--action {
  display: flex;
  justify-content: flex-end;
}

.governance-ledger__empty-row {
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 26px 18px 28px;
  border-top: 1px solid rgba(80, 63, 47, 0.06);
  text-align: center;
}

.governance-ledger__empty-row strong {
  font-size: 16px;
}

.governance-ledger__empty-row span {
  color: rgba(47, 36, 27, 0.52);
  font-size: 13px;
  line-height: 1.55;
}

.campaign-list {
  display: grid;
  gap: 14px;
}

.campaign-item {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 20px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  background: rgba(255, 255, 255, 0.72);
}

.campaign-item__head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
}

.campaign-item__head strong {
  font-size: 16px;
}

.campaign-item__head span {
  display: block;
  margin-top: 4px;
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
}

.campaign-item p {
  margin: 0;
  color: rgba(47, 36, 27, 0.58);
  line-height: 1.7;
}

.campaign-item__foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.campaign-item__foot span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
  letter-spacing: 0.08em;
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

@media (max-width: 1280px) {
  .operate-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .actions-toolbar,
  .action-recommendation,
  .campaign-item__head,
  .campaign-item__foot {
    display: grid;
  }

  .operate-overview {
    grid-template-columns: 1fr;
  }

  .action-recommendation__side {
    justify-items: start;
  }

  .governance-ledger__head {
    display: none;
  }

  .governance-ledger__row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .governance-ledger__cell--action {
    justify-content: start;
  }
}
</style>
