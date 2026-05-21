<template>
  <PageContainer>
    <el-card class="table-card analytics-toolbar-card" shadow="never">
      <div class="analytics-toolbar">
        <div class="analytics-tabs" role="tablist" aria-label="数据分析视图">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="analytics-tab"
            :data-active="activeTab === tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </el-card>

    <section v-if="activeTab === 'channel'" class="analytics-grid analytics-grid--primary">
      <el-card class="table-card analytics-card analytics-card--breakdown" shadow="never">
        <div class="table-header analytics-card__header">
          <div>
            <p class="table-header__eyebrow">CHANNEL BREAKDOWN / SCENE AGGREGATION</p>
            <h3>分渠道分享表现</h3>
          </div>
          <span class="table-header__hint">当前按 scene 聚合展示分享访问与成卡表现，不使用更细渠道字段。</span>
        </div>

        <div class="analytics-ledger">
          <div class="analytics-ledger__head">
            <span>当前路径</span>
            <span>分享访问</span>
            <span>查看后成卡</span>
            <span>成卡占比</span>
          </div>

          <article v-for="row in channelRows" :key="row.label" class="analytics-ledger__row">
            <div class="analytics-ledger__cell analytics-ledger__cell--main">
              <i :style="{ background: row.color }" />
              <div>
                <strong>{{ row.label }}</strong>
                <span>{{ row.note }}</span>
              </div>
            </div>

            <div class="analytics-ledger__cell analytics-ledger__cell--metric">
              <strong>{{ row.shareCount }}</strong>
              <span>{{ row.shareRatioLabel }}</span>
            </div>

            <div class="analytics-ledger__cell analytics-ledger__cell--metric">
              <strong>{{ row.convertCount }}</strong>
              <span>查看后成卡</span>
            </div>

            <div class="analytics-ledger__cell analytics-ledger__cell--progress">
              <div class="analytics-progress">
                <span :style="{ width: row.convertRatioValue }" />
              </div>
              <strong>{{ row.convertRatioLabel }}</strong>
            </div>
          </article>
        </div>
      </el-card>

      <el-card class="table-card analytics-card analytics-card--mix" shadow="never">
        <div class="table-header analytics-card__header">
          <div>
            <p class="table-header__eyebrow">CHANNEL MIX / 可见结构</p>
            <h3>流量构成</h3>
          </div>
          <span class="table-header__hint">总访问量使用 overview 聚合字段。</span>
        </div>

        <div class="analytics-donut analytics-donut--compact">
          <div class="analytics-donut__chart" :style="{ background: sceneConicGradient }">
            <div class="analytics-donut__center">
              <strong>{{ formatMetric(overview.shareViewCount) }}</strong>
              <span>TOTAL</span>
            </div>
          </div>

          <div class="analytics-donut__legend analytics-donut__legend--compact">
            <div v-for="item in sceneLegend" :key="item.label" class="analytics-donut__legend-item">
              <i :style="{ background: item.color }" />
              <span>{{ item.label }}</span>
              <strong>{{ item.valueLabel }}</strong>
            </div>
          </div>
        </div>

        <div class="analytics-insight analytics-insight--compact">
          <strong>洞察</strong>
          <p>{{ channelInsight }}</p>
        </div>
      </el-card>
    </section>

    <section v-else-if="activeTab === 'retention'" class="analytics-grid analytics-grid--retention">
      <el-card class="table-card analytics-card analytics-card--retention" shadow="never">
        <div class="table-header analytics-card__header">
          <div>
            <p class="table-header__eyebrow">RETENTION COHORT / FACT PROXY</p>
            <h3>当前窗口留存代理矩阵</h3>
          </div>
          <span class="table-header__hint">当前基于 overview 聚合字段展示回访与转化矩阵，不呈现 cohort 留存事实。</span>
        </div>

        <div class="retention-matrix">
          <div class="retention-matrix__head">
            <span>代理指标</span>
            <span>当前值</span>
            <span>对持卡用户</span>
            <span>对分享访问</span>
          </div>

          <article v-for="item in retentionMatrixRows" :key="item.label" class="retention-matrix__row">
            <div class="retention-matrix__cell retention-matrix__cell--main">
              <strong>{{ item.label }}</strong>
              <span>{{ item.hint }}</span>
            </div>

            <div class="retention-matrix__cell retention-matrix__cell--value">
              <strong>{{ item.valueLabel }}</strong>
              <span>{{ item.valueNote }}</span>
            </div>

            <div class="retention-matrix__cell retention-matrix__cell--heat">
              <div class="retention-matrix__heat" :style="{ '--matrix-alpha': String(item.ownerIntensity) }">
                <strong>{{ item.ownerRatioLabel }}</strong>
              </div>
            </div>

            <div class="retention-matrix__cell retention-matrix__cell--heat">
              <div class="retention-matrix__heat" :style="{ '--matrix-alpha': String(item.viewIntensity) }">
                <strong>{{ item.viewRatioLabel }}</strong>
              </div>
            </div>
          </article>
        </div>

        <div class="retention-governance">
          <div class="retention-governance__signals">
            <span>退款待处理 {{ formatMetric(overview.refundPendingCount) }}</span>
            <span>联系方式待处理 {{ formatMetric(overview.pendingContactRequestCount) }}</span>
            <span>实名认证待审 {{ formatMetric(overview.verifyPendingCount) }}</span>
          </div>
          <p>
            当前治理信号作为旁路说明展示；本页展示会话复访、时间窗口和用户回流之外的已接入事实源。
          </p>
        </div>
      </el-card>
    </section>

    <section v-else-if="activeTab === 'funnel'" class="analytics-grid analytics-grid--funnel">
      <el-card class="table-card analytics-card analytics-card--funnel" shadow="never">
        <div class="table-header analytics-card__header">
          <div>
            <p class="table-header__eyebrow">FUNNEL / CURRENT PIPELINE</p>
            <h3>当前主链转化漏斗</h3>
          </div>
          <span class="table-header__hint">当前只使用 overview 的真实主链字段展示漏斗，保持和现有事实源一致。</span>
        </div>

        <div class="funnel-board funnel-board--wide">
          <div v-for="step in funnelRows" :key="step.label" class="funnel-board__row funnel-board__row--wide">
            <div class="funnel-board__copy">
              <span>{{ step.index }}</span>
              <div>
                <strong>{{ step.label }}</strong>
                <p>{{ step.hint }}</p>
              </div>
            </div>
            <div class="funnel-board__track">
              <span :style="{ width: `${step.ratio}%` }" />
            </div>
            <div class="funnel-board__value">
              <strong>{{ step.value }}</strong>
              <span>{{ step.ratioLabel }}</span>
            </div>
          </div>
        </div>

        <div class="funnel-summary">
          <div class="analytics-kpi">
            <span>查看后成卡率</span>
            <strong>{{ conversionRate }}</strong>
          </div>
          <div class="analytics-kpi">
            <span>联系方式通过率</span>
            <strong>{{ contactApprovalRate }}</strong>
          </div>
          <p class="funnel-summary__copy">{{ funnelInsight }}</p>
        </div>
      </el-card>
    </section>

    <section v-else class="analytics-grid analytics-grid--segment">
      <el-card class="table-card analytics-card analytics-card--segment" shadow="never">
        <div class="table-header analytics-card__header">
          <div>
            <p class="table-header__eyebrow">SEGMENT / CURRENT GROUPING</p>
            <h3>当前主链分群</h3>
          </div>
          <span class="table-header__hint">当前按后台概览聚合结果展示分群观察视角。</span>
        </div>

        <div class="segment-grid segment-grid--wide">
          <article v-for="item in segmentRows" :key="item.label" class="segment-card">
            <span class="segment-card__tag">{{ item.badge }}</span>
            <strong>{{ item.label }}</strong>
            <small>{{ item.hint }}</small>
            <div class="segment-card__metric">
              <em>{{ item.value }}</em>
              <span>位用户</span>
            </div>
            <button type="button" class="segment-card__action">查看分群 →</button>
          </article>
        </div>

        <div class="segment-note">
          <strong>分群口径</strong>
          <p>当前页面把活跃持卡、唯一访客、查看后成卡、联系完成、待跟进和支付治理作为主链分群。</p>
        </div>
      </el-card>
    </section>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchDashboardOverview } from '@/api/dashboard'
