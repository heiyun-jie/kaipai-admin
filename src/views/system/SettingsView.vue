<template>
  <PageContainer>
    <section class="settings-groups">
      <el-card class="table-card settings-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">PLATFORM INFO / 平台信息</p>
            <h3>平台信息</h3>
          </div>
          <span class="table-header__hint">平台名、域名和客服联系按当前配置展示。</span>
        </div>

        <div class="settings-list">
          <article class="settings-item settings-item--static">
            <div class="settings-item__copy">
              <strong>平台名称</strong>
              <span>当前品牌壳层</span>
            </div>
            <div class="settings-item__value">{{ ADMIN_BRAND.platformName }}</div>
          </article>

          <article class="settings-item settings-item--static">
            <div class="settings-item__copy">
              <strong>平台域名</strong>
              <span>当前正式域名</span>
            </div>
            <div class="settings-item__value">{{ ADMIN_BRAND.domain }}</div>
          </article>

          <article class="settings-item settings-item--static">
            <div class="settings-item__copy">
              <strong>客服联系</strong>
              <span>正式配置</span>
            </div>
            <div class="settings-item__value settings-item__value--muted">未配置</div>
          </article>
        </div>
      </el-card>

      <el-card class="table-card settings-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">CONTENT REVIEW / 内容治理</p>
            <h3>内容审核</h3>
          </div>
          <span class="table-header__hint">聚合现有审核、模板和分享内容入口。</span>
        </div>

        <div class="settings-list">
              <button v-if="canReadVerifyPending" type="button" class="settings-item" @click="openRoute('/verify/pending')">
                <div class="settings-item__copy">
                  <strong>实名认证待审核</strong>
                  <span>治理工具入口</span>
                </div>
            <div class="settings-item__value">{{ canReadDashboardOverview ? (dashboardLoaded ? `${formatMetric(overview.verifyPendingCount)} 条` : '加载中') : '进入页面' }}</div>
              </button>

              <button v-if="canReadContactRequests" type="button" class="settings-item" @click="openRoute('/content/contact-requests')">
                <div class="settings-item__copy">
                  <strong>联系方式申请</strong>
                  <span>正式增长入口</span>
                </div>
            <div class="settings-item__value">{{ canReadDashboardOverview ? (dashboardLoaded ? `${formatMetric(overview.pendingContactRequestCount)} 条待处理` : '加载中') : '进入页面' }}</div>
              </button>

              <button v-if="canReadShareCards" type="button" class="settings-item" @click="openRoute('/content/share-cards')">
                <div class="settings-item__copy">
                  <strong>分享内容</strong>
                  <span>正式增长入口</span>
                </div>
            <div class="settings-item__value">{{ shareCardLoaded ? `${shareCardTotal} 条内容` : '加载中' }}</div>
              </button>

              <button v-if="canReadTemplates" type="button" class="settings-item" @click="openRoute('/content/templates')">
                <div class="settings-item__copy">
                  <strong>风格模板</strong>
                  <span>正式运营入口</span>
                </div>
            <div class="settings-item__value">{{ templateLoaded ? `${templateTotal} 套模板` : '加载中' }}</div>
              </button>
        </div>
      </el-card>

      <el-card class="table-card settings-card" shadow="never">
        <div class="table-header">
          <div>
            <p class="table-header__eyebrow">ACCESS CONTROL / 权限治理</p>
            <h3>权限管理</h3>
          </div>
          <span class="table-header__hint">聚合账号、角色、审计和 AI 治理入口。</span>
        </div>

        <div class="settings-list">
              <button v-if="canReadAdminUsers" type="button" class="settings-item" @click="openRoute('/system/admin-users')">
                <div class="settings-item__copy">
                  <strong>后台账号治理</strong>
                  <span>治理工具入口</span>
                </div>
            <div class="settings-item__value">{{ adminUserLoaded ? `${adminUserTotal} 个账号` : '加载中' }}</div>
              </button>

              <button v-if="canReadRoles" type="button" class="settings-item" @click="openRoute('/system/roles')">
                <div class="settings-item__copy">
                  <strong>角色权限治理</strong>
                  <span>治理工具入口</span>
                </div>
            <div class="settings-item__value">{{ adminRoleLoaded ? `${adminRoleTotal} 个角色` : '加载中' }}</div>
              </button>

              <button v-if="canReadOperationLogs" type="button" class="settings-item" @click="openRoute('/system/operation-logs')">
                <div class="settings-item__copy">
                  <strong>操作留痕审计</strong>
                  <span>治理工具入口</span>
                </div>
            <div class="settings-item__value">{{ operationLogLabel }}</div>
              </button>

          <button v-if="canReadAiGovernance" type="button" class="settings-item" @click="openRoute('/system/ai-resume-governance')">
            <div class="settings-item__copy">
              <strong>AI 简历治理</strong>
              <span>治理工具入口</span>
            </div>
            <div class="settings-item__value">{{ aiGovernancePendingLabel }}</div>
          </button>

          <button v-if="canOpenAiImageProviderEntry" type="button" class="settings-item" @click="openRoute('/system/ai-image-providers')">
            <div class="settings-item__copy">
              <strong>AI 生图模型配置</strong>
              <span>模型、密钥和主 provider 切换</span>
            </div>
            <div class="settings-item__value">{{ canReadAiImageProviders ? '进入页面' : '待授权' }}</div>
          </button>
        </div>
      </el-card>
    </section>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchContentShareCards, fetchTemplates } from '@/api/content'
