<template>
  <PageContainer>
    <section class="console-overview">
      <article class="console-overview-card console-overview-card--dark">
        <div class="console-overview-card__head">
          <p>PAYMENT / ORDER</p>
          <span>QUEUE</span>
        </div>
        <strong>{{ total }} 笔订单</strong>
        <small>展示当前支付订单聚合结果。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>ORDER FILTER</p>
          <span>FOCUS</span>
        </div>
        <strong>{{ filters.orderNo || '全部订单' }}</strong>
        <small>支持按订单号、用户和时间窗口定位当前支付主链。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>PAY STATUS</p>
          <span>STATE</span>
        </div>
        <strong>{{ filters.payStatus === 1 ? '已支付' : filters.payStatus === 2 ? '已关闭' : filters.payStatus === 0 ? '待支付' : '全部状态' }}</strong>
        <small>支付状态按当前订单模型展示。</small>
      </article>
    </section>

    <FilterPanel description="按订单号、用户、支付状态和时间范围筛选支付订单。">
      <el-form :model="filters" inline>
        <el-form-item label="订单号">
          <el-input v-model="filters.orderNo" placeholder="支付订单号" clearable />
        </el-form-item>
        <el-form-item label="用户 ID">
          <el-input v-model.number="filters.userId" placeholder="用户 ID" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="filters.phone" placeholder="手机号" clearable />
        </el-form-item>
        <el-form-item label="支付状态">
          <el-select v-model="filters.payStatus" clearable style="width: 160px">
            <el-option label="待支付" :value="0" />
            <el-option label="已支付" :value="1" />
            <el-option label="已关闭" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付渠道">
          <el-input v-model="filters.payChannel" placeholder="payChannel" clearable />
        </el-form-item>
        <el-form-item label="产品 ID">
          <el-input v-model.number="filters.productId" placeholder="产品 ID" clearable />
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="createdAtRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="创建开始"
            end-placeholder="创建结束"
            value-format="YYYY-MM-DDTHH:mm:ss"
            @change="handleCreatedAtRangeChange"
          />
        </el-form-item>
        <el-form-item label="支付时间">
          <el-date-picker
            v-model="paidAtRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="支付开始"
            end-placeholder="支付结束"
            value-format="YYYY-MM-DDTHH:mm:ss"
            @change="handlePaidAtRangeChange"
          />
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadOrders">查询</el-button>
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
          <p class="table-header__eyebrow">ORDER FEED / 支付订单</p>
          <h3>支付订单清单</h3>
        </div>
        <span class="table-header__hint">围绕当前支付订单、产品和退款摘要做回看，不在这里引入新的交易治理模块。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="paymentOrderId" label="订单 ID" min-width="110" />
        <el-table-column prop="orderNo" label="订单号" min-width="180" />
        <el-table-column prop="userId" label="用户 ID" min-width="100" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column label="产品" min-width="220">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.productName || '--' }}</strong>
              <span>{{ row.productCode || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column prop="bizType" label="业务类型" min-width="160" />
        <el-table-column label="金额" min-width="120">
          <template #default="{ row }">{{ formatCurrency(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="支付状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="resolveOrderStatusTag(row.payStatus)" />
          </template>
        </el-table-column>
        <el-table-column prop="payChannel" label="渠道" min-width="120" />
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="支付时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.paidAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="120">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.paymentOrderId)">查看详情</el-button>
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
          @current-change="loadOrders"
          @size-change="loadOrders"
        />
      </div>
    </el-card>

    <AdminDetailDrawer v-model="detailVisible" title="支付订单详情" size="920px" destroy-on-close>
      <div v-if="detail" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>ORDER DETAIL / 订单详情</p>
            <strong>{{ detail.orderInfo?.orderNo || '支付订单详情' }}</strong>
            <span>{{ detail.productInfo?.productName || detail.productInfo?.productCode || '--' }} · 用户 {{ detail.orderInfo?.userId ?? '--' }}</span>
          </div>
          <StatusTag v-bind="resolveOrderStatusTag(detail.orderInfo?.payStatus)" />
        </section>

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>订单信息</h3></template>
            <DetailGrid :items="orderBlocks" />
          </el-card>
          <el-card class="detail-card" shadow="never">
            <template #header><h3>产品信息</h3></template>
            <DetailGrid :items="productBlocks" />
          </el-card>
        </div>

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>支付摘要</h3></template>
            <DetailGrid :items="paymentBlocks" />
          </el-card>
          <el-card class="detail-card" shadow="never">
            <template #header><h3>退款摘要</h3></template>
            <DetailGrid :items="refundBlocks" />
          </el-card>
        </div>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>关联流水</h3></template>
          <el-table :data="detail.paymentInfo?.transactions || []" empty-text="暂无支付流水">
            <el-table-column prop="transactionId" label="流水 ID" min-width="110" />
            <el-table-column prop="channelTradeNo" label="渠道流水号" min-width="180" />
            <el-table-column prop="channel" label="渠道" min-width="120" />
            <el-table-column prop="tradeType" label="交易类型" min-width="120" />
            <el-table-column label="金额" min-width="120">
              <template #default="{ row }">{{ formatCurrency(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="状态" min-width="100">
              <template #default="{ row }">
                <StatusTag v-bind="resolveTransactionStatusTag(row.status)" />
              </template>
            </el-table-column>
            <el-table-column label="回调时间" min-width="180">
              <template #default="{ row }">{{ formatDateTime(row.callbackTime) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPaymentOrderDetail, fetchPaymentOrders } from '@/api/payment'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { paymentOrderStatusMap, paymentTransactionStatusMap, refundAuditStatusMap, refundStatusMap } from '@/constants/status'
import type { PaymentOrderDetail, PaymentOrderListItem, PaymentOrderQuery } from '@/types/payment'
import {
  getDashboardContextSummary,
  getDashboardContextTitle,
  readRouteQueryString,
  resolveDashboardRouteSource,
} from '@/utils/dashboard-context'
import { formatCurrency, formatDateTime } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

const loading = ref(false)
const route = useRoute()
const router = useRouter()
const rows = ref<PaymentOrderListItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<PaymentOrderDetail | null>(null)

const filters = reactive<PaymentOrderQuery>({
  pageNo: 1,
  pageSize: 20,
  orderNo: '',
  userId: undefined,
  phone: '',
  payStatus: undefined,
  payChannel: '',
  bizType: '',
  productId: undefined,
  createdAtFrom: '',
  createdAtTo: '',
  paidAtFrom: '',
  paidAtTo: '',
})

const createdAtRange = ref<string[]>([])
const paidAtRange = ref<string[]>([])
const dashboardContextSource = computed(() => resolveDashboardRouteSource(route.query.source))
const dashboardContextTitle = computed(() => getDashboardContextTitle(dashboardContextSource.value))
const dashboardContextSummary = computed(() => {
  const parts: string[] = []
  if (filters.orderNo) {
    parts.push(`支付订单号 ${filters.orderNo}`)
  }
  if (filters.userId != null) {
    parts.push(`用户 ID ${filters.userId}`)
  }
  if (filters.createdAtFrom && filters.createdAtTo) {
    parts.push(`创建时间 ${formatDateTime(filters.createdAtFrom)} 至 ${formatDateTime(filters.createdAtTo)}`)
  }
  return parts.join('；') || getDashboardContextSummary(dashboardContextSource.value)
})

const orderBlocks = computed(() => {
  const order = detail.value?.orderInfo
  if (!order) return []
  return [
    { label: '订单 ID', value: order.paymentOrderId ?? '--' },
    { label: '订单号', value: order.orderNo || '--' },
    { label: '用户 ID', value: order.userId ?? '--' },
    { label: '手机号', value: order.phone || '--' },
    { label: '业务类型', value: order.bizType || '--' },
    { label: '业务引用 ID', value: order.bizRefId ?? '--' },
    { label: '金额', value: formatCurrency(order.amount) },
    { label: '币种', value: order.currencyCode || '--' },
    { label: '支付状态', value: resolveOrderStatusTag(order.payStatus).label },
    { label: '支付渠道', value: order.payChannel || '--' },
    { label: '创建时间', value: formatDateTime(order.createTime) },
    { label: '支付时间', value: formatDateTime(order.paidAt) },
  ]
})

const productBlocks = computed(() => {
  const product = detail.value?.productInfo
  if (!product) return []
  return [
    { label: '产品 ID', value: product.productId ?? '--' },
    { label: '产品编码', value: product.productCode || '--' },
    { label: '产品名称', value: product.productName || '--' },
    { label: '时长(天)', value: product.durationDays ?? '--' },
  ]
})

const paymentBlocks = computed(() => {
  const payment = detail.value?.paymentInfo
  return [
    { label: '流水数量', value: payment?.transactionCount ?? 0 },
  ]
})

const refundBlocks = computed(() => {
  const refund = detail.value?.refundSummary
  return [
    { label: '退款单数量', value: refund?.totalRefundCount ?? 0 },
    { label: '累计退款金额', value: formatCurrency(refund?.totalRefundAmount) },
    { label: '最新退款单 ID', value: refund?.latestRefundOrderId ?? '--' },
    { label: '最新退款单号', value: refund?.latestRefundNo || '--' },
    { label: '最新审核状态', value: refund?.latestAuditStatus == null ? '--' : (refundAuditStatusMap[refund.latestAuditStatus] || { label: `状态 ${refund.latestAuditStatus}` }).label },
    { label: '最新退款状态', value: refund?.latestRefundStatus == null ? '--' : (refundStatusMap[refund.latestRefundStatus] || { label: `状态 ${refund.latestRefundStatus}` }).label },
  ]
})

function resolveOrderStatusTag(status?: number | null) {
  const matched = paymentOrderStatusMap[status ?? -1]
  if (matched) {
    return matched
  }
  return { label: `状态 ${status ?? '--'}`, tone: 'info' as const }
}

function resolveTransactionStatusTag(status?: number | null) {
  const matched = paymentTransactionStatusMap[status ?? -1]
  if (matched) {
    return matched
  }
  return { label: `状态 ${status ?? '--'}`, tone: 'info' as const }
}

function handleCreatedAtRangeChange(value: string[] | null) {
  filters.createdAtFrom = value?.[0] || ''
  filters.createdAtTo = value?.[1] || ''
}

function handlePaidAtRangeChange(value: string[] | null) {
  filters.paidAtFrom = value?.[0] || ''
  filters.paidAtTo = value?.[1] || ''
}

function applyRouteFilters() {
  filters.orderNo = readRouteQueryString(route.query.orderNo) || ''
  const userId = readRouteQueryString(route.query.userId)
  filters.userId = userId ? Number(userId) : undefined
  filters.createdAtFrom = readRouteQueryString(route.query.createdAtFrom) || ''
  filters.createdAtTo = readRouteQueryString(route.query.createdAtTo) || ''
  createdAtRange.value =
    filters.createdAtFrom && filters.createdAtTo ? [filters.createdAtFrom, filters.createdAtTo] : []
}

function clearDashboardContext() {
  router.replace({ path: route.path })
}

async function loadOrders() {
  loading.value = true
  try {
    const result = await fetchPaymentOrders(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  detail.value = await fetchPaymentOrderDetail(id)
  detailVisible.value = true
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.orderNo = ''
  filters.userId = undefined
  filters.phone = ''
  filters.payStatus = undefined
  filters.payChannel = ''
  filters.bizType = ''
  filters.productId = undefined
  filters.createdAtFrom = ''
  filters.createdAtTo = ''
  filters.paidAtFrom = ''
  filters.paidAtTo = ''
  createdAtRange.value = []
  paidAtRange.value = []
  loadOrders()
}

watch(
  () => route.fullPath,
  () => {
    applyRouteFilters()
    loadOrders()
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">

.context-alert {
  margin-bottom: 18px;
}

.context-alert__content {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

@media (max-width: 960px) {
  .context-alert__content,
  .detail-split {
    display: grid;
  }
}
</style>
