<template>
  <PageContainer>
    <section class="page-overview user-overview">
      <article class="page-overview-card page-overview-card--dark">
        <div class="page-overview-card__head">
          <p>REGISTERED USERS</p>
          <span>当前筛选</span>
        </div>
        <strong>{{ total }}</strong>
        <small>当前筛选条件下命中的真实业务用户总数。</small>
      </article>
      <article class="page-overview-card">
        <div class="page-overview-card__head">
          <p>CREW USERS</p>
          <span>当前页</span>
        </div>
        <strong>{{ crewCount }}</strong>
        <small>当前页中可识别为剧组侧的业务用户数量。</small>
      </article>
      <article class="page-overview-card">
        <div class="page-overview-card__head">
          <p>ACTIVE 30D</p>
          <span>当前页</span>
        </div>
        <strong>{{ activeCount }}</strong>
        <small>最近 30 天内有活跃时间的业务用户数量。</small>
      </article>
      <article class="page-overview-card">
        <div class="page-overview-card__head">
          <p>DORMANT</p>
          <span>FOLLOW UP</span>
        </div>
        <strong>{{ dormantCount }}</strong>
        <small>当前页中最近 30 天未活跃、可进入唤醒池的用户数量。</small>
      </article>
    </section>

    <el-card class="table-card user-shell-card" shadow="never">
      <div class="user-shell-card__toolbar">
        <div class="user-segments" role="tablist" aria-label="用户筛选视图">
          <button
            v-for="segment in segmentOptions"
            :key="segment.key"
            type="button"
            class="user-segment"
            :data-active="activeSegment === segment.key"
            @click="switchSegment(segment.key)"
          >
            <span>{{ segment.label }}</span>
            <small>{{ segment.count }}</small>
          </button>
        </div>

        <div class="user-shell-card__actions">
          <el-input
            v-model="quickKeyword"
            placeholder="姓名 / 手机号 / 用户 ID"
            clearable
            class="user-shell-card__search"
            @keyup.enter="applyQuickSearch"
          />
          <el-button @click="applyQuickSearch">快速筛选</el-button>
        </div>
      </div>
    </el-card>

    <FilterPanel
      class="user-filter-panel"
      description="按用户 ID、昵称、手机号、身份、实名与资格状态筛选当前业务用户列表。"
    >
      <el-form :model="filters" inline>
        <el-form-item label="用户 ID">
          <el-input v-model.number="filters.userId" clearable placeholder="用户 ID" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="filters.nickname" clearable placeholder="昵称 / 用户名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="filters.phone" clearable placeholder="手机号" />
        </el-form-item>
        <el-form-item label="用户类型">
          <el-select v-model="userTypeValue" clearable placeholder="全部类型" style="width: 160px">
            <el-option label="创作者 / 演员" :value="1" />
            <el-option label="剧组 / 团队" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="实名认证">
          <el-select v-model="realAuthValue" clearable placeholder="全部状态" style="width: 160px">
            <el-option label="未实名" :value="0" />
            <el-option label="审核中" :value="1" />
            <el-option label="已实名" :value="2" />
            <el-option label="已驳回" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="资格状态">
          <el-select v-model="entitlementValue" clearable placeholder="全部状态" style="width: 160px">
            <el-option label="有效资格" :value="1" />
            <el-option label="无有效资格" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadUsers">查询</el-button>
      </template>
    </FilterPanel>

    <el-card class="table-card user-table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">USER MANAGEMENT / 业务用户</p>
          <h3>用户管理</h3>
        </div>
        <span class="table-header__hint">正式用户管理已回接真实 `/admin/users` 事实源；后台账号治理位于隐藏工具域，不作为业务用户替身。</span>
      </div>

      <el-table class="user-table" :data="rows" v-loading="loading">
        <el-table-column label="用户" min-width="260">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="user-avatar">{{ resolveAvatarText(row.nickname, row.phone) }}</div>
              <div class="user-cell__copy">
                <strong>{{ row.nickname || '--' }}</strong>
                <span>{{ row.userId }} · {{ maskPhone(row.phone) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="身份" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ resolveUserTypeLabel(row.userType, row.role) }}</strong>
              <span>{{ row.role || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>

        <el-table-column label="资格" min-width="180">
          <template #default="{ row }">
            {{ resolveEntitlementSummary(row.entitlementSummary) }}
          </template>
        </el-table-column>

        <el-table-column label="有效邀请" min-width="120">
          <template #default="{ row }">{{ row.validInviteCount ?? 0 }}</template>
        </el-table-column>

        <el-table-column label="实名状态" min-width="120">
          <template #default="{ row }">
            <StatusTag :label="resolveAuthLabel(row.realAuthStatus)" :tone="resolveAuthTone(row.realAuthStatus)" />
          </template>
        </el-table-column>

        <el-table-column label="最近活跃" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.lastActiveAt) }}</template>
        </el-table-column>

        <el-table-column label="注册时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.registeredAt) }}</template>
        </el-table-column>

        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <StatusTag :label="resolveActivityLabel(row.lastActiveAt)" :tone="resolveActivityTone(row.lastActiveAt)" />
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" min-width="108">
          <template #default="{ row }">
            <TableActions>
              <el-button v-if="canOpenUserDetail" link type="primary" @click="openDetail(row.userId)">查看详情</el-button>
            </TableActions>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">
            <strong>当前条件下没有业务用户</strong>
            <p>可以切换身份、实名或资格条件，查看真实业务用户数据。</p>
          </div>
        </template>
      </el-table>

      <div class="pager">
        <AdminPager
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          :total="total"
          @current-change="loadUsers"
          @size-change="loadUsers"
        />
      </div>
    </el-card>

    <AdminDetailDrawer v-model="detailVisible" title="用户管理详情" size="960px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-layout">
        <section v-if="detail?.userInfo" class="drawer-hero">
          <div>
            <p>USER DETAIL / 用户中心</p>
            <strong>{{ detail.userInfo.userName || detail.actorProfileSummary?.nickName || '--' }}</strong>
            <span>{{ detail.userInfo.userId ?? '--' }} · {{ resolveUserTypeLabel(detail.userInfo.userType, detail.userInfo.role) }}</span>
          </div>
          <StatusTag
            :label="resolveActivityLabel(detail.userInfo.lastActiveAt)"
            :tone="resolveActivityTone(detail.userInfo.lastActiveAt)"
          />
        </section>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>用户概览</h3></template>
          <DetailGrid :items="userBlocks" />
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>档案与实名</h3></template>
          <DetailGrid :items="profileBlocks" />
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>邀请与资格</h3></template>
          <DetailGrid :items="referralBlocks" />
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>最近操作留痕</h3></template>
          <el-table :data="recentOperationLogs" size="small">
            <el-table-column prop="moduleCode" label="模块" min-width="120" />
            <el-table-column prop="operationCode" label="动作" min-width="140" />
            <el-table-column prop="adminUserName" label="操作人" min-width="120" />
            <el-table-column prop="targetType" label="目标类型" min-width="140" />
            <el-table-column prop="targetId" label="目标 ID" min-width="100" />
            <el-table-column label="时间" min-width="180">
              <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
            </el-table-column>
            <template #empty>
              <div class="table-empty">
                <strong>暂无操作留痕</strong>
                <p>当前用户暂无已记录的后台操作日志。</p>
              </div>
            </template>
          </el-table>
        </el-card>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { fetchUserCenterUserDetail, fetchUserCenterUsers } from '@/api/user-center'
