<template>
  <header class="admin-topbar">
    <div class="admin-topbar__left" :data-mainline="isMainlinePage">
      <div class="admin-topbar__headline">
        <p>{{ currentEyebrow }}</p>
        <strong>{{ currentTitle }}</strong>
      </div>
      <span v-if="showSummary" class="admin-topbar__summary">{{ currentDescription }}</span>
    </div>

    <div class="admin-topbar__right">
      <label v-if="showSearchControl" class="admin-topbar__search">
        <el-icon><Search /></el-icon>
        <input
          v-model="searchKeyword"
          :placeholder="currentSearchPlaceholder"
          type="text"
          @keydown.enter.prevent="handleSearch"
        />
        <span class="admin-topbar__search-shortcut">⌘K</span>
      </label>

      <el-popover v-if="showWindowControl" placement="bottom-end" trigger="click" :width="320">
        <template #reference>
          <button class="admin-topbar__chip admin-topbar__chip--button" type="button">
            <el-icon><Calendar /></el-icon>
            <span>{{ currentWindowLabel }}</span>
            <el-icon><ArrowDown /></el-icon>
          </button>
        </template>

        <div class="admin-topbar__window-panel">
          <div class="admin-topbar__window-head">
            <strong>仪表盘窗口</strong>
            <span>当前窗口只作用于 dashboard 页面，不额外制造第二套事实链。</span>
          </div>

          <div class="admin-topbar__window-presets">
            <button
              v-for="preset in dashboardWindowPresets"
              :key="preset.label"
              type="button"
              class="admin-topbar__window-preset"
              @click="applyDashboardPreset(preset.days)"
            >
              {{ preset.label }}
            </button>
          </div>

          <el-date-picker
            v-model="dashboardWindowRange"
            type="datetimerange"
            unlink-panels
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />

          <div class="admin-topbar__window-actions">
            <button type="button" class="admin-topbar__window-clear" @click="clearDashboardWindow">清除窗口</button>
          </div>
        </div>
      </el-popover>

      <el-popover v-if="showNoticeControl" placement="bottom-end" trigger="click" :width="320">
        <template #reference>
          <button class="admin-topbar__icon-button" type="button">
            <el-badge :value="pendingSignalTotal" :hidden="pendingSignalTotal === 0" :max="99">
              <el-icon><Bell /></el-icon>
            </el-badge>
          </button>
        </template>

        <div class="admin-topbar__notice">
          <div class="admin-topbar__notice-head">
            <strong>当前治理动态</strong>
            <span>只使用真实 overview 待办聚合</span>
          </div>

          <div class="admin-topbar__notice-list">
            <button
              v-for="item in notificationItems"
              :key="item.label"
              type="button"
              class="admin-topbar__notice-item"
              @click="openNoticeRoute(item.route)"
            >
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.hint }}</span>
              </div>
              <em>{{ item.value }}</em>
            </button>
          </div>
        </div>
      </el-popover>

      <el-tooltip v-if="showExportControl" :content="exportTooltip">
        <span>
          <button class="admin-topbar__button" type="button" disabled>
            <el-icon><Download /></el-icon>
            <span>{{ exportButtonLabel }}</span>
          </button>
        </span>
      </el-tooltip>

      <template v-if="showMetaChips">
        <span class="admin-topbar__chip">{{ currentDateLabel }}</span>
        <span class="admin-topbar__chip admin-topbar__chip--status">
          <i />
          后台服务正常
        </span>
        <span class="admin-topbar__chip admin-topbar__chip--role">{{ currentRoleLabel }}</span>
      </template>
      <el-dropdown>
        <button
          class="admin-topbar__user"
          :data-compact="useCompactUserButton"
          type="button"
        >
          <el-avatar :size="32">{{ (authStore.session?.userName || 'A').slice(0, 1) }}</el-avatar>
          <div v-if="!useCompactUserButton" class="admin-topbar__user-copy">
            <strong>{{ authStore.session?.userName || '未登录' }}</strong>
            <span>{{ authStore.session?.account || 'guest' }}</span>
          </div>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowDown, Bell, Calendar, Download, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchDashboardOverview } from '@/api/dashboard'