import PageContainer from '@/components/business/PageContainer.vue'
import type { DashboardOverview, DashboardOverviewQuery } from '@/types/dashboard'

type AnalyticsTab = 'channel' | 'retention' | 'funnel' | 'segment'

const route = useRoute()
const loading = ref(false)
const activeTab = ref<AnalyticsTab>('channel')
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

const tabs: Array<{ key: AnalyticsTab; label: string }> = [
  { key: 'channel', label: '渠道分析' },
  { key: 'retention', label: '留存分析' },
  { key: 'funnel', label: '转化漏斗' },
  { key: 'segment', label: '用户分群' },
]
const currentDateFrom = computed(() => readQueryString(route.query.dateFrom))
const currentDateTo = computed(() => readQueryString(route.query.dateTo))

const totalContactCount = computed(() => Number(overview.pendingContactRequestCount || 0) + Number(overview.approvedContactRequestCount || 0))
const conversionRate = computed(() => percent(Number(overview.convertedViewerCount || 0), Number(overview.shareViewCount || 0)))
const contactApprovalRate = computed(() => percent(Number(overview.approvedContactRequestCount || 0), totalContactCount.value))

const sceneSource = computed(() => [
  { label: '经典场景', value: Number(overview.classicSceneViewCount || 0), color: '#23262d', note: '`scene=classic` 聚合' },
  { label: '都市场景', value: Number(overview.urbanSceneViewCount || 0), color: '#8b6b43', note: '`scene=urban` 聚合' },
  { label: '古风场景', value: Number(overview.costumeSceneViewCount || 0), color: '#c76844', note: '`scene=costume` 聚合' },
])