import { PERMISSIONS } from '@/constants/permission'
import { usePermissionStore } from '@/stores/permission'
import type { UserCenterDetail, UserCenterListItem, UserCenterQuery } from '@/types/user-center'
import { formatDateTime, maskPhone } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type SegmentKey = 'all' | 'actor' | 'crew' | 'verified' | 'entitled'

const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const quickKeyword = ref('')
const activeSegment = ref<SegmentKey>('all')
const rows = ref<UserCenterListItem[]>([])
const total = ref(0)
const detail = ref<UserCenterDetail | null>(null)
const permissionStore = usePermissionStore()
const canOpenUserDetail = computed(() => permissionStore.hasPage(PERMISSIONS.page.usersDetail))

const filters = reactive<UserCenterQuery>({
  pageNo: 1,
  pageSize: 10,
  userId: undefined,
  phone: '',
  nickname: '',
  userType: undefined,
  realAuthStatus: undefined,
  referralStatus: undefined,
  entitlementStatus: undefined,
})

const userTypeValue = computed({
  get: () => filters.userType,
  set: (value: number | undefined) => {
    filters.userType = value == null ? undefined : Number(value)
  },
})

const realAuthValue = computed({
  get: () => filters.realAuthStatus,
  set: (value: number | undefined) => {
    filters.realAuthStatus = value == null ? undefined : Number(value)
  },
})

