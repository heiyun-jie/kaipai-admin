<template>
  <PageContainer>
    <section class="console-overview">
      <article class="console-overview-card console-overview-card--dark">
        <div class="console-overview-card__head">
          <p>RECRUIT / PROJECT</p>
          <span>LIVE</span>
        </div>
        <strong>{{ total }} 个项目</strong>
        <small>当前页回看剧组项目真实落库和状态处置。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>PROJECT FILTER</p>
          <span>FOCUS</span>
        </div>
        <strong>{{ filters.projectId ?? '全部项目' }}</strong>
        <small>按项目、剧组用户和城市快速定位招募主链。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>STATUS</p>
          <span>STATE</span>
        </div>
        <strong>{{ filters.status === 1 ? '进行中' : filters.status === 2 ? '已结束' : '全部状态' }}</strong>
        <small>项目状态沿当前治理模型执行。</small>
      </article>
    </section>

    <FilterPanel description="按项目 ID、剧组用户、状态和关键词筛选，优先验证真实剧组数据是否已切到后端。">
      <el-form :model="filters" inline>
        <el-form-item label="项目 ID">
          <el-input v-model.number="filters.projectId" placeholder="项目 ID" clearable />
        </el-form-item>
        <el-form-item label="剧组用户 ID">
          <el-input v-model.number="filters.crewUserId" placeholder="剧组用户 ID" clearable />
        </el-form-item>
        <el-form-item label="项目状态">
          <el-select v-model="filters.status" clearable style="width: 160px">
            <el-option label="进行中" :value="1" />
            <el-option label="已结束" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="filters.location" placeholder="拍摄城市" clearable />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="项目名 / 简介 / 剧组名" clearable />
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
          <p class="table-header__eyebrow">PROJECT FEED / 剧组项目</p>
          <h3>项目清单</h3>
        </div>
        <span class="table-header__hint">围绕当前项目、剧组、角色数和联系人信息回看真实招募项目，不扩展新的项目台账能力。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="projectId" label="项目 ID" min-width="120" />
        <el-table-column label="项目" min-width="280">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.title || '--' }}</strong>
              <span>{{ row.description || '未补简介' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="剧组" min-width="220">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.crewName || '--' }}</strong>
              <span>用户 {{ row.crewUserId ?? '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="recruitProjectStatusMap[row.status || 1] || recruitProjectStatusMap[1]" />
          </template>
        </el-table-column>
        <el-table-column prop="location" label="拍摄地" min-width="140" />
        <el-table-column prop="shootingDate" label="档期" min-width="140" />
        <el-table-column prop="roleCount" label="角色数" min-width="90" />
        <el-table-column label="联系人" min-width="180">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.contactName || '--' }}</strong>
              <span>{{ row.contactPhone || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column prop="sourceUpdatedAt" label="最近回写" min-width="180" />
        <el-table-column label="操作" fixed="right" min-width="260">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
              <PermissionButton
                v-if="row.status !== 1"
                link
                type="success"
                action="action.recruit.project.status"
                hide-if-denied
                @click="openProjectStatus(row, 1)"
              >
                恢复进行
              </PermissionButton>
              <PermissionButton
                v-if="row.status !== 2"
                link
                type="danger"
                action="action.recruit.project.status"
                hide-if-denied
                @click="openProjectStatus(row, 2)"
              >
                结束项目
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

    <AdminDetailDrawer v-model="detailVisible" title="项目详情" size="760px" destroy-on-close>
      <div v-if="detail" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>PROJECT DETAIL / 项目详情</p>
            <strong>{{ detail.title || '剧组项目详情' }}</strong>
            <span>{{ detail.crewName || '--' }} · 用户 {{ detail.crewUserId ?? '--' }}</span>
          </div>
          <StatusTag v-bind="recruitProjectStatusMap[detail.status || 1] || recruitProjectStatusMap[1]" />
        </section>

        <div class="detail-actions">
          <PermissionButton
            v-if="detail.status !== 1"
            type="success"
            action="action.recruit.project.status"
            hide-if-denied
            @click="openProjectStatus(detail, 1)"
          >
            恢复进行
          </PermissionButton>
          <PermissionButton
            v-if="detail.status !== 2"
            type="danger"
            action="action.recruit.project.status"
            hide-if-denied
            @click="openProjectStatus(detail, 2)"
          >
            结束项目
          </PermissionButton>
        </div>
        <DetailGrid>
          <DetailBlock v-for="item in detailBlocks" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </DetailBlock>
        </DetailGrid>
      </div>
    </AdminDetailDrawer>

    <AuditConfirmDialog
      v-model="projectStatusVisible"
      :title="projectStatusTarget === 2 ? '确认结束项目' : '确认恢复项目进行中'"
      :summary="projectStatusSummary"
      :confirm-text="projectStatusTarget === 2 ? '确认结束' : '确认恢复'"
      reason-label="处置备注"
      placeholder="请输入状态校准备注，可留空"
      action-code="action.recruit.project.status"
      :loading="projectStatusLoading"
      :meta="projectStatusMeta"
      @submit="submitProjectStatus"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchAdminRecruitProjects, updateAdminRecruitProjectStatus } from '@/api/recruit'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import AuditConfirmDialog from '@/components/dialogs/AuditConfirmDialog.vue'
import { recruitProjectStatusMap } from '@/constants/status'
import type { AdminRecruitProjectItem, AdminRecruitProjectQuery } from '@/types/recruit'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

const loading = ref(false)
const rows = ref<AdminRecruitProjectItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<AdminRecruitProjectItem | null>(null)
const projectStatusVisible = ref(false)
const projectStatusLoading = ref(false)
const currentProject = ref<AdminRecruitProjectItem | null>(null)
const projectStatusTarget = ref<1 | 2>(2)

const filters = reactive<AdminRecruitProjectQuery>({
  pageNo: 1,
  pageSize: 20,
  projectId: undefined,
  crewUserId: undefined,
  status: undefined,
  keyword: '',
  location: '',
})

const detailBlocks = computed(() => {
  if (!detail.value) {
    return []
  }
  return [
    { label: '项目 ID', value: detail.value.projectId ?? '--' },
    { label: '剧组用户 ID', value: detail.value.crewUserId ?? '--' },
    { label: '团队档案 ID', value: detail.value.crewProfileId ?? '--' },
    { label: '剧组名称', value: detail.value.crewName || '--' },
    { label: '项目名称', value: detail.value.title || '--' },
    { label: '项目状态', value: (recruitProjectStatusMap[detail.value.status || 1] || recruitProjectStatusMap[1]).label },
    { label: '项目类型', value: detail.value.type || '--' },
    { label: '拍摄地', value: detail.value.location || '--' },
    { label: '档期', value: detail.value.shootingDate || '--' },
    { label: '角色数', value: detail.value.roleCount ?? 0 },
    { label: '联系人', value: detail.value.contactName || '--' },
    { label: '联系电话', value: detail.value.contactPhone || '--' },
    { label: '项目简介', value: detail.value.description || '--' },
    { label: '源数据创建时间', value: detail.value.sourceCreatedAt || '--' },
    { label: '最近回写时间', value: detail.value.sourceUpdatedAt || '--' },
  ]
})

const projectStatusMeta = computed(() => [
  { label: '项目 ID', value: currentProject.value?.projectId },
  { label: '项目名称', value: currentProject.value?.title || '--' },
  {
    label: '当前状态',
    value: (recruitProjectStatusMap[currentProject.value?.status || 1] || recruitProjectStatusMap[1]).label,
  },
  {
    label: '目标状态',
    value: (recruitProjectStatusMap[projectStatusTarget.value] || recruitProjectStatusMap[1]).label,
  },
  { label: '角色数', value: currentProject.value?.roleCount ?? 0 },
])

const projectStatusSummary = computed(() =>
  projectStatusTarget.value === 2
    ? '结束项目会同步收口该项目下仍未结束的角色，避免演员端看到失效招募。'
    : '恢复进行只会回写项目状态，不会自动恢复该项目下已暂停或已结束的角色。',
)

async function loadList() {
  loading.value = true
  try {
    const result = await fetchAdminRecruitProjects(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function openDetail(row: AdminRecruitProjectItem) {
  detail.value = row
  detailVisible.value = true
}

function openProjectStatus(row: AdminRecruitProjectItem, targetStatus: 1 | 2) {
  currentProject.value = row
  projectStatusTarget.value = targetStatus
  projectStatusVisible.value = true
}

async function submitProjectStatus(reason: string) {
  if (!currentProject.value) {
    return
  }
  projectStatusLoading.value = true
  try {
    await updateAdminRecruitProjectStatus(currentProject.value.projectId, {
      status: projectStatusTarget.value,
      reason,
    })
    ElMessage.success(projectStatusTarget.value === 2 ? '项目已结束' : '项目已恢复为进行中')
    applyProjectStatusLocally(currentProject.value.projectId, projectStatusTarget.value)
    projectStatusVisible.value = false
    await loadList()
  } finally {
    projectStatusLoading.value = false
  }
}

function applyProjectStatusLocally(projectId: number, status: 1 | 2) {
  rows.value = rows.value.map((item) => (item.projectId === projectId ? { ...item, status } : item))
  if (detail.value?.projectId === projectId) {
    detail.value = {
      ...detail.value,
      status,
    }
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.projectId = undefined
  filters.crewUserId = undefined
  filters.status = undefined
  filters.keyword = ''
  filters.location = ''
  loadList()
}

onMounted(() => {
  loadList()
})
</script>

<style scoped lang="scss">
</style>