import {
  getAdminInfoArchitectureDescription,
  getAdminInfoArchitectureEyebrow,
} from '@/constants/admin-information-architecture'
import { PERMISSIONS } from '@/constants/permission'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import type { DashboardOverview } from '@/types/dashboard'

type DateRangeValue = [string, string] | []

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const searchKeyword = ref('')
const topbarSignals = reactive<DashboardOverview>({
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

const currentTitle = computed(() => String(route.meta.title || '工作台'))
const currentRoleLabel = computed(() => authStore.session?.roleCodes?.join(' / ') || 'ADMIN')
const currentLayer = computed(() => String(route.meta.architectureLayer || ''))
const currentEyebrow = computed(() => getAdminInfoArchitectureEyebrow(route.path, currentLayer.value))
const currentDescription = computed(() => getAdminInfoArchitectureDescription(route.path))
const currentDateLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date()),
)
const isMainlinePage = computed(() => currentLayer.value === 'mainline')
const showSummary = computed(() => !isMainlinePage.value)
const showMetaChips = computed(() => !isMainlinePage.value)
const useCompactUserButton = computed(() => isMainlinePage.value)
const showSearchControl = computed(() => isMainlinePage.value)
const showWindowControl = computed(() => ['/dashboard/index', '/dashboard/analytics'].includes(route.path))
const showExportControl = computed(() => ['/dashboard/index', '/dashboard/analytics'].includes(route.path))
const dashboardWindowPresets = [
  { label: '近 7 天', days: 7 },
  { label: '近 30 天', days: 30 },
  { label: '近 90 天', days: 90 },
] as const
const currentSearchPlaceholder = computed(() => {
  if (route.path.startsWith('/dashboard')) {
    return '搜索用户 / 分享页 / 模板'
  }
  if (route.path.startsWith('/users/index')) {
    return '搜索用户 / 手机号 / 身份'
  }
  if (route.path.startsWith('/content')) {
    return '搜索内容 / 模板 / 分享卡'
  }
  if (route.path.startsWith('/operate')) {
    return '搜索动作 / 待办 / 治理入口'
  }
  if (route.path.startsWith('/system')) {
    return '搜索配置 / 角色 / 权限'
  }
  return '搜索页面 / 对象 / 记录'
})
const dashboardWindowRange = computed<DateRangeValue>({
  get: (): DateRangeValue => {
    const dateFrom = readQueryString(route.query.dateFrom)
    const dateTo = readQueryString(route.query.dateTo)
    return dateFrom && dateTo ? [dateFrom, dateTo] : []
  },
  set: (value: DateRangeValue) => {
    updateDashboardWindow(value)
  },
})
const currentWindowLabel = computed(() => {
  const range = dashboardWindowRange.value
  if (!range.length) {
    return route.path === '/dashboard/analytics' ? '分析窗口' : '默认窗口'
  }
  const diff = resolveWindowDiffDays(range[0], range[1])
  if (diff <= 7) {
    return '近 7 天'
  }
  if (diff <= 30) {
    return '近 30 天'
  }
  if (diff <= 90) {
    return '近 90 天'
  }
  return '自定义窗口'
})
const exportButtonLabel = computed(() => (route.path === '/dashboard/analytics' ? '导出分析' : '导出报表'))
const exportTooltip = computed(() => '当前没有稳定导出事实源，请先使用页面内真实筛选与治理入口。')
const notificationItems = computed(() => [
  {
    label: '实名认证待审',
    value: Number(topbarSignals.verifyPendingCount || 0),
    hint: '实名认证审核页承接',
    route: '/verify/pending',
    pagePermission: PERMISSIONS.page.verifyPending,
  },
  {
    label: '异常邀请',
    value: Number(topbarSignals.referralRiskPendingCount || 0),
    hint: '邀请治理待复核',
    route: '/referral/risk',
    pagePermission: PERMISSIONS.page.referralRisk,
  },
  {
    label: '退款待审',
    value: Number(topbarSignals.refundPendingCount || 0),
    hint: '退款治理待处理',
    route: '/refund/orders',
    pagePermission: PERMISSIONS.page.refundOrders,
  },
  {
    label: '联系待处理',
    value: Number(topbarSignals.pendingContactRequestCount || 0),
    hint: '联系闭环待审批',
    route: '/content/contact-requests',
    pagePermission: PERMISSIONS.page.contentContactRequests,
  },
].filter((item) => permissionStore.hasPage(item.pagePermission)))
const pendingSignalTotal = computed(() =>
  notificationItems.value.reduce((sum, item) => sum + Number(item.value || 0), 0),
)
const showNoticeControl = computed(() => permissionStore.hasPage(PERMISSIONS.page.dashboardIndex) && notificationItems.value.length > 0)