const entitlementValue = computed({
  get: () => filters.entitlementStatus,
  set: (value: number | undefined) => {
    filters.entitlementStatus = value == null ? undefined : Number(value)
  },
})

const crewCount = computed(() => rows.value.filter((item) => Number(item.userType) === 2).length)
const activeCount = computed(() => rows.value.filter((item) => isActiveWithin30Days(item.lastActiveAt)).length)
const dormantCount = computed(() => rows.value.filter((item) => !isActiveWithin30Days(item.lastActiveAt)).length)

const segmentOptions = computed(() => [
  { key: 'all' as SegmentKey, label: '全部用户', count: total.value },
  { key: 'actor' as SegmentKey, label: '创作者', count: rows.value.filter((item) => Number(item.userType) === 1).length },
  { key: 'crew' as SegmentKey, label: '剧组用户', count: crewCount.value },
  { key: 'verified' as SegmentKey, label: '已实名', count: rows.value.filter((item) => Number(item.realAuthStatus) === 2).length },
  { key: 'entitled' as SegmentKey, label: '有资格', count: rows.value.filter((item) => Number(item.entitlementSummary?.activeCount || 0) > 0).length },
])

const recentOperationLogs = computed(() => detail.value?.recentOperationLogs || [])

const userBlocks = computed(() => {
  const userInfo = detail.value?.userInfo
  return [
    { label: '用户 ID', value: userInfo?.userId ?? '--' },
    { label: '昵称 / 用户名', value: userInfo?.userName || '--' },
    { label: '手机号', value: maskPhone(userInfo?.phone) },
    { label: '账号', value: userInfo?.account || '--' },
    { label: '身份', value: resolveUserTypeLabel(userInfo?.userType, userInfo?.role) },
    { label: '注册时间', value: formatDateTime(userInfo?.registeredAt) },
    { label: '最近活跃', value: formatDateTime(userInfo?.lastActiveAt) },
    { label: '邀请人', value: userInfo?.invitedByUserId ?? '--' },
  ]
})

const profileBlocks = computed(() => {
  const profile = detail.value?.actorProfileSummary
  const verify = detail.value?.verifySummary
  return [
    { label: '演员档案 ID', value: profile?.actorProfileId ?? '--' },
    { label: '艺名', value: profile?.nickName || '--' },
    { label: '实名', value: verify?.latestRealName || profile?.realName || '--' },
    { label: '城市', value: profile?.locationCity || '--' },
    { label: '年龄', value: profile?.age ?? '--' },
    { label: '实名认证', value: resolveAuthLabel(verify?.realAuthStatus) },
    { label: '最近提交', value: formatDateTime(verify?.latestSubmittedAt) },
    { label: '最近审核', value: formatDateTime(verify?.latestReviewedAt) },
  ]
})

const referralBlocks = computed(() => {
  const referral = detail.value?.referralSummary
  const entitlement = detail.value?.entitlementSummary
  return [
    { label: '邀请码', value: referral?.inviteCode || '--' },
    { label: '有效邀请', value: referral?.validInviteCount ?? '--' },
    { label: '总邀请数', value: referral?.totalInviteCount ?? '--' },
    { label: '待生效邀请', value: referral?.pendingInviteCount ?? '--' },
    { label: '有效资格数', value: entitlement?.activeCount ?? '--' },
    { label: '最新过期时间', value: formatDateTime(entitlement?.latestExpireTime) },
    { label: '资格码', value: entitlement?.activeGrantCodes?.join(' / ') || '--' },
    { label: '最近邀请时间', value: formatDateTime(referral?.lastInvitedAt) },
  ]
})

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const result = await fetchUserCenterUsers(buildQuery())
    rows.value = result.list || []
    total.value = Number(result.total || 0)
  } finally {
    loading.value = false
  }
}