const sceneTotal = computed(() => Math.max(sceneSource.value.reduce((sum, item) => sum + item.value, 0), 1))
const sceneLegend = computed(() =>
  sceneSource.value.map((item) => ({
    ...item,
    valueLabel: `${item.value} · ${percent(item.value, sceneTotal.value)}`,
  })),
)
const sceneConicGradient = computed(() => buildConicGradient(sceneSource.value))

const channelRows = computed(() =>
  sceneSource.value.map((item) => ({
    label: item.label,
    color: item.color,
    shareCount: item.value,
    shareRatioLabel: percent(item.value, sceneTotal.value),
    convertCount: Math.round(Number(overview.convertedViewerCount || 0) * (item.value / sceneTotal.value)),
    convertRatioValue: percent(Math.round(Number(overview.convertedViewerCount || 0) * (item.value / sceneTotal.value)), Number(overview.convertedViewerCount || 0)),
    convertRatioLabel: percent(Math.round(Number(overview.convertedViewerCount || 0) * (item.value / sceneTotal.value)), Number(overview.convertedViewerCount || 0)),
    note: item.note,
  })),
)

const retentionOwnerBase = computed(() => Math.max(Number(overview.activeShareOwnerCount || 0), 1))
const retentionViewBase = computed(() => Math.max(Number(overview.shareViewCount || 0), 1))
const retentionMatrixRows = computed(() => [
  {
    label: '活跃分享卡',
    value: Number(overview.activeShareCardCount || 0),
    valueLabel: formatMetric(overview.activeShareCardCount),
    valueNote: '当前活跃卡片实例',
    ownerRatioLabel: percent(Number(overview.activeShareCardCount || 0), retentionOwnerBase.value),
    viewRatioLabel: percent(Number(overview.activeShareCardCount || 0), retentionViewBase.value),
    ownerIntensity: normalizeHeat(Number(overview.activeShareCardCount || 0), retentionOwnerBase.value),
    viewIntensity: normalizeHeat(Number(overview.activeShareCardCount || 0), retentionViewBase.value),
    hint: '当前窗口仍有供给的卡片实例，可作为 retention 供给代理。',
  },
  {
    label: '持卡用户',
    value: Number(overview.activeShareOwnerCount || 0),
    valueLabel: formatMetric(overview.activeShareOwnerCount),
    valueNote: '当前仍持有活跃卡的用户',
    ownerRatioLabel: percent(Number(overview.activeShareOwnerCount || 0), retentionOwnerBase.value),
    viewRatioLabel: percent(Number(overview.activeShareOwnerCount || 0), retentionViewBase.value),
    ownerIntensity: normalizeHeat(Number(overview.activeShareOwnerCount || 0), retentionOwnerBase.value),
    viewIntensity: normalizeHeat(Number(overview.activeShareOwnerCount || 0), retentionViewBase.value),
    hint: '当前仍留在活跃供给池里的用户规模。',
  },
  {
    label: '分享访问',
    value: Number(overview.shareViewCount || 0),
    valueLabel: formatMetric(overview.shareViewCount),
    valueNote: '当前窗口分享访问总量',
    ownerRatioLabel: percent(Number(overview.shareViewCount || 0), retentionOwnerBase.value),
    viewRatioLabel: percent(Number(overview.shareViewCount || 0), retentionViewBase.value),
    ownerIntensity: normalizeHeat(Number(overview.shareViewCount || 0), retentionOwnerBase.value),
    viewIntensity: normalizeHeat(Number(overview.shareViewCount || 0), retentionViewBase.value),
    hint: '这是 retention 代理矩阵里的触达总量基线。',
  },
  {
    label: '唯一访客',
    value: Number(overview.uniqueViewerCount || 0),
    valueLabel: formatMetric(overview.uniqueViewerCount),
    valueNote: '当前窗口独立触达用户',
    ownerRatioLabel: percent(Number(overview.uniqueViewerCount || 0), retentionOwnerBase.value),
    viewRatioLabel: percent(Number(overview.uniqueViewerCount || 0), retentionViewBase.value),
    ownerIntensity: normalizeHeat(Number(overview.uniqueViewerCount || 0), retentionOwnerBase.value),
    viewIntensity: normalizeHeat(Number(overview.uniqueViewerCount || 0), retentionViewBase.value),
    hint: '当前真实可见的独立触达用户，可作为回流代理观察值。',
  },
  {
    label: '查看后成卡',
    value: Number(overview.convertedViewerCount || 0),
    valueLabel: formatMetric(overview.convertedViewerCount),
    valueNote: '查看后已进入成卡链路',
    ownerRatioLabel: percent(Number(overview.convertedViewerCount || 0), retentionOwnerBase.value),
    viewRatioLabel: percent(Number(overview.convertedViewerCount || 0), retentionViewBase.value),
    ownerIntensity: normalizeHeat(Number(overview.convertedViewerCount || 0), retentionOwnerBase.value),
    viewIntensity: normalizeHeat(Number(overview.convertedViewerCount || 0), retentionViewBase.value),
    hint: '当前窗口内已进入成卡链路的高意向留存代理。',
  },
  {
    label: '已同意联系',
    value: Number(overview.approvedContactRequestCount || 0),
    valueLabel: formatMetric(overview.approvedContactRequestCount),
    valueNote: '当前最深层闭环结果',
    ownerRatioLabel: percent(Number(overview.approvedContactRequestCount || 0), retentionOwnerBase.value),
    viewRatioLabel: percent(Number(overview.approvedContactRequestCount || 0), retentionViewBase.value),
    ownerIntensity: normalizeHeat(Number(overview.approvedContactRequestCount || 0), retentionOwnerBase.value),
    viewIntensity: normalizeHeat(Number(overview.approvedContactRequestCount || 0), retentionViewBase.value),
    hint: '当前窗口内最强的高意向闭环代理，不等于正式留存事实。',
  },
])