watch(
  [() => route.path, () => authStore.permissionSet.join('|')],
  () => {
    if (authStore.isAuthed) {
      loadTopbarSignals()
    }
  },
  { immediate: true },
)

function logout() {
  authStore.logout()
  router.push('/login')
}

async function loadTopbarSignals() {
  if (!permissionStore.hasPage(PERMISSIONS.page.dashboardIndex) || notificationItems.value.length === 0) {
    resetTopbarSignals()
    return
  }

  try {
    const data = await fetchDashboardOverview()
    topbarSignals.verifyPendingCount = data.verifyPendingCount
    topbarSignals.referralRiskPendingCount = data.referralRiskPendingCount
    topbarSignals.refundPendingCount = data.refundPendingCount
    topbarSignals.pendingContactRequestCount = data.pendingContactRequestCount
  } catch (error) {
    ElMessage.warning((error as Error).message || '顶部治理动态加载失败')
  }
}

function resetTopbarSignals() {
  topbarSignals.verifyPendingCount = null
  topbarSignals.referralRiskPendingCount = null
  topbarSignals.refundPendingCount = null
  topbarSignals.pendingContactRequestCount = null
}

function handleSearch() {
  ElMessage.info('当前全局搜索事实源未接通，请直接使用当前页面的筛选区排查。')
}

function readQueryString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0] ? value[0] : undefined
  }
  return typeof value === 'string' && value ? value : undefined
}

function resolveWindowDiffDays(dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom).getTime()
  const to = new Date(dateTo).getTime()
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) {
    return Number.POSITIVE_INFINITY
  }
  return Math.ceil((to - from) / (24 * 60 * 60 * 1000))
}

function formatDateTimeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

function updateDashboardWindow(value: DateRangeValue) {
  const nextQuery = {
    ...route.query,
  } as Record<string, string>

  delete nextQuery.dateFrom
  delete nextQuery.dateTo

  if (Array.isArray(value) && value.length === 2) {
    nextQuery.dateFrom = value[0]
    nextQuery.dateTo = value[1]
  }

  router.replace({
    path: route.path,
    query: nextQuery,
  })
}

function applyDashboardPreset(days: number) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 0)
  updateDashboardWindow([formatDateTimeValue(start), formatDateTimeValue(end)])
}

function clearDashboardWindow() {
  updateDashboardWindow([])
}

function openNoticeRoute(path: string) {
  const item = notificationItems.value.find((candidate) => candidate.route === path)
  if (!item || !permissionStore.hasPage(item.pagePermission)) {
    ElMessage.warning('当前账号没有目标页面权限')
    return
  }
  router.push(path)
}
</script>

<style scoped lang="scss">
.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 0 14px 20px;
}

.admin-topbar__left {
  display: flex;
  align-items: end;
  flex: 1 1 auto;
  gap: 16px;
  min-width: 0;
}

.admin-topbar__left[data-mainline='true'] {
  align-items: center;
}

.admin-topbar__headline {
  display: grid;
  gap: 4px;
  min-width: 0;

  p {
    margin: 0;
    color: rgba(47, 36, 27, 0.42);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.28em;
  }

  strong {
    font-size: 34px;
    font-weight: 600;
    letter-spacing: 0.04em;
    line-height: 1.04;
  }
}

.admin-topbar__left[data-mainline='true'] .admin-topbar__headline strong {
  font-size: 32px;
  white-space: nowrap;
}

