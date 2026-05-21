<template>
  <PageContainer>
    <section class="page-overview dashboard-overview">
      <article
        v-for="item in overviewCards"
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

    <section class="dashboard-grid dashboard-grid--primary">
      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">FUNNEL / CURRENT PIPELINE</p>
            <h3>转化漏斗</h3>
          </div>
          <span class="table-header__hint">使用当前真实主链字段：访问、唯一访客、成卡、联系申请和已同意联系。</span>
        </div>

        <div class="funnel-board">
          <div v-for="item in funnelRows" :key="item.label" class="funnel-board__row">
            <div class="funnel-board__copy">
              <span>{{ item.index }}</span>
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.hint }}</p>
              </div>
            </div>

            <div class="funnel-board__track">
              <span :style="{ width: `${item.ratio}%` }" />
            </div>

            <div class="funnel-board__value">
              <strong>{{ item.valueLabel }}</strong>
              <span>{{ item.ratioLabel }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">TREND / STRUCTURAL HEAT</p>
            <h3>主链热度曲线</h3>
          </div>
          <span class="table-header__hint">当前按现有聚合值展示结构热度，未使用按日时间序列。</span>
        </div>

        <div class="heat-card">
          <div class="heat-card__chart">
            <div class="heat-card__grid">
              <span v-for="line in 4" :key="line" />
            </div>
            <svg viewBox="0 0 520 220" preserveAspectRatio="none" class="heat-card__svg">
              <polygon :points="heatAreaPoints" class="heat-card__area" />
              <polyline :points="heatLinePoints" class="heat-card__line" />
            </svg>
            <div class="heat-card__dots">
              <span
                v-for="point in heatPoints"
                :key="point.label"
                :style="{ left: `${point.left}%`, top: `${point.top}%` }"
              />
            </div>
          </div>

          <div class="heat-card__labels">
            <div v-for="point in heatPoints" :key="`${point.label}-label`" class="heat-card__label">
              <strong>{{ point.label }}</strong>
              <span>{{ point.valueLabel }}</span>
            </div>
          </div>

          <div class="heat-card__insight">
            <strong>当前解读</strong>
            <p>{{ heatInsight }}</p>
          </div>
        </div>
      </el-card>
    </section>

    <section class="dashboard-grid dashboard-grid--secondary">
      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">RETENTION / FACT GAP</p>
            <h3>留存承接</h3>
          </div>
          <span class="table-header__hint">当前展示回访与转化代理指标，不呈现次日、7 日或 cohort 留存。</span>
        </div>

        <div class="retention-panel">
          <div class="retention-panel__canvas">
            <span class="retention-panel__badge">当前聚合</span>
            <div class="retention-panel__placeholder">
              <strong>当前没有真实留存曲线</strong>
              <p>本区展示已接入的回访与转化指标。</p>
            </div>
          </div>

          <div class="retention-panel__metrics">
            <article v-for="item in retentionRows" :key="item.label" class="retention-panel__metric">
              <span>{{ item.label }}</span>
              <strong>{{ item.valueLabel }}</strong>
              <small>{{ item.hint }}</small>
            </article>
          </div>
        </div>

        <div class="fact-gap-note fact-gap-note--compact">
          <strong>说明</strong>
          <p>当前缺少会话复访、时间窗口 cohort 和用户回流事实源，因此只展示可计算的留存代理指标。</p>
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">STYLE / SCENE PREFERENCE</p>
            <h3>风格偏好</h3>
          </div>
          <span class="table-header__hint">使用 classic / urban / costume 三个 scene 聚合字段。</span>
        </div>

        <div class="dashboard-donut-panel">
          <div class="dashboard-donut-panel__chart-slot">
            <div class="donut-panel__chart" :style="{ background: sceneConicGradient }">
              <div class="donut-panel__center">
                <strong>{{ formatMetric(sceneTotal) }}</strong>
                <span>TOTAL</span>
              </div>
            </div>
          </div>

          <div class="dashboard-donut-panel__legend">
            <div v-for="item in sceneLegend" :key="item.label" class="donut-panel__legend-item">
              <i :style="{ background: item.color }" />
              <span>{{ item.label }}</span>
              <strong>{{ item.valueLabel }}</strong>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">CHANNEL / APPROXIMATION</p>
            <h3>渠道分布</h3>
          </div>
          <span class="table-header__hint">当前按 scene 分布展示渠道观察结果，未使用更细来源字段。</span>
        </div>

        <div class="dashboard-donut-panel">
          <div class="dashboard-donut-panel__chart-slot">
            <div class="donut-panel__chart" :style="{ background: channelConicGradient }">
              <div class="donut-panel__center">
                <strong>{{ formatMetric(sceneTotal) }}</strong>
                <span>TOTAL</span>
              </div>
            </div>
          </div>

          <div class="dashboard-donut-panel__legend">
            <div v-for="item in channelRows" :key="item.label" class="donut-panel__legend-item">
              <i :style="{ background: item.color }" />
              <span>{{ item.label }}</span>
              <strong>{{ item.percentLabel }}</strong>
            </div>
          </div>
        </div>

        <div class="fact-gap-note fact-gap-note--compact">
          <strong>边界</strong>
          <p>当前这里展示的是已接入的 scene 分布结果，不呈现更细的渠道归因。</p>
        </div>
      </el-card>
    </section>

    <section class="dashboard-grid dashboard-grid--bottom">
      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">PAGE MATRIX / FORMAL PAGES</p>
            <h3>正式页面矩阵</h3>
          </div>
          <span class="table-header__hint">当前仪表盘按账号权限展示正式主架构入口，覆盖工作台、增长、运营与系统治理入口。</span>
        </div>

        <div class="page-matrix-ledger">
          <div class="page-matrix-ledger__head">
            <span>#</span>
            <span>页面</span>
            <span>指标</span>
            <span>事实</span>
            <span>动作</span>
          </div>

          <article v-for="(item, index) in pageMatrix" :key="item.route" class="page-matrix-ledger__row">
            <span class="page-matrix-ledger__index">{{ String(index + 1).padStart(2, '0') }}</span>

            <div class="page-matrix-ledger__page">
              <p>{{ item.area }}</p>
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </div>

            <div class="page-matrix-ledger__metric">
              <span>{{ item.metricLabel }}</span>
              <strong>{{ item.metric }}</strong>
            </div>

            <span class="page-matrix-ledger__fact">{{ item.fact }}</span>

            <el-button link type="primary" :disabled="!canOpenRoute(item.route)" @click="openDashboardRoute(item.route)">
              进入
            </el-button>
          </article>
        </div>

        <div class="fact-gap-note fact-gap-note--compact">
          <strong>边界</strong>
          <p>当前底部左侧展示账号可进入的正式入口。</p>
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">GOVERNANCE / RECENT SIGNALS</p>
            <h3>治理动态</h3>
          </div>
          <span class="table-header__hint">当前展示后台概览接口返回的待办聚合与治理动态。</span>
        </div>

        <div class="governance-summary governance-summary--compact">
          <article v-for="item in governanceSummary" :key="item.label" class="governance-summary__item">
            <span>{{ item.label }}</span>
            <strong>{{ item.valueLabel }}</strong>
            <small>{{ item.hint }}</small>
          </article>
        </div>

        <div v-if="visibleRecentItems.length" class="activity-feed">
          <article v-for="item in visibleRecentItems" :key="`${item.bizLine}-${item.itemId}`" class="activity-feed__item">
            <div class="activity-feed__dot" :data-tone="getBizTone(item.bizLine)" />
            <div class="activity-feed__content">
              <div class="activity-feed__head">
                <strong>{{ getRecentItemTitle(item) }}</strong>
                <span>{{ formatDateTime(item.occurredAt) }}</span>
              </div>
              <p>{{ getRecentItemSummary(item) }}</p>
              <el-button link type="primary" :disabled="!canOpenRoute(getRecentRoute(item))" @click="openRecentItem(item)">{{ getRecentItemActionLabel(item) }}</el-button>
            </div>
          </article>
        </div>
        <div v-else class="activity-feed-empty">
          <strong>当前没有治理动态</strong>
          <p>当前时间窗口下没有治理动态返回，本页暂时只展示概览摘要与主架构入口。</p>
        </div>
      </el-card>
    </section>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/business/PageContainer.vue'
import { fetchDashboardOverview } from '@/api/dashboard'
import { getAdminRouteActionLabel } from '@/constants/admin-information-architecture'
import { PERMISSIONS } from '@/constants/permission'
import { referralStatusMap, verifyStatusMap } from '@/constants/status'
import { usePermissionStore } from '@/stores/permission'
import { shouldCarryDashboardSource } from '@/utils/dashboard-context'
import { formatDateTime } from '@/utils/format'
import type { DashboardOverview, DashboardOverviewQuery, DashboardRecentItem } from '@/types/dashboard'

type StatusTone = 'info' | 'warning' | 'success' | 'danger'

const route = useRoute()
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

const currentDateFrom = computed(() => readQueryString(route.query.dateFrom))
const currentDateTo = computed(() => readQueryString(route.query.dateTo))
const canReadContactRequests = computed(() => permissionStore.hasPage(PERMISSIONS.page.contentContactRequests))
const canReadVerifyPending = computed(() => permissionStore.hasPage(PERMISSIONS.page.verifyPending))
const canReadReferralRisk = computed(() => permissionStore.hasPage(PERMISSIONS.page.referralRisk))
const canReadRefundOrders = computed(() => permissionStore.hasPage(PERMISSIONS.page.refundOrders))

const totalContactCount = computed(
  () =>
    canReadContactRequests.value
      ? Number(overview.pendingContactRequestCount || 0) + Number(overview.approvedContactRequestCount || 0)
      : 0,
)
const governancePendingTotal = computed(
  () =>
    (canReadVerifyPending.value ? Number(overview.verifyPendingCount || 0) : 0) +
    (canReadReferralRisk.value ? Number(overview.referralRiskPendingCount || 0) : 0) +
    (canReadRefundOrders.value ? Number(overview.refundPendingCount || 0) : 0) +
    (canReadContactRequests.value ? Number(overview.pendingContactRequestCount || 0) : 0),
)
const conversionRate = computed(() => percent(Number(overview.convertedViewerCount || 0), Number(overview.shareViewCount || 0)))
const contactApprovalRate = computed(() => percent(Number(overview.approvedContactRequestCount || 0), totalContactCount.value))

const overviewCards = computed(() => [
  {
    key: 'share-flow',
    eyebrow: 'SHARE FLOW',
    badge: 'VISIT',
    valueLabel: formatMetric(overview.shareViewCount),
    hint: '当前真实分享访问总量，作为仪表盘第一层流量指标。',
  },
  {
    key: 'active-creator',
    eyebrow: 'ACTIVE CREATOR',
    badge: 'CARD',
    valueLabel: formatMetric(overview.activeShareOwnerCount),
    hint: '当前拥有活跃分享卡的用户数量，作为仪表盘活跃用户指标。',
  },
  {
    key: 'view-to-card',
    eyebrow: 'VIEW TO CARD',
    badge: 'CONVERT',
    valueLabel: conversionRate.value,
    hint: '查看后成卡率，由 shareViewCount / convertedViewerCount 推导。',
  },
  {
    key: 'contact-close',
    eyebrow: 'CONTACT CLOSE',
    badge: 'APPROVAL',
    valueLabel: contactApprovalRate.value,
    hint: '联系闭环通过率，只基于待处理 + 已同意联系的现有真实字段计算。',
    pagePermission: PERMISSIONS.page.contentContactRequests,
  },
].filter((item) => !item.pagePermission || permissionStore.hasPage(item.pagePermission)))

const funnelSource = computed(() => [
  {
    label: '分享访问',
    value: Number(overview.shareViewCount || 0),
    hint: '当前 share_card_view_history 聚合总量',
  },
  {
    label: '唯一访客',
    value: Number(overview.uniqueViewerCount || 0),
    hint: '当前真实触达用户数',
  },
  {
    label: '查看后成卡',
    value: Number(overview.convertedViewerCount || 0),
    hint: '查看后完成成卡的用户数',
  },
  {
    label: '联系申请',
    value: totalContactCount.value,
    hint: '待处理 + 已同意联系的总量',
    pagePermission: PERMISSIONS.page.contentContactRequests,
  },
  {
    label: '已同意联系',
    value: Number(overview.approvedContactRequestCount || 0),
    hint: '联系闭环已完成的用户数',
    pagePermission: PERMISSIONS.page.contentContactRequests,
  },
].filter((item) => !item.pagePermission || permissionStore.hasPage(item.pagePermission)))

const funnelMax = computed(() => Math.max(...funnelSource.value.map((item) => item.value), 1))
const funnelRows = computed(() =>
  funnelSource.value.map((item, index) => ({
    ...item,
    index: String(index + 1).padStart(2, '0'),
    ratio: Math.max(item.value > 0 ? 12 : 0, Math.round((item.value / funnelMax.value) * 100)),
    ratioLabel: `${Math.round((item.value / funnelMax.value) * 100)}%`,
    valueLabel: formatMetric(item.value),
  })),
)

const heatSeries = computed(() => [
  { label: '持卡用户', value: Number(overview.activeShareOwnerCount || 0) },
  { label: '分享访问', value: Number(overview.shareViewCount || 0) },
  { label: '查看成卡', value: Number(overview.convertedViewerCount || 0) },
  { label: '已同意联系', value: Number(overview.approvedContactRequestCount || 0) },
  { label: '治理待办', value: governancePendingTotal.value },
])

const heatMax = computed(() => Math.max(...heatSeries.value.map((item) => item.value), 1))
const heatPoints = computed(() => {
  const total = heatSeries.value.length
  return heatSeries.value.map((item, index) => {
    const left = total === 1 ? 50 : 8 + (index / (total - 1)) * 84
    const top = 78 - Math.round((item.value / heatMax.value) * 60)
    return {
      label: item.label,
      valueLabel: formatMetric(item.value),
      left,
      top,
      x: Math.round((left / 100) * 520),
      y: Math.round((top / 100) * 220),
    }
  })
})

const heatLinePoints = computed(() => heatPoints.value.map((item) => `${item.x},${item.y}`).join(' '))
const heatAreaPoints = computed(() => {
  if (!heatPoints.value.length) {
    return ''
  }
  const linePoints = heatPoints.value.map((item) => `${item.x},${item.y}`).join(' ')
  const first = heatPoints.value[0]
  const last = heatPoints.value[heatPoints.value.length - 1]
  return `${first.x},210 ${linePoints} ${last.x},210`
})

const heatInsight = computed(() => {
  const base = `当前持卡用户 ${formatMetric(overview.activeShareOwnerCount)}、访问 ${formatMetric(
    overview.shareViewCount,
  )}、查看后成卡 ${formatMetric(overview.convertedViewerCount)}、已同意联系 ${formatMetric(
    overview.approvedContactRequestCount,
  )}。`
  if (governancePendingTotal.value > 0) {
    return `${base} 当前仍有 ${governancePendingTotal.value} 个治理待办，需要进入对应治理页面处置。`
  }
  return `${base} 当前治理待办为 0，说明主链数据存在但治理队列暂时空闲。`
})

const retentionRows = computed(() => [
  {
    label: '活跃持卡',
    valueLabel: formatMetric(overview.activeShareCardCount),
    hint: '当前最接近持续活跃的代理指标',
  },
  {
    label: '持卡用户',
    valueLabel: formatMetric(overview.activeShareOwnerCount),
    hint: '当前可持续回访的用户底盘',
  },
  {
    label: '唯一访客',
    valueLabel: formatMetric(overview.uniqueViewerCount),
    hint: '当前真实触达规模',
  },
  {
    label: '已同意联系',
    valueLabel: formatMetric(overview.approvedContactRequestCount),
    hint: '当前闭环结果承接',
  },
])

const sceneSource = computed(() => [
  { label: '经典', value: Number(overview.classicSceneViewCount || 0), color: '#221f1c' },
  { label: '都市', value: Number(overview.urbanSceneViewCount || 0), color: '#c76844' },
  { label: '古风', value: Number(overview.costumeSceneViewCount || 0), color: '#8b6b43' },
])

const sceneTotal = computed(() => sceneSource.value.reduce((sum, item) => sum + item.value, 0))
const sceneLegend = computed(() =>
  sceneSource.value.map((item) => ({
    ...item,
    valueLabel: formatMetric(item.value),
  })),
)
const sceneConicGradient = computed(() => buildConicGradient(sceneSource.value))
const channelConicGradient = computed(() =>
  buildConicGradient(channelRows.value.map((item) => ({ value: item.value, color: item.color }))),
)

const channelRows = computed(() => {
  const total = sceneTotal.value || 1
  return sceneSource.value.map((item) => ({
    label: item.label,
    note: '当前按 scene 分布展示',
    value: item.value,
    valueLabel: formatMetric(item.value),
    percent: total ? Number(((item.value / total) * 100).toFixed(1)) : 0,
    percentLabel: total ? `${((item.value / total) * 100).toFixed(1)}%` : '0.0%',
    color: item.color,
  }))
})

const settingsPagePermissions = [
  PERMISSIONS.page.verifyPending,
  PERMISSIONS.page.contentContactRequests,
  PERMISSIONS.page.contentTemplates,
  PERMISSIONS.page.contentShareCards,
  PERMISSIONS.page.systemAdminUsers,
  PERMISSIONS.page.systemRoles,
  PERMISSIONS.page.systemOperationLogs,
  PERMISSIONS.page.systemAiResumeGovernance,
]

const routePermissionMap: Record<string, string | string[]> = {
  '/dashboard/index': PERMISSIONS.page.dashboardIndex,
  '/dashboard/analytics': PERMISSIONS.page.dashboardIndex,
  '/users/index': PERMISSIONS.page.usersIndex,
  '/content/share-cards': PERMISSIONS.page.contentShareCards,
  '/content/templates': PERMISSIONS.page.contentTemplates,
  '/operate/actions': PERMISSIONS.page.dashboardIndex,
  '/system/settings': settingsPagePermissions,
  '/verify/pending': PERMISSIONS.page.verifyPending,
  '/referral/risk': PERMISSIONS.page.referralRisk,
  '/refund/orders': PERMISSIONS.page.refundOrders,
  '/payment/orders': PERMISSIONS.page.paymentOrders,
}

const pageMatrix = computed(() => [
  {
    area: 'OVERVIEW',
    title: '仪表盘',
    description: '当前后台正式主入口，承接 KPI、漏斗、风格与渠道卡位。',
    fact: '真实 overview 聚合',
    metric: formatMetric(overview.shareViewCount),
    metricLabel: '分享访问',
    route: '/dashboard/index',
    requiredPagePermission: PERMISSIONS.page.dashboardIndex,
  },
  {
    area: 'OVERVIEW',
    title: '数据分析',
    description: '分渠道、留存、漏斗和分群页已经独立成正式页面。',
    fact: 'scene 聚合结果',
    metric: formatMetric(overview.uniqueViewerCount),
    metricLabel: '唯一访客',
    route: '/dashboard/analytics',
    requiredPagePermission: PERMISSIONS.page.dashboardIndex,
  },
  {
    area: 'GROWTH',
    title: '用户管理',
    description: '真实业务用户中心，使用 `/admin/users` 列表与详情事实源。',
    fact: '真实 /admin/users',
    metric: formatMetric(overview.activeShareOwnerCount),
    metricLabel: '持卡用户',
    route: '/users/index',
    requiredPagePermission: PERMISSIONS.page.usersIndex,
  },
  {
    area: 'GROWTH',
    title: '分享内容',
    description: '主表达为内容卡片墙，治理字段下沉为辅助能力。',
    fact: '真实 share-cards',
    metric: formatMetric(overview.activeShareCardCount),
    metricLabel: '活跃卡片',
    route: '/content/share-cards',
    requiredPagePermission: PERMISSIONS.page.contentShareCards,
  },
  {
    area: 'OPERATE',
    title: '风格模板',
    description: '模板库已从治理台账回收为正式模板库页。',
    fact: '真实 templates',
    metric: formatMetric(sceneTotal.value),
    metricLabel: '场景访问',
    route: '/content/templates',
    requiredPagePermission: PERMISSIONS.page.contentTemplates,
  },
  {
    area: 'OPERATE',
    title: '运营动作',
    description: '组合现有统计与治理入口。',
    fact: '真实聚合容器页',
    metric: formatMetric(governancePendingTotal.value),
    metricLabel: '待动作',
    route: '/operate/actions',
    requiredPagePermission: PERMISSIONS.page.dashboardIndex,
  },
  {
    area: 'OPERATE',
    title: '系统设置',
    description: '当前聚合系统管理、内容治理和审计入口。',
    fact: '真实聚合页',
    metric: visibleRecentItems.value.length ? formatMetric(visibleRecentItems.value.length) : '已接通',
    metricLabel: '当前状态',
    route: '/system/settings',
    requiredPagePermissions: settingsPagePermissions,
  },
].filter(canReadPageMatrixItem))

const governanceSummary = computed(() => [
  {
    label: '实名认证待审',
    valueLabel: formatMetric(overview.verifyPendingCount),
    hint: '实名认证审核页承接',
    pagePermission: PERMISSIONS.page.verifyPending,
  },
  {
    label: '异常邀请',
    valueLabel: formatMetric(overview.referralRiskPendingCount),
    hint: '邀请治理待复核',
    pagePermission: PERMISSIONS.page.referralRisk,
  },
  {
    label: '退款待审',
    valueLabel: formatMetric(overview.refundPendingCount),
    hint: '退款治理待处理',
    pagePermission: PERMISSIONS.page.refundOrders,
  },
  {
    label: '联系待处理',
    valueLabel: formatMetric(overview.pendingContactRequestCount),
    hint: '联系闭环待审批',
    pagePermission: PERMISSIONS.page.contentContactRequests,
  },
].filter((item) => permissionStore.hasPage(item.pagePermission)))

const visibleRecentItems = computed(() => overview.recentItems.filter((item) => canOpenRoute(getRecentRoute(item))))

const dashboardBizLineLabelMap: Record<string, string> = {
  verify: '实名认证治理',
  referral: '邀请治理',
  refund: '退款治理',
  payment: '支付治理',
}

function formatMetric(value?: number | null) {
  return value == null ? '--' : String(value)
}

function canReadPageMatrixItem(item: { requiredPagePermission?: string; requiredPagePermissions?: string[] }) {
  if (item.requiredPagePermissions?.length) {
    return item.requiredPagePermissions.some((permission) => permissionStore.hasPage(permission))
  }
  return permissionStore.hasPage(item.requiredPagePermission)
}

function percent(numerator: number, denominator: number) {
  if (!denominator) {
    return '0.0%'
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function buildConicGradient(source: Array<{ value: number; color: string }>) {
  const total = source.reduce((sum, item) => sum + item.value, 0) || 1
  let start = 0
  const stops = source.map((item) => {
    const share = (item.value / total) * 100
    const stop = `${item.color} ${start}% ${start + share}%`
    start += share
    return stop
  })
  return `conic-gradient(${stops.join(', ')})`
}

function getBizTone(bizLine?: string) {
  switch (bizLine) {
    case 'verify':
      return 'warning'
    case 'referral':
      return 'danger'
    case 'refund':
      return 'warning'
    case 'payment':
      return 'success'
    default:
      return 'info'
  }
}

function getRecentStatus(item: DashboardRecentItem) {
  if (item.bizLine === 'verify') {
    return verifyStatusMap[item.status || 0] || verifyStatusMap[0]
  }
  if (item.bizLine === 'referral') {
    return referralStatusMap[item.status || 0] || referralStatusMap[0]
  }
  if (item.bizLine === 'refund') {
    return {
      label: item.status === 0 ? '待审核' : `状态 ${item.status ?? '--'}`,
      tone: (item.status === 0 ? 'warning' : 'info') as StatusTone,
    }
  }
  if (item.bizLine === 'payment') {
    return {
      label: item.status === 1 ? '已支付' : `状态 ${item.status ?? '--'}`,
      tone: (item.status === 1 ? 'success' : 'info') as StatusTone,
    }
  }
  return { label: `状态 ${item.status ?? '--'}`, tone: 'info' as StatusTone }
}

function getRecentItemTitle(item: DashboardRecentItem) {
  if (item.itemType === 'payment_order') {
    return '支付治理事项'
  }
  return `${dashboardBizLineLabelMap[item.bizLine] || item.bizLine} · ${item.title}`
}

function getRecentItemSummary(item: DashboardRecentItem) {
  const status = getRecentStatus(item)
  const reference = item.referenceNo ? ` · ${item.referenceNo}` : ''
  const user = item.userId != null ? ` · 用户 ${item.userId}` : ''
  return `${dashboardBizLineLabelMap[item.bizLine] || item.bizLine} · ${status.label}${reference}${user}`
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
  if (Array.isArray(permission)) {
    return permission.some((item) => permissionStore.hasPage(item))
  }
  return !permission || permissionStore.hasPage(permission)
}

function buildRouteQuery(path: string, item?: DashboardRecentItem) {
  const query: Record<string, string | number> = {}
  const dateFrom = currentDateFrom.value
  const dateTo = currentDateTo.value

  if (dateFrom && dateTo) {
    if (path === '/referral/risk') {
      query.registeredAtFrom = dateFrom
      query.registeredAtTo = dateTo
    }
    if (path === '/verify/pending') {
      query.submitTimeFrom = dateFrom
      query.submitTimeTo = dateTo
    }
    if (path === '/refund/orders' || path === '/payment/orders') {
      query.createdAtFrom = dateFrom
      query.createdAtTo = dateTo
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
  if (item) {
    query.source = 'dashboard_recent_item'
  } else if (shouldCarryDashboardSource(path)) {
    query.source = 'dashboard_scope'
  }

  return Object.keys(query).length ? query : undefined
}

function openDashboardRoute(path: string, item?: DashboardRecentItem) {
  if (!canOpenRoute(path)) {
    ElMessage.warning('当前账号没有目标页面权限')
    return
  }
  router.push({
    path,
    query: buildRouteQuery(path, item),
  })
}

function openRecentItem(item: DashboardRecentItem) {
  openDashboardRoute(getRecentRoute(item), item)
}

function getRecentItemActionLabel(item: DashboardRecentItem) {
  return getAdminRouteActionLabel(getRecentRoute(item))
}

function readQueryString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0] ? value[0] : undefined
  }
  return typeof value === 'string' && value ? value : undefined
}

function buildOverviewQuery(): DashboardOverviewQuery {
  return {
    dateFrom: currentDateFrom.value,
    dateTo: currentDateTo.value,
  }
}

async function loadOverview() {
  loading.value = true
  try {
    const data = await fetchDashboardOverview(buildOverviewQuery())
    overview.verifyPendingCount = data.verifyPendingCount
    overview.referralRiskPendingCount = data.referralRiskPendingCount
    overview.refundPendingCount = data.refundPendingCount
    overview.todayPaymentOrderCount = data.todayPaymentOrderCount
    overview.activeShareCardCount = data.activeShareCardCount
    overview.activeShareOwnerCount = data.activeShareOwnerCount
    overview.shareViewCount = data.shareViewCount
    overview.uniqueViewerCount = data.uniqueViewerCount
    overview.approvedContactRequestCount = data.approvedContactRequestCount
    overview.pendingContactRequestCount = data.pendingContactRequestCount
    overview.convertedViewerCount = data.convertedViewerCount
    overview.classicSceneViewCount = data.classicSceneViewCount
    overview.urbanSceneViewCount = data.urbanSceneViewCount
    overview.costumeSceneViewCount = data.costumeSceneViewCount
    overview.recentItems = data.recentItems || []
  } finally {
    loading.value = false
  }
}

watch([currentDateFrom, currentDateTo], loadOverview, { immediate: true })
</script>

<style scoped lang="scss">
.dashboard-overview.dashboard-overview.dashboard-overview {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-overview.dashboard-overview .page-overview-card.page-overview-card {
  gap: 8px;
  min-height: 140px;
  padding: 16px 18px 14px;
}

.dashboard-overview.dashboard-overview .page-overview-card.page-overview-card small {
  font-size: 12px;
  line-height: 1.55;
}

.dashboard-grid {
  display: grid;
  gap: 14px;
}

.dashboard-grid--primary {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.dashboard-grid--primary :deep(.el-card__body) {
  padding: 22px;
}

.dashboard-grid--primary .table-header {
  gap: 12px;
  margin-bottom: 14px;
}

.dashboard-grid--primary .table-header > div {
  min-width: 148px;
}

.dashboard-grid--primary .table-header h3 {
  line-height: 1.08;
}

.dashboard-grid--primary .table-header__hint {
  max-width: 250px;
  line-height: 1.55;
}

.dashboard-grid--secondary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dashboard-grid--bottom {
  grid-template-columns: 1.04fr 0.96fr;
}

.funnel-board {
  display: grid;
  gap: 12px;
}

.funnel-board__row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.funnel-board__copy {
  display: flex;
  align-items: center;
  gap: 12px;
}

.funnel-board__copy > span {
  color: rgba(47, 36, 27, 0.34);
  font-size: 12px;
  font-weight: 700;
}

.funnel-board__copy strong {
  display: block;
  font-size: 14px;
}

.funnel-board__copy p {
  margin: 4px 0 0;
  color: rgba(47, 36, 27, 0.5);
  font-size: 12px;
  line-height: 1.5;
}

.funnel-board__track {
  height: 8px;
  border-radius: 999px;
  background: rgba(34, 31, 28, 0.08);
  overflow: hidden;
}

.funnel-board__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #221f1c, #a67a4e);
}

.funnel-board__value {
  display: grid;
  justify-items: end;
}

.funnel-board__value strong {
  font-size: 16px;
}

.funnel-board__value span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
}

.heat-card {
  display: grid;
  gap: 14px;
}

.heat-card__chart {
  position: relative;
  height: 220px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(34, 31, 28, 0.04), rgba(34, 31, 28, 0.01));
  overflow: hidden;
}

.heat-card__grid {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: space-between;
  padding: 18px 0;
}

.heat-card__grid span {
  border-top: 1px dashed rgba(34, 31, 28, 0.1);
}

.heat-card__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.heat-card__area {
  fill: rgba(166, 122, 78, 0.16);
}

.heat-card__line {
  fill: none;
  stroke: #221f1c;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.heat-card__dots span {
  position: absolute;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  margin-top: -5px;
  border-radius: 999px;
  background: #221f1c;
  box-shadow: 0 0 0 5px rgba(34, 31, 28, 0.08);
}

.heat-card__labels {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.heat-card__label {
  display: grid;
  gap: 4px;
}

.heat-card__label strong {
  font-size: 12px;
}

.heat-card__label span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
}

.heat-card__insight,
.fact-gap-note {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(247, 239, 230, 0.74);
}

.heat-card__insight strong,
.fact-gap-note strong {
  font-size: 13px;
}

.heat-card__insight p,
.fact-gap-note p {
  margin: 0;
  color: rgba(47, 36, 27, 0.58);
  font-size: 13px;
  line-height: 1.65;
}

.retention-panel {
  display: grid;
  gap: 14px;
}

.retention-panel__canvas {
  position: relative;
  min-height: 170px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(34, 31, 28, 0.03), rgba(34, 31, 28, 0.01)),
    rgba(249, 244, 237, 0.78);
  overflow: hidden;
}