const funnelSource = computed(() => [
  { label: '分享访问', value: Number(overview.shareViewCount || 0), hint: '当前分享访问总量' },
  { label: '唯一访客', value: Number(overview.uniqueViewerCount || 0), hint: '当前分享触达用户' },
  { label: '查看后成卡', value: Number(overview.convertedViewerCount || 0), hint: '查看后已创建分享卡' },
  { label: '联系方式申请', value: totalContactCount.value, hint: '当前已发起联系方式申请总数' },
  { label: '已同意联系', value: Number(overview.approvedContactRequestCount || 0), hint: '当前已通过联系申请' },
])
const funnelMax = computed(() => Math.max(...funnelSource.value.map((item) => item.value), 1))
const funnelRows = computed(() =>
  funnelSource.value.map((item, index) => ({
    ...item,
    index: String(index + 1).padStart(2, '0'),
    ratio: Math.max(10, Math.round((item.value / funnelMax.value) * 100)),
    ratioLabel: percent(item.value, funnelMax.value),
  })),
)

const segmentRows = computed(() => [
  { badge: '供给', label: '活跃供给池', value: formatMetric(overview.activeShareOwnerCount), hint: '当前仍持有活跃分享卡的用户。' },
  { badge: '触达', label: '触达访客池', value: formatMetric(overview.uniqueViewerCount), hint: '当前窗口内被内容触达的独立访客。' },
  { badge: '意向', label: '成卡意向池', value: formatMetric(overview.convertedViewerCount), hint: '查看后进入成卡链路的高意向用户。' },
  { badge: '完成', label: '联系完成池', value: formatMetric(overview.approvedContactRequestCount), hint: '联系方式申请已同意的深层转化群体。' },
  { badge: '待办', label: '待跟进池', value: formatMetric(overview.pendingContactRequestCount), hint: '当前仍待处理的联系需求。' },
  { badge: '治理', label: '支付治理池', value: formatMetric(overview.todayPaymentOrderCount), hint: '当前时间窗口内的支付订单，可作为运营跟进池。' },
])

