<template>
  <PageContainer>
    <GovernanceOverviewCards :cards="overviewCards" />

    <FilterPanel description="按申请单、卡片、持卡人、查看人和处理状态回看联系方式授权链路。">
      <el-form :model="filters" inline>
        <el-form-item label="申请单号">
          <el-input v-model.number="filters.requestId" clearable placeholder="申请单号" />
        </el-form-item>
        <el-form-item label="分享卡 ID">
          <el-input v-model.number="filters.shareCardId" clearable placeholder="分享卡 ID" />
        </el-form-item>
        <el-form-item label="持卡人 ID">
          <el-input v-model.number="filters.holderUserId" clearable placeholder="持卡人 ID" />
        </el-form-item>
        <el-form-item label="查看人 ID">
          <el-input v-model.number="filters.viewerUserId" clearable placeholder="查看人 ID" />
        </el-form-item>
        <el-form-item label="场景">
          <el-input v-model="filters.templateSceneCode" clearable placeholder="模板场景码" />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 160px">
            <el-option label="待处理" value="pending" />
            <el-option label="已同意" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请时间">
          <el-date-picker
            v-model="requestedRange"
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

    <el-card class="table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">CONTACT GOVERNANCE</p>
          <h3>联系方式申请记录</h3>
        </div>
        <span class="table-header__hint">当前页用于回看具体卡片的联系方式申请、处理结果与双方身份。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="requestId" label="申请单号" min-width="120" />
        <el-table-column prop="shareCardId" label="分享卡 ID" min-width="120" />
        <el-table-column label="卡片信息" min-width="170">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ resolveCardSceneLabel(row.templateSceneCode, row.templateName) }}</strong>
              <span>{{ row.templateSceneCode ? `模板场景码：${row.templateSceneCode}` : '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="持卡人" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.ownerName || '--' }}</strong>
              <span>{{ row.holderUserId ?? '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="查看人" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.viewerName || '--' }}</strong>
              <span>{{ row.viewerUserId ?? '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="contactRequestStatusMap[row.status || 'none'] || contactRequestStatusMap.none" />
          </template>
        </el-table-column>
        <el-table-column label="申请时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.requestedAt) }}</template>
        </el-table-column>
        <el-table-column label="处理时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.decidedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="220">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.requestId)">查看详情</el-button>
              <PermissionButton
                v-if="isPending(row)"
                link
                type="success"
                action="action.content.contact-request.approve"
                @click="openDecision('approve', row)"
              >
                同意
              </PermissionButton>
              <PermissionButton
                v-if="isPending(row)"
                link
                type="danger"
                action="action.content.contact-request.reject"
                @click="openDecision('reject', row)"
              >
                拒绝
              </PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <strong>当前条件下没有联系方式申请</strong>
            <p>可以切换状态、持卡人或场景，回看其它名片的联系方式授权记录。</p>
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

    <AdminDetailDrawer v-model="detailVisible" title="联系方式申请详情" size="860px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-layout">
        <section v-if="detail?.requestInfo" class="drawer-hero">
          <div>
            <p>CONTACT DETAIL / 联系授权</p>
            <strong>{{ detail.requestInfo.requestId ?? '联系方式申请详情' }}</strong>
            <span>{{ detail.ownerInfo?.displayName || '--' }} · {{ detail.viewerInfo?.displayName || '--' }}</span>
          </div>
          <StatusTag v-bind="contactRequestStatusMap[detail.requestInfo.status || 'none'] || contactRequestStatusMap.none" />
        </section>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>申请概览</h3></template>
          <DetailGrid :items="requestBlocks" />
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>卡片上下文</h3></template>
          <DetailGrid :items="cardBlocks" />
        </el-card>

        <div class="detail-split">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>持卡人</h3></template>
            <DetailGrid :items="ownerBlocks" />
          </el-card>

          <el-card class="detail-card" shadow="never">
            <template #header><h3>查看人</h3></template>
            <DetailGrid :items="viewerBlocks" />
          </el-card>
        </div>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveContentContactRequest,
  fetchContentContactRequestDetail,
  fetchContentContactRequests,
  rejectContentContactRequest,
} from '@/api/content'
import FilterPanel from '@/components/business/FilterPanel.vue'
import GovernanceOverviewCards from '@/components/business/GovernanceOverviewCards.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { contactRequestStatusMap } from '@/constants/status'
import type { ContentContactRequestDetail, ContentContactRequestItem, ContentContactRequestQuery } from '@/types/content'
import { formatDateTime, maskPhone } from '@/utils/format'
import { resolveShareCardSceneDisplayLabel } from '@/utils/shareCard'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type DateRangeValue = [string, string] | []

const loading = ref(false)
const detailLoading = ref(false)
const rows = ref<ContentContactRequestItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<ContentContactRequestDetail | null>(null)

type DecisionMode = 'approve' | 'reject'

const filters = reactive<ContentContactRequestQuery>({
  pageNo: 1,
  pageSize: 20,
  requestId: undefined,
  shareCardId: undefined,
  holderUserId: undefined,
  viewerUserId: undefined,
  templateSceneCode: '',
  status: '',
  requestedAtFrom: undefined,
  requestedAtTo: undefined,
})

const overviewCards = computed(() => {
  const pendingCount = rows.value.filter((item) => item.status === 'pending').length
  const approvedCount = rows.value.filter((item) => item.status === 'approved').length
  const rejectedCount = rows.value.filter((item) => item.status === 'rejected').length

  return [
    {
      label: '查询规模',
      badge: '当前查询',
      tone: null,
      value: `${total.value} 条`,
      hint: '当前筛选条件下的联系方式申请总数。',
    },
    {
      label: '当前页待处理',
      badge: 'pending',
      tone: 'warning' as const,
      value: `${pendingCount} 条`,
      hint: '仍处于待处理状态的联系方式申请。',
    },
    {
      label: '当前页已处理',
      badge: `${approvedCount + rejectedCount} 条`,
      tone: 'success' as const,
      value: `${approvedCount} 同意 / ${rejectedCount} 拒绝`,
      hint: '用于快速回看本页已经完成的联系方式授权结果。',
    },
  ]
})

const requestedRange = computed<DateRangeValue>({
  get: (): DateRangeValue =>
    filters.requestedAtFrom && filters.requestedAtTo ? [filters.requestedAtFrom, filters.requestedAtTo] as [string, string] : [],
  set: (value: DateRangeValue) => {
    if (Array.isArray(value) && value.length === 2) {
      filters.requestedAtFrom = value[0]
      filters.requestedAtTo = value[1]
      return
    }
    filters.requestedAtFrom = undefined
    filters.requestedAtTo = undefined
  },
})

const requestBlocks = computed(() => {
  const requestInfo = detail.value?.requestInfo
  if (!requestInfo) {
    return []
  }
  return [
    { label: '申请单号', value: requestInfo.requestId ?? '--' },
    { label: '处理状态', value: (contactRequestStatusMap[requestInfo.status || 'none'] || contactRequestStatusMap.none).label },
    { label: '卡片模板', value: resolveCardSceneLabel(detail.value?.cardInfo?.templateSceneCode, requestInfo.templateName) },
    { label: '申请时间', value: formatDateTime(requestInfo.requestedAt) },
    { label: '处理时间', value: formatDateTime(requestInfo.decidedAt) },
    { label: '申请备注', value: requestInfo.applicantNote || '--' },
    { label: '处理备注', value: requestInfo.decisionNote || '--' },
  ]
})

const cardBlocks = computed(() => {
  const cardInfo = detail.value?.cardInfo
  if (!cardInfo) {
    return []
  }
  return [
    { label: '分享卡 ID', value: cardInfo.shareCardId ?? '--' },
    { label: '展示风格', value: resolveCardSceneLabel(cardInfo.templateSceneCode, detail.value?.requestInfo?.templateName) },
    { label: '模板场景码', value: cardInfo.templateSceneCode || '--' },
    { label: '档案用户 ID', value: cardInfo.profileUserId ?? '--' },
    { label: '分享状态', value: cardInfo.shareStatus || '--' },
    { label: '默认卡', value: cardInfo.defaultCard ? '是' : '否' },
  ]
})

const ownerBlocks = computed(() => buildUserBlocks(detail.value?.ownerInfo))
const viewerBlocks = computed(() => buildUserBlocks(detail.value?.viewerInfo))

function buildUserBlocks(user?: ContentContactRequestDetail['ownerInfo']) {
  return [
    { label: '用户 ID', value: user?.userId ?? '--' },
    { label: '展示名', value: user?.displayName || '--' },
    { label: '用户名', value: user?.userName || '--' },
    { label: '昵称', value: user?.nickName || '--' },
    { label: '手机号', value: maskPhone(user?.phone) },
    { label: '实名状态', value: formatRealAuthStatus(user?.realAuthStatus) },
    { label: '有效邀请数', value: user?.validInviteCount ?? 0 },
  ]
}

function resolveCardSceneLabel(templateSceneCode?: string | null, templateName?: string | null) {
  return resolveShareCardSceneDisplayLabel(templateSceneCode, templateName)
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
    const result = await fetchContentContactRequests(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  detailVisible.value = true
  await loadDetail(id)
}

async function loadDetail(id: number) {
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await fetchContentContactRequestDetail(id)
  } finally {
    detailLoading.value = false
  }
}

function isPending(row: ContentContactRequestItem) {
  return row.status === 'pending'
}

async function openDecision(mode: DecisionMode, row: ContentContactRequestItem) {
  const isApprove = mode === 'approve'
  try {
    const result = await ElMessageBox.prompt(
      isApprove ? '可填写同意备注，也可以直接确认。' : '请输入拒绝原因，处理结果会回写到申请记录。',
      isApprove ? '同意联系方式申请' : '拒绝联系方式申请',
      {
        confirmButtonText: isApprove ? '确认同意' : '确认拒绝',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: isApprove ? '处理备注，可留空' : '拒绝原因',
        inputPattern: isApprove ? undefined : /\S/,
        inputErrorMessage: '请输入拒绝原因',
      },
    )
    const decisionNote = String(result.value || '').trim()
    if (isApprove) {
      await approveContentContactRequest(row.requestId, { decisionNote })
      ElMessage.success('联系方式申请已同意')
    } else {
      await rejectContentContactRequest(row.requestId, { decisionNote })
      ElMessage.success('联系方式申请已拒绝')
    }
    await loadList()
    if (detailVisible.value && detail.value?.requestInfo?.requestId === row.requestId) {
      await loadDetail(row.requestId)
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error instanceof Error ? error.message : '联系方式申请处理失败')
    }
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.requestId = undefined
  filters.shareCardId = undefined
  filters.holderUserId = undefined
  filters.viewerUserId = undefined
  filters.templateSceneCode = ''
  filters.status = ''
  filters.requestedAtFrom = undefined
  filters.requestedAtTo = undefined
  loadList()
}

onMounted(loadList)
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

</style>