.admin-topbar__summary {
  max-width: 520px;
  color: rgba(47, 36, 27, 0.56);
  font-size: 13px;
  line-height: 1.7;
}

.admin-topbar__right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: max-content;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: nowrap;
}

.admin-topbar__search {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 10px;
  width: clamp(240px, 19vw, 300px);
  min-width: 0;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: rgba(47, 36, 27, 0.62);
}

.admin-topbar__search :deep(.el-icon) {
  font-size: 15px;
}

.admin-topbar__search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: #221f1c;
  font-size: 12px;
  outline: none;
}

.admin-topbar__search input::placeholder {
  color: rgba(47, 36, 27, 0.4);
}

.admin-topbar__search-shortcut {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(34, 31, 28, 0.06);
  color: rgba(47, 36, 27, 0.46);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.admin-topbar__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: rgba(47, 36, 27, 0.66);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.admin-topbar__chip--button,
.admin-topbar__icon-button,
.admin-topbar__button {
  cursor: pointer;
}

.admin-topbar__chip--button {
  min-height: 40px;
}

.admin-topbar__chip--status {
  color: #2f7d57;

  i {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: currentColor;
    box-shadow: 0 0 0 4px rgba(47, 125, 87, 0.1);
  }
}

.admin-topbar__chip--role {
  background: rgba(34, 31, 28, 0.94);
  color: #f6efe6;
}

.admin-topbar__icon-button,
.admin-topbar__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: rgba(47, 36, 27, 0.72);
}

.admin-topbar__icon-button {
  min-width: 40px;
  padding-inline: 12px;
}

.admin-topbar__button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.admin-topbar__notice {
  display: grid;
  gap: 14px;
}

.admin-topbar__notice-head {
  display: grid;
  gap: 4px;
}

.admin-topbar__notice-head strong {
  font-size: 14px;
}

.admin-topbar__notice-head span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
  line-height: 1.6;
}

.admin-topbar__notice-list {
  display: grid;
  gap: 8px;
}

.admin-topbar__notice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(34, 31, 28, 0.06);
  border-radius: 16px;
  background: rgba(246, 241, 233, 0.66);
  text-align: left;
  cursor: pointer;
}

.admin-topbar__notice-item div {
  display: grid;
  gap: 4px;
}

.admin-topbar__notice-item strong {
  font-size: 13px;
}

.admin-topbar__notice-item span {
  color: rgba(47, 36, 27, 0.5);
  font-size: 12px;
}

.admin-topbar__notice-item em {
  color: #221f1c;
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
}

.admin-topbar__window-panel {
  display: grid;
  gap: 12px;
}

.admin-topbar__window-head {
  display: grid;
  gap: 4px;
}

.admin-topbar__window-head strong {
  font-size: 14px;
}

.admin-topbar__window-head span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
  line-height: 1.6;
}

.admin-topbar__window-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-topbar__window-preset,
.admin-topbar__window-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: rgba(47, 36, 27, 0.72);
  cursor: pointer;
}

.admin-topbar__window-actions {
  display: flex;
  justify-content: flex-end;
}

.admin-topbar__user {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 10px;
  padding: 4px 6px 4px 4px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  cursor: pointer;
}

.admin-topbar__user[data-compact='true'] {
  justify-content: center;
  width: 40px;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
}

.admin-topbar__user-copy {
  display: grid;
  text-align: left;

  strong {
    font-size: 12px;
  }

  span {
    color: rgba(47, 36, 27, 0.48);
    font-size: 11px;
  }
}

@media (max-width: 1200px) {
  .admin-topbar__right {
    min-width: 0;
    flex-wrap: wrap;
  }

  .admin-topbar__search {
    width: min(280px, 100%);
  }

  .admin-topbar__left[data-mainline='true'] .admin-topbar__headline strong {
    white-space: normal;
  }
}

@media (max-width: 900px) {
  .admin-topbar {
    display: grid;
    padding: 16px 0 12px;
  }

  .admin-topbar__left {
    display: grid;
  }

  .admin-topbar__right {
    justify-content: flex-start;
  }

  .admin-topbar__search {
    width: 100%;
  }

  .admin-topbar__headline strong {
    font-size: 28px;
  }
}
</style>