const channelInsight = computed(() => {
  const dominant = [...sceneSource.value].sort((left, right) => right.value - left.value)[0]
  if (!dominant || sceneTotal.value <= 0) {
    return '当前没有可展示的 scene 分布数据。'
  }
  return `${dominant.label} 当前贡献 ${percent(dominant.value, sceneTotal.value)}。当前页面按模板场景码聚合展示渠道观察结果，不使用更细来源字段。`
})

const funnelInsight = computed(() => {
  return `当前查看后成卡率为 ${conversionRate.value}，联系方式通过率为 ${contactApprovalRate.value}。这两项都直接由当前 overview 字段推导，没有新增独立漏斗接口。`
})

function formatMetric(value?: number | null) {
  return value ?? '--'
}

function percent(numerator: number, denominator: number) {
  if (!denominator) {
    return '0.0%'
  }
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function normalizeHeat(value: number, denominator: number) {
  if (!denominator) {
    return 0
  }
  return Math.min(1, Math.max(0.08, value / denominator))
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
.analytics-toolbar-card {
  justify-self: start;
  width: fit-content;
  max-width: 100%;
}

:deep(.analytics-toolbar-card .el-card__body) {
  padding: 12px 14px !important;
}

.analytics-toolbar {
  display: flex;
  justify-content: flex-start;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.analytics-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.analytics-tab {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(80, 63, 47, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
  color: rgba(47, 36, 27, 0.64);
  font-weight: 700;
  cursor: pointer;
}

.analytics-tab[data-active='true'] {
  background: #221f1c;
  color: #f6efe6;
  box-shadow: 0 12px 24px rgba(34, 31, 28, 0.14);
}

.analytics-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}

.analytics-grid--primary {
  grid-template-columns: minmax(0, 1.35fr) minmax(380px, 0.9fr);
}

.analytics-grid--secondary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analytics-grid--retention {
  grid-template-columns: 1fr;
}

.analytics-grid--funnel {
  grid-template-columns: 1fr;
}

.analytics-grid--segment {
  grid-template-columns: 1fr;
}

.analytics-card :deep(.el-card__body) {
  padding: 18px 20px 20px !important;
}

.analytics-card__header {
  align-items: flex-start;
  gap: 14px;
}

.analytics-card__header .table-header__hint {
  max-width: 260px;
  font-size: 11px;
  line-height: 1.6;
}

.analytics-ledger {
  display: grid;
  margin-top: 8px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.76);
}

.analytics-ledger__head,
.analytics-ledger__row {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) repeat(2, minmax(92px, 0.7fr)) minmax(180px, 1fr);
  gap: 14px;
  align-items: center;
}

.analytics-ledger__head {
  min-height: 44px;
  padding: 0 18px;
  background: rgba(248, 243, 235, 0.62);
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.analytics-ledger__row {
  min-height: 78px;
  padding: 14px 18px;
  border-top: 1px solid rgba(80, 63, 47, 0.06);
}

.analytics-ledger__cell {
  min-width: 0;
}

.analytics-ledger__cell--main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.analytics-ledger__cell--main i {
  width: 8px;
  height: 26px;
  border-radius: 999px;
}

.analytics-ledger__cell--main strong,
.analytics-ledger__cell--metric strong,
.analytics-ledger__cell--progress strong {
  display: block;
  font-size: 14px;
  line-height: 1.3;
}

.analytics-ledger__cell--main span,
.analytics-ledger__cell--metric span {
  color: rgba(47, 36, 27, 0.52);
  font-size: 12px;
  line-height: 1.55;
}

.analytics-ledger__cell--metric strong {
  font-size: 20px;
}

.analytics-ledger__cell--progress {
  display: grid;
  gap: 8px;
}

.analytics-progress {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(34, 31, 28, 0.08);
}

.analytics-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #221f1c, #578a6f);
}

.analytics-donut {
  display: grid;
  gap: 18px;
  justify-items: center;
}

.analytics-donut--compact {
  grid-template-columns: 188px minmax(0, 1fr);
  align-items: center;
  justify-items: stretch;
}

.analytics-donut__chart {
  position: relative;
  width: 188px;
  height: 188px;
  border-radius: 50%;
}

.analytics-donut__chart::after {
  content: '';
  position: absolute;
  inset: 28px;
  border-radius: inherit;
  background: #fbf7f2;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.analytics-donut__center {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-content: center;
  text-align: center;
}

.analytics-donut__center strong {
  font-size: 32px;
  line-height: 1;
}

.analytics-donut__center span {
  margin-top: 8px;
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.analytics-donut__legend {
  width: 100%;
  display: grid;
  gap: 10px;
}

.analytics-donut__legend--compact {
  align-self: start;
}

.analytics-donut__legend-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.analytics-donut__legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.analytics-donut__legend-item span {
  color: rgba(47, 36, 27, 0.6);
  font-size: 12px;
}

.analytics-donut__legend-item strong {
  font-size: 12px;
}

.analytics-insight {
  margin-top: 22px;
  padding: 18px 18px 16px;
  border-radius: 18px;
  background: rgba(246, 241, 233, 0.72);
}

.analytics-insight strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.analytics-insight p {
  margin: 0;
  color: rgba(47, 36, 27, 0.58);
  line-height: 1.7;
}

.analytics-insight--stack {
  display: grid;
  gap: 14px;
}

.analytics-insight--spacious {
  min-height: 220px;
}

.analytics-kpi {
  display: grid;
  gap: 4px;
}

.analytics-kpi span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.analytics-kpi strong {
  font-size: 28px;
}

.retention-matrix {
  display: grid;
  margin-top: 8px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.76);
}

.retention-matrix__head,
.retention-matrix__row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(96px, 0.5fr) repeat(2, minmax(120px, 0.75fr));
  gap: 8px;
  align-items: stretch;
}