async function openDetail(userId: number) {
  if (!canOpenUserDetail.value) {
    ElMessage.warning('当前账号缺少业务用户详情页权限')
    return
  }
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await fetchUserCenterUserDetail(userId)
  } finally {
    detailLoading.value = false
  }
}

function switchSegment(next: SegmentKey) {
  activeSegment.value = next
  filters.pageNo = 1
  filters.userType = undefined
  filters.realAuthStatus = undefined
  filters.entitlementStatus = undefined

  if (next === 'actor') {
    filters.userType = 1
  } else if (next === 'crew') {
    filters.userType = 2
  } else if (next === 'verified') {
    filters.realAuthStatus = 2
  } else if (next === 'entitled') {
    filters.entitlementStatus = 1
  }

  loadUsers()
}

function applyQuickSearch() {
  const keyword = quickKeyword.value.trim()
  filters.pageNo = 1
  filters.userId = keyword && /^\d+$/.test(keyword) ? Number(keyword) : undefined
  filters.phone = keyword && /^\d{7,}$/.test(keyword) ? keyword : ''
  filters.nickname = keyword && !filters.userId && !filters.phone ? keyword : ''
  loadUsers()
}

function resetFilters() {
  quickKeyword.value = ''
  activeSegment.value = 'all'
  filters.pageNo = 1
  filters.pageSize = 10
  filters.userId = undefined
  filters.phone = ''
  filters.nickname = ''
  filters.userType = undefined
  filters.realAuthStatus = undefined
  filters.referralStatus = undefined
  filters.entitlementStatus = undefined
  loadUsers()
}

function buildQuery(): UserCenterQuery {
  return {
    pageNo: filters.pageNo,
    pageSize: filters.pageSize,
    userId: filters.userId || undefined,
    phone: filters.phone?.trim() || undefined,
    nickname: filters.nickname?.trim() || undefined,
    userType: filters.userType,
    realAuthStatus: filters.realAuthStatus,
    referralStatus: filters.referralStatus,
    entitlementStatus: filters.entitlementStatus,
  }
}

function resolveAvatarText(name?: string | null, phone?: string | null) {
  return (name || phone || 'U').slice(0, 1).toUpperCase()
}

function resolveUserTypeLabel(userType?: number | string | null, role?: string | null) {
  if (Number(userType) === 2 || role === 'crew') {
    return '剧组 / 团队'
  }
  if (role === 'actor' || Number(userType) === 1) {
    return '创作者 / 演员'
  }
  return '业务用户'
}

function resolveEntitlementSummary(summary?: UserCenterListItem['entitlementSummary']) {
  if (!summary || Number(summary.activeCount || 0) <= 0) {
    return '无有效资格'
  }
  return `${summary.activeCount || 0} 个有效资格`
}

function resolveAuthLabel(status?: number | null) {
  if (status === 2) {
    return '已实名'
  }
  if (status === 1) {
    return '审核中'
  }
  if (status === 3) {
    return '已驳回'
  }
  return '未实名'
}

function resolveAuthTone(status?: number | null) {
  if (status === 2) {
    return 'success'
  }
  if (status === 1) {
    return 'warning'
  }
  if (status === 3) {
    return 'danger'
  }
  return 'info'
}

function resolveActivityLabel(value?: string | null) {
  return isActiveWithin30Days(value) ? '30日活跃' : '待唤醒'
}

function resolveActivityTone(value?: string | null) {
  return isActiveWithin30Days(value) ? 'success' : 'warning'
}

function isActiveWithin30Days(value?: string | null) {
  if (!value) {
    return false
  }
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) {
    return false
  }
  return Date.now() - time <= 30 * 24 * 60 * 60 * 1000
}
</script>

<style scoped lang="scss">
:deep(.user-overview.user-overview.user-overview) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

:deep(.user-overview.user-overview .page-overview-card.page-overview-card) {
  gap: 8px;
  min-height: 140px;
  padding: 16px 18px 14px;
}

:deep(.user-overview.user-overview .page-overview-card.page-overview-card small) {
  font-size: 12px;
  line-height: 1.55;
}

.user-shell-card {
  overflow: hidden;
}

:deep(.user-shell-card > .el-card__body) {
  padding: 18px 20px;
}

