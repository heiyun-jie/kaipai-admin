<template>
  <PageContainer>
    <section class="console-overview">
      <article class="console-overview-card console-overview-card--dark">
        <div class="console-overview-card__head">
          <p>RECRUIT / APPLY</p>
          <span>LINK</span>
        </div>
        <strong>{{ total }} 条投递</strong>
        <small>聚焦投递与角色、项目、剧组的真实串联结果，不派生新的投递能力。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>APPLY FILTER</p>
          <span>FOCUS</span>
        </div>
        <strong>{{ filters.applyId ?? '全部投递' }}</strong>
        <small>按投递、角色、演员和剧组定位当前招募主链的具体节点。</small>
      </article>
      <article class="console-overview-card">
        <div class="console-overview-card__head">
          <p>STATUS</p>
          <span>STATE</span>
        </div>
        <strong>{{ filters.status === 1 ? '待处理' : filters.status === 2 ? '已通过' : filters.status === 3 ? '已拒绝' : filters.status === 4 ? '已取消' : '全部状态' }}</strong>
        <small>投递状态沿当前模型展示。</small>
      </article>
    </section>

    <FilterPanel description="按投递、角色、演员和剧组筛选，便于核对 `apply -> role -> project -> crew` 的真实串联。">
      <el-form :model="filters" inline>
        <el-form-item label="投递 ID">
          <el-input v-model.number="filters.applyId" placeholder="投递 ID" clearable />
        </el-form-item>
        <el-form-item label="角色 ID">
          <el-input v-model.number="filters.roleId" placeholder="角色 ID" clearable />
        </el-form-item>
        <el-form-item label="演员用户 ID">
          <el-input v-model.number="filters.actorUserId" placeholder="演员用户 ID" clearable />
        </el-form-item>
        <el-form-item label="剧组用户 ID">
          <el-input v-model.number="filters.crewUserId" placeholder="剧组用户 ID" clearable />
        </el-form-item>
        <el-form-item label="投递状态">
          <el-select v-model="filters.status" clearable style="width: 160px">
            <el-option label="待处理" :value="1" />
            <el-option label="已通过" :value="2" />
            <el-option label="已拒绝" :value="3" />
            <el-option label="已取消" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="演员 / 角色 / 项目 / 剧组" clearable />
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
          <p class="table-header__eyebrow">APPLY FEED / 投递链路</p>
          <h3>投递清单</h3>
        </div>
        <span class="table-header__hint">当前页只回看投递与角色、项目、剧组的链路关系，不扩展新的处理动作。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="applyId" label="投递 ID" min-width="120" />
        <el-table-column label="演员" min-width="220">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.actorName || '--' }}</strong>
              <span>用户 {{ row.actorUserId ?? '--' }} / {{ row.actorPhone || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="角色 / 项目" min-width="240">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.roleName || '--' }}</strong>
              <span>{{ row.projectTitle || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="剧组" min-width="220">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.crewName || '--' }}</strong>
              <span>剧组用户 {{ row.crewUserId ?? '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="投递状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="recruitApplyStatusMap[row.status || 1] || recruitApplyStatusMap[1]" />
          </template>
        </el-table-column>
        <el-table-column label="角色状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="recruitRoleStatusMap[row.roleStatus || 'paused'] || recruitRoleStatusMap.paused" />
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="投递时间" min-width="180" />
        <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" min-width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
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

    <AdminDetailDrawer v-model="detailVisible" title="投递详情" size="760px" destroy-on-close>
      <div v-if="detail" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>APPLY DETAIL / 投递详情</p>
            <strong>{{ detail.roleName || '投递详情' }}</strong>
            <span>{{ detail.actorName || '--' }} · {{ detail.projectTitle || '--' }}</span>
          </div>
          <StatusTag v-bind="recruitApplyStatusMap[detail.status || 1] || recruitApplyStatusMap[1]" />
        </section>
        <DetailGrid>
          <DetailBlock v-for="item in detailBlocks" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </DetailBlock>
        </DetailGrid>
      </div>
    </AdminDetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchAdminRecruitApplies } from '@/api/recruit'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { recruitApplyStatusMap, recruitRoleStatusMap } from '@/constants/status'
import type { AdminRecruitApplyItem, AdminRecruitApplyQuery } from '@/types/recruit'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

const loading = ref(false)
const rows = ref<AdminRecruitApplyItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<AdminRecruitApplyItem | null>(null)

const filters = reactive<AdminRecruitApplyQuery>({
  pageNo: 1,
  pageSize: 20,
  applyId: undefined,
  roleId: undefined,
  actorUserId: undefined,
  crewUserId: undefined,
  status: undefined,
  keyword: '',
})

const detailBlocks = computed(() => {
  if (!detail.value) {
    return []
  }
  return [
    { label: '投递 ID', value: detail.value.applyId ?? '--' },
    { label: '角色 ID', value: detail.value.roleId ?? '--' },
    { label: '项目 ID', value: detail.value.projectId ?? '--' },
    { label: '角色名称', value: detail.value.roleName || '--' },
    { label: '项目名称', value: detail.value.projectTitle || '--' },
    { label: '剧组名称', value: detail.value.crewName || '--' },
    { label: '剧组用户 ID', value: detail.value.crewUserId ?? '--' },
    { label: '演员名称', value: detail.value.actorName || '--' },
    { label: '演员用户 ID', value: detail.value.actorUserId ?? '--' },
    { label: '演员手机号', value: detail.value.actorPhone || '--' },
    { label: '投递状态', value: (recruitApplyStatusMap[detail.value.status || 1] || recruitApplyStatusMap[1]).label },
    { label: '角色状态', value: (recruitRoleStatusMap[detail.value.roleStatus || 'paused'] || recruitRoleStatusMap.paused).label },
    { label: '投递时间', value: detail.value.applyTime || '--' },
    { label: '投递备注', value: detail.value.remark || '--' },
  ]
})

async function loadList() {
  loading.value = true
  try {
    const result = await fetchAdminRecruitApplies(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function openDetail(row: AdminRecruitApplyItem) {
  detail.value = row
  detailVisible.value = true
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.applyId = undefined
  filters.roleId = undefined
  filters.actorUserId = undefined
  filters.crewUserId = undefined
  filters.status = undefined
  filters.keyword = ''
  loadList()
}

onMounted(loadList)
</script>

<style scoped lang="scss">
</style>