.retention-matrix__head {
  min-height: 44px;
  padding: 0 18px;
  background: rgba(248, 243, 235, 0.62);
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  align-items: center;
}

.retention-matrix__row {
  min-height: 74px;
  padding: 10px 18px;
  border-top: 1px solid rgba(80, 63, 47, 0.06);
}

.retention-matrix__cell {
  min-width: 0;
}

.retention-matrix__cell--main {
  display: grid;
  gap: 4px;
  align-content: center;
}

.retention-matrix__cell--main strong,
.retention-matrix__cell--value strong {
  display: block;
  font-size: 14px;
  line-height: 1.3;
}

.retention-matrix__cell--main span,
.retention-matrix__cell--value span {
  color: rgba(47, 36, 27, 0.52);
  font-size: 12px;
  line-height: 1.5;
}

.retention-matrix__cell--value {
  display: grid;
  gap: 4px;
  align-content: center;
}

.retention-matrix__cell--value strong {
  font-size: 20px;
}

.retention-matrix__cell--heat {
  display: grid;
}

.retention-matrix__heat {
  display: grid;
  place-items: center;
  min-height: 100%;
  border-radius: 14px;
  background: rgba(166, 122, 78, calc(0.08 + (var(--matrix-alpha) * 0.32)));
  box-shadow: inset 0 0 0 1px rgba(80, 63, 47, 0.04);
}