import { fetchDashboardOverview } from '@/api/dashboard'
import { fetchAdminOperationLogs, fetchAdminRoleAiGovernanceMatrix, fetchAdminRoles, fetchAdminUsers } from '@/api/system'
import PageContainer from '@/components/business/PageContainer.vue'
import { ADMIN_BRAND } from '@/constants/brand'
import { PERMISSIONS } from '@/constants/permission'
import { usePermissionStore } from '@/stores/permission'
import type { DashboardOverview } from '@/types/dashboard'

const router = useRouter()
const permissionStore = usePermissionStore()

const canReadDashboardOverview = computed(() => permissionStore.hasPage(PERMISSIONS.page.dashboardIndex))
const canReadVerifyPending = computed(() => permissionStore.hasPage(PERMISSIONS.page.verifyPending))
const canReadContactRequests = computed(() => permissionStore.hasPage(PERMISSIONS.page.contentContactRequests))
const canReadTemplates = computed(() => permissionStore.hasPage(PERMISSIONS.page.contentTemplates))
const canReadShareCards = computed(() => permissionStore.hasPage(PERMISSIONS.page.contentShareCards))
const canReadAdminUsers = computed(() => permissionStore.hasPage(PERMISSIONS.page.systemAdminUsers))
const canReadRoles = computed(() => permissionStore.hasPage(PERMISSIONS.page.systemRoles))
const canReadOperationLogs = computed(() => permissionStore.hasPage(PERMISSIONS.page.systemOperationLogs))
const canReadAiGovernance = computed(() => permissionStore.hasPage(PERMISSIONS.page.systemAiResumeGovernance))
const canReadAiImageProviders = computed(() => permissionStore.hasPage(PERMISSIONS.page.systemAiImageProviders))
const canOpenAiImageProviderEntry = computed(() => canReadAiImageProviders.value || canReadRoles.value)

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

const templateTotal = ref(0)
const shareCardTotal = ref(0)
const adminUserTotal = ref(0)
const adminRoleTotal = ref(0)
const operationLogTotal = ref(0)
const aiOperationLogsPermissionGapRoleCount = ref<number | null>(null)
const dashboardLoaded = ref(false)
const templateLoaded = ref(false)
const shareCardLoaded = ref(false)
const adminUserLoaded = ref(false)
const adminRoleLoaded = ref(false)
const operationLogLoaded = ref(false)
const operationLogError = ref(false)
const aiMatrixLoaded = ref(false)

const aiGovernancePendingLabel = computed(() => {
  if (!aiMatrixLoaded.value) {
    return '加载中'
  }
  if (aiOperationLogsPermissionGapRoleCount.value == null) {
    return '入口已接通'
  }
  return aiOperationLogsPermissionGapRoleCount.value > 0 ? `${aiOperationLogsPermissionGapRoleCount.value} 个权限缺口角色` : '角色已收口'
})

const operationLogLabel = computed(() => {
  if (operationLogLoaded.value) {
    return `${operationLogTotal.value} 条记录`
  }
  return operationLogError.value ? '加载失败' : '正在核对'
})

function formatMetric(value?: number | null) {
  return value ?? '--'
}

function openRoute(path: string) {
  router.push(path)
}