.retention-panel__canvas::after {
  content: '';
  position: absolute;
  inset: auto 18px 16px;
  height: 1px;
  background: rgba(34, 31, 28, 0.08);
}

.retention-panel__badge {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(190, 171, 138, 0.2);
  color: #7b6548;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.retention-panel__placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.retention-panel__placeholder strong {
  font-size: 16px;
}

.retention-panel__placeholder p {
  margin: 0;
  max-width: 250px;
  color: rgba(47, 36, 27, 0.56);
  font-size: 13px;
  line-height: 1.7;
}

.retention-panel__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.retention-panel__metric {
  display: grid;
  gap: 6px;
  min-height: 92px;
  padding: 14px;
  border: 1px solid rgba(34, 31, 28, 0.06);
  border-radius: 18px;
  background: rgba(246, 241, 233, 0.56);
}

.retention-panel__metric span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.retention-panel__metric strong {
  font-size: 28px;
  line-height: 1;
}

.retention-panel__metric small {
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.55;
}

.dashboard-donut-panel {
  display: grid;
  grid-template-columns: minmax(156px, 192px) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.dashboard-donut-panel__chart-slot {
  display: grid;
  justify-items: center;
}

.dashboard-donut-panel__legend {
  width: 100%;
  display: grid;
  gap: 12px;
}

.donut-panel__chart {
  position: relative;
  width: 178px;
  height: 178px;
  border-radius: 50%;
}

.donut-panel__chart::after {
  content: '';
  position: absolute;
  inset: 26px;
  border-radius: inherit;
  background: #fbf7f2;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.donut-panel__center {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-content: center;
  text-align: center;
}

.donut-panel__center strong {
  font-size: 28px;
  line-height: 1;
}

.donut-panel__center span {
  margin-top: 6px;
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.donut-panel__legend-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.donut-panel__legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.donut-panel__legend-item span {
  color: rgba(47, 36, 27, 0.6);
  font-size: 12px;
}

.donut-panel__legend-item strong {
  font-size: 12px;
}

.dashboard-grid--secondary .table-header {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.dashboard-grid--secondary .table-header__hint {
  max-width: none;
  text-align: left;
  font-size: 12px;
  line-height: 1.55;
}

.dashboard-grid--secondary .table-header h3 {
  font-size: 20px;
  line-height: 1.12;
}

.fact-gap-note--compact {
  margin-top: 14px;
  padding: 12px 14px;
}

.page-matrix-ledger {
  display: grid;
  gap: 8px;
}

.page-matrix-ledger__head,
.page-matrix-ledger__row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1.5fr) minmax(120px, 0.64fr) minmax(120px, 0.72fr) auto;
  gap: 14px;
  align-items: center;
}

.page-matrix-ledger__head {
  padding: 0 6px 10px;
  color: rgba(47, 36, 27, 0.44);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-matrix-ledger__row {
  padding: 14px 16px;
  border: 1px solid rgba(34, 31, 28, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
}

.page-matrix-ledger__index {
  color: #a47d51;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.page-matrix-ledger__page {
  display: grid;
  gap: 4px;
}

.page-matrix-ledger__page p {
  margin: 0;
  color: rgba(47, 36, 27, 0.42);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.page-matrix-ledger__page strong {
  font-size: 18px;
}

.page-matrix-ledger__page small {
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.6;
}

.page-matrix-ledger__metric {
  display: grid;
  gap: 4px;
}

.page-matrix-ledger__metric span {
  color: rgba(47, 36, 27, 0.44);
  font-size: 11px;
}

.page-matrix-ledger__metric strong {
  font-size: 20px;
  line-height: 1;
}

.page-matrix-ledger__fact {
  color: rgba(47, 36, 27, 0.5);
  font-size: 12px;
  line-height: 1.55;
}

.governance-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.governance-summary--compact {
  gap: 10px;
  margin-bottom: 14px;
}

.governance-summary__item {
  display: grid;
  gap: 8px;
  min-height: 88px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(247, 239, 230, 0.72);
}

.governance-summary__item span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.governance-summary__item strong {
  font-size: 28px;
  line-height: 1;
}

.governance-summary__item small {
  color: rgba(47, 36, 27, 0.58);
  line-height: 1.6;
}

.activity-feed {
  display: grid;
  gap: 14px;
}

.activity-feed__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
}

.activity-feed__dot {
  width: 10px;
  height: 10px;
  margin-top: 8px;
  border-radius: 999px;
  background: #8f2d18;
  box-shadow: 0 0 0 5px rgba(143, 45, 24, 0.08);
}

.activity-feed__dot[data-tone='success'] {
  background: #2f7d57;
  box-shadow: 0 0 0 5px rgba(47, 125, 87, 0.08);
}

.activity-feed__dot[data-tone='warning'] {
  background: #c47a28;
  box-shadow: 0 0 0 5px rgba(196, 122, 40, 0.08);
}

.activity-feed__dot[data-tone='danger'] {
  background: #b54131;
  box-shadow: 0 0 0 5px rgba(181, 65, 49, 0.08);
}

.activity-feed__content {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(34, 31, 28, 0.06);
}

.activity-feed__item:last-child .activity-feed__content {
  border-bottom: none;
  padding-bottom: 0;
}

.activity-feed__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.activity-feed__head strong {
  font-size: 14px;
}

.activity-feed__head span {
  color: rgba(47, 36, 27, 0.44);
  font-size: 12px;
  white-space: nowrap;
}

.activity-feed__content p {
  margin: 6px 0 0;
  color: rgba(47, 36, 27, 0.54);
  font-size: 13px;
  line-height: 1.75;
}

.table-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 44px 16px 8px;
  text-align: center;
}

.table-empty strong {
  font-size: 16px;
}

.table-empty p {
  margin: 0;
  max-width: 420px;
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.7;
}

.activity-feed-empty {
  display: grid;
  gap: 8px;
  padding: 22px 18px;
  border-radius: 18px;
  background: rgba(247, 239, 230, 0.58);
  text-align: left;
}

.activity-feed-empty strong {
  font-size: 16px;
}

.activity-feed-empty p {
  margin: 0;
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.65;
}

@media (max-width: 1280px) {
  .dashboard-overview.dashboard-overview.dashboard-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid--primary,
  .dashboard-grid--bottom,
  .dashboard-grid--secondary {
    grid-template-columns: 1fr;
  }

  .retention-panel__metrics,
  .dashboard-donut-panel {
    grid-template-columns: 1fr;
  }

  .page-matrix-ledger__head,
  .page-matrix-ledger__row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .page-matrix-ledger__head span:nth-child(n + 3) {
    display: none;
  }

  .page-matrix-ledger__metric,
  .page-matrix-ledger__fact,
  .page-matrix-ledger__row :deep(.el-button) {
    grid-column: 2;
  }
}

@media (max-width: 900px) {
  .overview-toolbar,
  .channel-board__copy,
  .channel-board__value,
  .activity-feed__head {
    display: grid;
  }

  .heat-card__labels,
  .governance-summary {
    grid-template-columns: 1fr;
  }

  .funnel-board__row {
    grid-template-columns: 1fr;
  }
}
</style>