.user-shell-card__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.user-segments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-segment {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(80, 63, 47, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
  color: rgba(47, 36, 27, 0.64);
  cursor: pointer;
}

.user-segment span {
  font-weight: 700;
}

.user-segment small {
  color: rgba(47, 36, 27, 0.46);
}

.user-segment[data-active='true'] {
  background: #221f1c;
  color: #f6efe6;
  box-shadow: 0 12px 24px rgba(34, 31, 28, 0.14);
}

.user-segment[data-active='true'] small {
  color: rgba(246, 239, 230, 0.68);
}

.user-shell-card__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.user-shell-card__search {
  width: min(320px, 100%);
}

.user-filter-panel :deep(.el-card__body) {
  padding: 20px 20px 18px;
}

.user-filter-panel :deep(.filter-panel__header) {
  margin-bottom: 14px;
  padding-bottom: 12px;
}

.user-filter-panel :deep(.filter-panel__header h3) {
  font-size: 15px;
}

.user-filter-panel :deep(.filter-panel__header p) {
  margin-top: 4px;
  font-size: 12px;
}

.user-filter-panel :deep(.filter-panel__body) {
  gap: 12px;
}

.user-filter-panel :deep(.el-form--inline) {
  gap: 12px 14px;
}

.user-filter-panel :deep(.el-form--inline .el-form-item) {
  gap: 10px;
}

.user-filter-panel :deep(.el-form-item__label) {
  min-height: 40px;
  font-size: 11px;
}

.user-filter-panel :deep(.el-form-item__content) {
  min-width: 164px;
}

.user-filter-panel :deep(.el-input__wrapper),
.user-filter-panel :deep(.el-select__wrapper),
.user-filter-panel :deep(.el-date-editor.el-input__wrapper) {
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
}

.user-filter-panel :deep(.filter-panel__actions .el-button) {
  min-height: 38px;
  padding-inline: 14px;
  border-radius: 12px;
}

.user-table-card :deep(.el-card__body) {
  padding-top: 20px;
  padding-bottom: 18px;
}

.user-table-card .table-header {
  margin-bottom: 12px;
  gap: 10px;
}

.user-table-card .table-header__hint {
  max-width: 360px;
  line-height: 1.55;
}

.user-table-card :deep(.el-table th.el-table__cell) {
  padding: 11px 0;
  font-size: 11px;
}

.user-table-card :deep(.el-table td.el-table__cell) {
  padding: 11px 0;
}

.user-table-card :deep(.el-table .cell) {
  line-height: 1.45;
}

.user-table-card :deep(.el-table .el-button.is-link),
.user-table-card :deep(.el-table .el-button--link) {
  font-size: 13px;
}

.user-table-card :deep(.el-table :is(th, td).el-table-fixed-column--right) {
  background: #fffbf5 !important;
}

.user-table-card :deep(.el-table__fixed-right-patch),
.user-table-card :deep(.el-table th.el-table-fixed-column--right) {
  background: #f8f3eb !important;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(140, 111, 79, 0.94), rgba(110, 80, 48, 0.94));
  color: #f7efe3;
  font-size: 13px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.user-cell__copy {
  display: grid;
  gap: 3px;
}

.user-cell__copy strong {
  font-size: 14px;
  line-height: 1.25;
}

.user-cell__copy span {
  color: rgba(47, 36, 27, 0.5);
  font-size: 11px;
}

.stack-cell {
  display: grid;
  gap: 3px;
}

.stack-cell strong {
  font-size: 14px;
  line-height: 1.25;
}

.stack-cell span {
  color: rgba(47, 36, 27, 0.5);
  font-size: 11px;
  line-height: 1.45;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.table-empty {
  display: grid;
  gap: 6px;
  place-items: center;
  padding: 26px 0;
  text-align: center;
}

.table-empty strong {
  font-size: 15px;
}

.table-empty p {
  margin: 0;
  color: rgba(47, 36, 27, 0.54);
  font-size: 13px;
}

@media (max-width: 1280px) {
  :deep(.user-overview.user-overview.user-overview) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .user-overview {
    grid-template-columns: 1fr;
  }

  .user-shell-card__toolbar {
    align-items: stretch;
  }

  .user-shell-card__actions,
  .user-shell-card__search {
    width: 100%;
  }
}
</style>