async function loadSettingsOverview() {
  operationLogError.value = false
  if (canReadDashboardOverview.value) {
    const overviewResult = await fetchDashboardOverview()
    dashboardLoaded.value = true
    overview.verifyPendingCount = overviewResult.verifyPendingCount
    overview.referralRiskPendingCount = overviewResult.referralRiskPendingCount
    overview.refundPendingCount = overviewResult.refundPendingCount
    overview.todayPaymentOrderCount = overviewResult.todayPaymentOrderCount
    overview.activeShareCardCount = overviewResult.activeShareCardCount
    overview.activeShareOwnerCount = overviewResult.activeShareOwnerCount
    overview.shareViewCount = overviewResult.shareViewCount
    overview.uniqueViewerCount = overviewResult.uniqueViewerCount
    overview.approvedContactRequestCount = overviewResult.approvedContactRequestCount
    overview.pendingContactRequestCount = overviewResult.pendingContactRequestCount
    overview.convertedViewerCount = overviewResult.convertedViewerCount
    overview.classicSceneViewCount = overviewResult.classicSceneViewCount
    overview.urbanSceneViewCount = overviewResult.urbanSceneViewCount
    overview.costumeSceneViewCount = overviewResult.costumeSceneViewCount
    overview.recentItems = overviewResult.recentItems || []
  }

  if (canReadTemplates.value) {
    const templateResult = await fetchTemplates({ pageNo: 1, pageSize: 1, templateSceneCode: '', tier: '', status: undefined })
    templateLoaded.value = true
    templateTotal.value = Number(templateResult.total || 0)
  }

  if (canReadShareCards.value) {
    const shareCardResult = await fetchContentShareCards({ pageNo: 1, pageSize: 1, shareCardId: undefined, holderUserId: undefined, templateSceneCode: '', shareStatus: '', defaultCard: undefined })
    shareCardLoaded.value = true
    shareCardTotal.value = Number(shareCardResult.total || 0)
  }

  if (canReadAdminUsers.value) {
    const adminUserResult = await fetchAdminUsers({ pageNo: 1, pageSize: 1, account: '', userName: '', phone: '', status: undefined, roleCode: '' })
    adminUserLoaded.value = true
    adminUserTotal.value = Number(adminUserResult.total || 0)
  }

  if (canReadRoles.value) {
    const adminRoleResult = await fetchAdminRoles({ pageNo: 1, pageSize: 1, roleCode: '', roleName: '', status: undefined })
    adminRoleLoaded.value = true
    adminRoleTotal.value = Number(adminRoleResult.total || 0)
  }

  if (canReadOperationLogs.value) {
    const operationLogResult = await fetchAdminOperationLogs({ pageNo: 1, pageSize: 1, adminUserId: undefined, moduleCode: '', operationCode: '', targetType: '', requestId: '', result: undefined, dateFrom: '', dateTo: '' })
    operationLogLoaded.value = true
    operationLogError.value = false
    operationLogTotal.value = Number(operationLogResult.total || 0)
  }

  if (canReadAiGovernance.value) {
    const aiMatrixResult = await fetchAdminRoleAiGovernanceMatrix()
    aiMatrixLoaded.value = true
    aiOperationLogsPermissionGapRoleCount.value = Number(aiMatrixResult.operationLogsPermissionGapRoleCount || 0)
  }
}

onMounted(loadSettingsOverview)
</script>

<style scoped lang="scss">
.settings-groups {
  display: grid;
  gap: 12px;
  max-width: 646px;
}

.settings-card :deep(.el-card__body) {
  padding-top: 14px;
  padding-bottom: 8px;
}

.settings-card .table-header {
  display: grid;
  gap: 4px;
  margin-bottom: 6px;
}

.settings-card .table-header__eyebrow {
  font-size: 9px;
}

.settings-card .table-header h3 {
  font-size: 16px;
}

.settings-card .table-header__hint {
  max-width: none;
  font-size: 10px;
  line-height: 1.35;
}

.settings-list {
  display: grid;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 52px;
  padding: 10px 0;
  border: none;
  border-bottom: 1px solid rgba(80, 63, 47, 0.08);
  background: transparent;
  text-align: left;
  cursor: pointer;
  position: relative;
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-item::after {
  content: '>';
  margin-left: 10px;
  color: rgba(47, 36, 27, 0.28);
  font-size: 14px;
  font-weight: 700;
}

.settings-item--static {
  cursor: default;
}

.settings-item--static::after {
  content: '';
}

.settings-item__copy {
  display: grid;
  gap: 3px;
}

.settings-item__copy strong {
  font-size: 14px;
  font-weight: 600;
}

.settings-item__copy span {
  color: rgba(47, 36, 27, 0.5);
  font-size: 10px;
  line-height: 1.3;
}

.settings-item__value {
  color: rgba(47, 36, 27, 0.82);
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.settings-item__value--muted {
  color: rgba(47, 36, 27, 0.48);
}

@media (max-width: 960px) {
  .settings-groups {
    max-width: none;
  }

  .settings-item {
    display: grid;
    justify-items: start;
  }
}
</style>