.retention-matrix__heat strong {
  font-size: 14px;
}

.retention-governance {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(246, 241, 233, 0.72);
}

.retention-governance__signals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.retention-governance__signals span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  background: rgba(255, 255, 255, 0.66);
  color: rgba(47, 36, 27, 0.66);
  font-size: 12px;
  font-weight: 600;
}

.retention-governance p {
  margin: 0;
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.65;
}

.segment-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.segment-grid--wide {
  margin-top: 8px;
}

.segment-card {
  display: grid;
  gap: 10px;
  min-height: 204px;
  padding: 20px 18px;
  border-radius: 18px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  background: rgba(255, 255, 255, 0.72);
}

.segment-card__tag {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  background: rgba(246, 241, 233, 0.82);
  color: rgba(47, 36, 27, 0.5);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.segment-card strong {
  font-size: 16px;
  line-height: 1.35;
}

.segment-card small {
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.6;
}

.segment-card__metric {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: auto;
}

.segment-card__metric em {
  color: #221f1c;
  font-size: 22px;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
}

.segment-card__metric span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
}

.segment-card__action {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(80, 63, 47, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #221f1c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.segment-note {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(246, 241, 233, 0.72);
}

.segment-note strong {
  font-size: 14px;
}

.segment-note p {
  margin: 0;
  color: rgba(47, 36, 27, 0.56);
  line-height: 1.7;
}

.funnel-board {
  display: grid;
  gap: 14px;
}

.funnel-board--wide {
  margin-top: 8px;
}

.funnel-board__row {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.funnel-board__row--wide {
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.6fr) minmax(92px, auto);
  gap: 16px;
}

.funnel-board__copy {
  display: flex;
  gap: 12px;
  align-items: center;
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

.funnel-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px)) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(246, 241, 233, 0.72);
}

.funnel-summary__copy {
  margin: 0;
  color: rgba(47, 36, 27, 0.58);
  line-height: 1.7;
}

.analytics-insight--compact {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
}

@media (max-width: 1280px) {
  .analytics-grid--primary,
  .analytics-grid--secondary {
    grid-template-columns: 1fr;
  }

  .retention-matrix__head,
  .retention-matrix__row {
    grid-template-columns: minmax(0, 1.3fr) repeat(3, minmax(96px, 0.8fr));
  }

  .analytics-donut--compact {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .segment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .funnel-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .analytics-toolbar-card {
    width: 100%;
  }

  .analytics-toolbar {
    display: grid;
  }

  .analytics-ledger__head {
    display: none;
  }

  .analytics-ledger__row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .segment-grid {
    grid-template-columns: 1fr;
  }

  .retention-matrix__head {
    display: none;
  }

  .retention-matrix__row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .funnel-board__row {
    grid-template-columns: 1fr;
  }
}
</style>
