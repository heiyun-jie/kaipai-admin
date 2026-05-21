<template>
  <PageContainer>
    <template #actions>
      <PermissionButton action="action.system.role.create" type="primary" @click="openCreateDialog">
        新建角色
      </PermissionButton>
    </template>

    <el-card class="table-card roles-shell-card" shadow="never">
      <div class="roles-shell-card__stats">
        <article class="roles-shell-pill roles-shell-pill--dark">
          <span>角色总数</span>
          <strong>{{ total }}</strong>
        </article>
        <article class="roles-shell-pill">
          <span>当前筛选</span>
          <strong>{{ filters.roleCode || filters.roleName || '全部角色' }}</strong>
        </article>
        <article class="roles-shell-pill">
          <span>当前状态</span>
          <strong>{{ filters.status === 1 ? '启用中' : filters.status === 2 ? '已禁用' : '全部状态' }}</strong>
        </article>
      </div>
      <p class="roles-shell-card__note">当前页只承接后台角色、AI 授权收口与招募治理授权，不扩展新的角色体系。</p>
    </el-card>

    <FilterPanel class="roles-filter-panel" description="按角色编码、名称和状态筛选角色，便于权限治理与排查。">
      <el-form :model="filters" inline>
        <el-form-item label="角色编码">
          <el-input v-model="filters.roleCode" placeholder="角色编码" clearable />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="filters.roleName" placeholder="角色名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable style="width: 160px">
            <el-option label="启用中" :value="1" />
            <el-option label="已禁用" :value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadRoles">查询</el-button>
      </template>
    </FilterPanel>

    <el-card class="table-card roles-ai-matrix-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <h3>AI 授权收口矩阵</h3>
            <p>回看各角色的 AI 页面与动作权限覆盖情况，以及当前授权缺口。</p>
          </div>
          <StatusTag v-bind="roleMatrixStatusTag" />
        </div>
      </template>

      <div class="matrix-summary">
        <div v-for="item in matrixSummaryCards" :key="item.label" class="summary-block">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.description }}</small>
        </div>
      </div>

      <el-alert
        :type="roleMatrix?.operationLogsPermissionGapCleared ? 'success' : 'warning'"
        :title="roleMatrix?.operationLogsPermissionGapCleared ? '启用角色已完成 AI 权限收口' : '仍有启用角色存在 AI 权限缺口'"
        :description="roleMatrixAlertText"
        :closable="false"
        show-icon
      />

      <el-table class="matrix-table roles-ai-matrix-table" :data="roleMatrixRows" v-loading="matrixLoading" empty-text="暂无 AI 授权矩阵数据">
        <el-table-column label="角色" min-width="220">
          <template #default="{ row }">
            <StackCell :title="row.roleName" :subtitle="row.roleCode" />
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="adminRoleStatusMap[row.status] || resolveRoleStatus(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="治理状态" min-width="150">
          <template #default="{ row }">
            <StatusTag v-bind="getAiGovernanceStageMeta(row.permissionStage)" />
          </template>
        </el-table-column>
        <el-table-column prop="boundUserCount" label="绑定账号" min-width="110" />
        <el-table-column label="权限覆盖" min-width="340">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag :type="row.hasAiGovernancePage ? 'success' : 'info'" effect="plain">AI 治理页</el-tag>
              <el-tag :type="row.hasAiReviewAction ? 'success' : 'info'" effect="plain">人工复核</el-tag>
              <el-tag :type="row.hasAiResolveAction ? 'success' : 'info'" effect="plain">建议重试</el-tag>
              <el-tag :type="row.hasOperationLogsPage ? 'warning' : 'info'" effect="plain">操作日志页</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权限缺口" min-width="280">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="item in row.missingPermissions" :key="item" type="warning" effect="plain">
                {{ getPermissionDisplayText(item) }}
              </el-tag>
              <span v-if="!row.missingPermissions?.length" class="muted">已齐备</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="170">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.adminRoleId)">查看详情</el-button>
              <PermissionButton link action="action.system.role.edit" @click="openEditFromMatrix(row.adminRoleId)">
                编辑授权
              </PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="table-card roles-recruit-matrix-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <h3>招募治理授权矩阵</h3>
            <p>回看各角色的招募页面与动作权限覆盖情况，以及当前授权缺口。</p>
          </div>
          <StatusTag v-bind="recruitMatrixStatusTag" />
        </div>
      </template>

      <div class="matrix-summary">
        <div v-for="item in recruitMatrixSummaryCards" :key="item.label" class="summary-block">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.description }}</small>
        </div>
      </div>

      <el-alert
        :type="recruitRoleMatrix?.recruitPermissionGapCleared ? 'success' : 'warning'"
        :title="recruitRoleMatrix?.recruitPermissionGapCleared ? '启用角色已完成招募权限收口' : '仍有启用角色存在招募权限缺口'"
        :description="recruitMatrixAlertText"
        :closable="false"
        show-icon
      />

      <el-table
        class="matrix-table roles-recruit-matrix-table"
        :data="recruitMatrixRows"
        v-loading="recruitMatrixLoading"
        empty-text="暂无招募授权矩阵数据"
      >
        <el-table-column label="角色" min-width="220">
          <template #default="{ row }">
            <StackCell :title="row.roleName" :subtitle="row.roleCode" />
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="adminRoleStatusMap[row.status] || resolveRoleStatus(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="治理状态" min-width="150">
          <template #default="{ row }">
            <StatusTag v-bind="getRecruitGovernanceStageMeta(row.permissionStage)" />
          </template>
        </el-table-column>
        <el-table-column prop="boundUserCount" label="绑定账号" min-width="110" />
        <el-table-column label="权限覆盖" min-width="420">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag :type="row.hasRecruitProjectsPage ? 'success' : 'info'" effect="plain">项目页</el-tag>
              <el-tag :type="row.hasRecruitRolesPage ? 'success' : 'info'" effect="plain">角色页</el-tag>
              <el-tag :type="row.hasRecruitAppliesPage ? 'success' : 'info'" effect="plain">投递页</el-tag>
              <el-tag :type="row.hasRecruitProjectStatusAction ? 'success' : 'info'" effect="plain">项目处置</el-tag>
              <el-tag :type="row.hasRecruitRoleStatusAction ? 'success' : 'info'" effect="plain">角色处置</el-tag>
              <el-tag :type="row.hasAdminUsersPage ? 'warning' : 'info'" effect="plain">后台账号页</el-tag>
              <el-tag v-if="hasRecruitPagePermissionGap(row)" type="warning" effect="plain">页面授权缺口</el-tag>
              <el-tag v-if="hasRecruitActionPermissionGap(row)" type="warning" effect="plain">动作授权缺口</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权限缺口" min-width="320">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="item in row.missingPermissions" :key="item" type="warning" effect="plain">
                {{ getRecruitMatrixPermissionDisplayText(item) }}
              </el-tag>
              <span v-if="!row.missingPermissions?.length" class="muted">已齐备</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="170">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.adminRoleId)">查看详情</el-button>
              <PermissionButton link action="action.system.role.edit" @click="openEditFromMatrix(row.adminRoleId)">
                编辑授权
              </PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="table-card roles-directory-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">ROLE DIRECTORY / 角色目录</p>
          <h3>角色清单</h3>
        </div>
        <span class="table-header__hint">统一回看角色编码、权限概览和状态，不在这里引入新的扩展能力。</span>
      </div>
      <el-table class="roles-directory-table" :data="rows" v-loading="loading">
        <el-table-column prop="adminRoleId" label="角色 ID" min-width="100" />
        <el-table-column prop="roleCode" label="角色编码" min-width="160" />
        <el-table-column prop="roleName" label="角色名称" min-width="160" />
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <StatusTag v-bind="adminRoleStatusMap[row.status] || resolveRoleStatus(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="权限概览" min-width="220">
          <template #default="{ row }">
            <StackCell
              :title="`菜单 ${row.menuPermissions?.length || 0} / 页面 ${row.pagePermissions?.length || 0}`"
              :subtitle="`操作 ${row.actionPermissions?.length || 0}`"
            />
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.lastUpdate || row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="252">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.adminRoleId)">查看详情</el-button>
              <PermissionButton link action="action.system.role.edit" @click="openEditDialog(row)">编辑</PermissionButton>
              <PermissionButton link action="action.system.role.copy" @click="openCopyDialog(row)">复制</PermissionButton>
              <PermissionButton
                v-if="row.status === 1"
                link
                type="danger"
                action="action.system.role.disable"
                @click="openStatusDialog('disable', row)"
              >
                禁用
              </PermissionButton>
              <PermissionButton
                v-else
                link
                type="success"
                action="action.system.role.enable"
                @click="openStatusDialog('enable', row)"
              >
                启用
              </PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager roles-directory-pager">
        <AdminPager
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[20, 50, 100]"
          :total="total"
          @current-change="loadRoles"
          @size-change="loadRoles"
        />
      </div>
    </el-card>

    <AdminDetailDrawer v-model="detailVisible" title="角色详情" size="760px" destroy-on-close class="roles-detail-drawer">
      <div v-if="detail" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>ROLE DETAIL / 角色详情</p>
            <strong>{{ detail.roleName || '角色详情' }}</strong>
            <span>{{ detail.roleCode || '--' }} · {{ detail.createUserName || '--' }}</span>
          </div>
          <StatusTag v-bind="adminRoleStatusMap[detail.status] || resolveRoleStatus(detail.status)" />
        </section>

        <DetailGrid :items="detailBlocks" />

        <div class="permission-grid">
          <el-card class="detail-card" shadow="never">
            <template #header><h3>菜单权限</h3></template>
            <div class="tag-list">
              <el-tag
                v-for="item in detail.menuPermissions || []"
                :key="item"
                effect="plain"
                :title="getPermissionDisplayText(item)"
              >
                {{ getPermissionCompactDisplayText(item) }}
              </el-tag>
              <span v-if="!detail.menuPermissions?.length" class="muted">无</span>
            </div>
          </el-card>
          <el-card class="detail-card" shadow="never">
            <template #header><h3>页面权限</h3></template>
            <div class="tag-list">
              <el-tag
                v-for="item in detail.pagePermissions || []"
                :key="item"
                effect="plain"
                :title="getPermissionDisplayText(item)"
              >
                {{ getPermissionCompactDisplayText(item) }}
              </el-tag>
              <span v-if="!detail.pagePermissions?.length" class="muted">无</span>
            </div>
          </el-card>
          <el-card class="detail-card" shadow="never">
            <template #header><h3>操作权限</h3></template>
            <div class="tag-list">
              <el-tag
                v-for="item in detail.actionPermissions || []"
                :key="item"
                effect="plain"
                :title="getPermissionDisplayText(item)"
              >
                {{ getPermissionCompactDisplayText(item) }}
              </el-tag>
              <span v-if="!detail.actionPermissions?.length" class="muted">无</span>
            </div>
          </el-card>
        </div>
      </div>
    </AdminDetailDrawer>

    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '新建角色' : '编辑角色'"
      width="860px"
      destroy-on-close
      class="roles-action-dialog roles-action-dialog--form"
    >
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">ROLE EDITOR / 角色维护</p>
        <strong>{{ formMode === 'create' ? '创建角色' : '编辑角色' }}</strong>
        <p>沿当前角色权限模型维护菜单、页面和动作权限。</p>
      </section>
      <el-form label-position="top" :model="form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色编码">
              <el-input v-model="form.roleCode" placeholder="请输入角色编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色名称">
              <el-input v-model="form.roleName" placeholder="请输入角色名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="启用中" :value="1" />
                <el-option label="已禁用" :value="2" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入角色说明" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="权限编排">
              <div class="permission-stack">
                <el-alert
                  :title="aiGovernancePresetNotice.title"
                  :description="aiGovernancePresetNotice.description"
                  :type="aiGovernancePresetNotice.type"
                  :closable="false"
                  show-icon
                />

                <div class="ai-governance-bundle-grid">
                  <el-card
                    v-for="bundle in aiGovernancePermissionBundles"
                    :key="bundle.key"
                    class="detail-card ai-governance-bundle-card"
                    shadow="never"
                  >
                    <StackCell :title="bundle.label" :subtitle="bundle.description" />
                    <div class="tag-list">
                      <el-tag
                        v-for="item in bundle.codes"
                        :key="item"
                        effect="plain"
                        :title="getPermissionDisplayText(item)"
                      >
                        {{ getPermissionCompactDisplayText(item) }}
                      </el-tag>
                    </div>
                    <div class="bundle-actions">
                      <el-button text type="primary" @click="applyAiGovernanceBundle(bundle)">套用建议权限包</el-button>
                    </div>
                  </el-card>
                </div>

                <el-alert
                  :title="recruitGovernancePresetNotice.title"
                  :description="recruitGovernancePresetNotice.description"
                  :type="recruitGovernancePresetNotice.type"
                  :closable="false"
                  show-icon
                />

                <div class="ai-governance-bundle-grid">
                  <el-card
                    v-for="bundle in recruitGovernancePermissionBundles"
                    :key="bundle.key"
                    class="detail-card ai-governance-bundle-card"
                    shadow="never"
                  >
                    <StackCell :title="bundle.label" :subtitle="bundle.description" />
                    <div class="tag-list">
                      <el-tag
                        v-for="item in bundle.codes"
                        :key="item"
                        effect="plain"
                        :title="getPermissionDisplayText(item)"
                      >
                        {{ getPermissionCompactDisplayText(item) }}
                      </el-tag>
                    </div>
                    <div class="bundle-actions">
                      <el-button text type="primary" @click="applyRecruitGovernanceBundle(bundle)">套用建议权限包</el-button>
                    </div>
                  </el-card>
                </div>

                <PermissionTreeEditor
                  v-model:menu-permissions="form.menuPermissions"
                  v-model:page-permissions="form.pagePermissions"
                  v-model:action-permissions="form.actionPermissions"
                />
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitForm">
          {{ formMode === 'create' ? '创建角色' : '保存修改' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="copyVisible"
      title="复制角色"
      width="560px"
      destroy-on-close
      class="roles-action-dialog roles-action-dialog--copy"
    >
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">ROLE COPY / 角色复制</p>
        <strong>复制当前角色</strong>
        <p>在当前角色权限基线上复制一份新角色，不扩展新的权限模型。</p>
      </section>
      <el-form label-position="top" :model="copyForm">
        <el-form-item label="新角色编码">
          <el-input v-model="copyForm.roleCode" placeholder="请输入新角色编码" />
        </el-form-item>
        <el-form-item label="新角色名称">
          <el-input v-model="copyForm.roleName" placeholder="请输入新角色名称" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="copyForm.remark" type="textarea" :rows="3" placeholder="请输入复制说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyVisible = false">取消</el-button>
        <el-button type="primary" :loading="copySubmitting" @click="submitCopy">确认复制</el-button>
      </template>
    </el-dialog>

    <AuditConfirmDialog
      v-model="statusVisible"
      :title="statusMode === 'enable' ? '确认启用角色' : '确认禁用角色'"
      :confirm-text="statusMode === 'enable' ? '确认启用' : '确认禁用'"
      dialog-class="roles-status-dialog"
      width="500px"
      reason-label="操作原因"
      placeholder="请输入操作原因"
      :meta="statusMeta"
      @submit="submitStatusChange"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  copyAdminRole,
  createAdminRole,
  disableAdminRole,
  enableAdminRole,
  fetchAdminRoleAiGovernanceMatrix,
  fetchAdminRoleRecruitGovernanceMatrix,
  fetchAdminRoleDetail,
  fetchAdminRoles,
  updateAdminRole,
} from '@/api/system'
import FilterPanel from '@/components/business/FilterPanel.vue'
import DetailGrid from '@/components/business/DetailGrid.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import AuditConfirmDialog from '@/components/dialogs/AuditConfirmDialog.vue'
import PermissionTreeEditor from '@/components/forms/PermissionTreeEditor.vue'
import StackCell from '@/components/tables/StackCell.vue'
import TableActions from '@/components/tables/TableActions.vue'
import { PERMISSIONS } from '@/constants/permission'
import { getPermissionDisplayText } from '@/constants/permission-registry'
import { adminRoleStatusMap } from '@/constants/status'
import type {
  AdminRoleAiGovernanceMatrix,
  AdminRoleItem,
  AdminRoleQuery,
  AdminRoleRecruitGovernanceMatrix,
  AdminRoleRecruitGovernanceMatrixItem,
  AdminRoleSavePayload,
} from '@/types/system'
import { formatDateTime } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type FormMode = 'create' | 'edit'
type StatusMode = 'enable' | 'disable'
type PermissionBundlePreset = {
  key: string
  label: string
  description: string
  menuPermissions: string[]
  pagePermissions: string[]
  actionPermissions: string[]
  codes: string[]
}

const aiGovernancePermissionBundles: PermissionBundlePreset[] = [
  {
    key: 'ai-governance-read',
    label: 'AI 治理只读',
    description: '适合查看概览、历史、失败样本和治理动作，不包含人工处置动作。',
    menuPermissions: [PERMISSIONS.menu.system],
    pagePermissions: [PERMISSIONS.page.systemAiResumeGovernance],
    actionPermissions: [],
    codes: [PERMISSIONS.menu.system, PERMISSIONS.page.systemAiResumeGovernance],
  },
  {
    key: 'ai-governance-operate',
    label: 'AI 治理处置',
    description: '适合运营或风控处理失败样本，包含人工复核和建议重试动作。',
    menuPermissions: [PERMISSIONS.menu.system],
    pagePermissions: [PERMISSIONS.page.systemAiResumeGovernance],
    actionPermissions: [PERMISSIONS.action.systemAiResumeReview, PERMISSIONS.action.systemAiResumeResolve],
    codes: [
      PERMISSIONS.menu.system,
      PERMISSIONS.page.systemAiResumeGovernance,
      PERMISSIONS.action.systemAiResumeReview,
      PERMISSIONS.action.systemAiResumeResolve,
    ],
  },
]

const recruitGovernancePermissionBundles: PermissionBundlePreset[] = [
  {
    key: 'recruit-governance-read',
    label: '招募治理只读',
    description: '适合查看项目、角色、投递三张治理页，不包含状态处置动作。',
    menuPermissions: [],
    pagePermissions: [PERMISSIONS.page.recruitProjects, PERMISSIONS.page.recruitRoles, PERMISSIONS.page.recruitApplies],
    actionPermissions: [],
    codes: [
      PERMISSIONS.page.recruitProjects,
      PERMISSIONS.page.recruitRoles,
      PERMISSIONS.page.recruitApplies,
    ],
  },
  {
    key: 'recruit-governance-operate',
    label: '招募治理处置',
    description: '适合执行项目结束、角色暂停/恢复等最小治理动作。',
    menuPermissions: [],
    pagePermissions: [PERMISSIONS.page.recruitProjects, PERMISSIONS.page.recruitRoles, PERMISSIONS.page.recruitApplies],
    actionPermissions: [PERMISSIONS.action.recruitProjectStatus, PERMISSIONS.action.recruitRoleStatus],
    codes: [
      PERMISSIONS.page.recruitProjects,
      PERMISSIONS.page.recruitRoles,
      PERMISSIONS.page.recruitApplies,
      PERMISSIONS.action.recruitProjectStatus,
      PERMISSIONS.action.recruitRoleStatus,
    ],
  },
]

const loading = ref(false)
const rows = ref<AdminRoleItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const detail = ref<AdminRoleItem | null>(null)
const currentRow = ref<AdminRoleItem | null>(null)
const matrixLoading = ref(false)
const roleMatrix = ref<AdminRoleAiGovernanceMatrix | null>(null)
const recruitMatrixLoading = ref(false)
const recruitRoleMatrix = ref<AdminRoleRecruitGovernanceMatrix | null>(null)
const formVisible = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
const copyVisible = ref(false)
const copySubmitting = ref(false)
const statusVisible = ref(false)
const statusMode = ref<StatusMode>('disable')

const filters = reactive<AdminRoleQuery>({
  pageNo: 1,
  pageSize: 20,
  roleCode: '',
  roleName: '',
  status: undefined,
})

const form = reactive<AdminRoleSavePayload>({
  roleCode: '',
  roleName: '',
  status: 1,
  remark: '',
  menuPermissions: [],
  pagePermissions: [],
  actionPermissions: [],
})

const copyForm = reactive({
  roleCode: '',
  roleName: '',
  remark: '',
})

const detailBlocks = computed(() => {
  if (!detail.value) {
    return []
  }
  return [
    { label: '角色 ID', value: detail.value.adminRoleId },
    { label: '角色编码', value: detail.value.roleCode },
    { label: '角色名称', value: detail.value.roleName },
    { label: '状态', value: (adminRoleStatusMap[detail.value.status] || resolveRoleStatus(detail.value.status)).label },
    { label: '备注', value: detail.value.remark || '--' },
    { label: '创建人', value: detail.value.createUserName || '--' },
    { label: '创建时间', value: formatDateTime(detail.value.createTime) },
    { label: '更新人', value: detail.value.updateUserName || '--' },
    { label: '更新时间', value: formatDateTime(detail.value.lastUpdate) },
  ]
})

const roleMatrixRows = computed(() => roleMatrix.value?.list || [])
const recruitMatrixRows = computed(() => recruitRoleMatrix.value?.list || [])
const matrixSummaryCards = computed(() => [
  {
    label: '启用角色',
    value: roleMatrix.value?.enabledRoleCount ?? 0,
    description: '当前仍在生效的后台角色数',
  },
  {
    label: 'AI 已就绪',
    value: roleMatrix.value?.aiReadyRoleCount ?? 0,
    description: '已具备 AI 页面与两类动作权限',
  },
  {
    label: '权限缺口',
    value: roleMatrix.value?.operationLogsPermissionGapRoleCount ?? 0,
    description: '当前仍缺少 AI 权限的角色',
  },
  {
    label: '受影响账号',
    value: roleMatrix.value?.operationLogsPermissionGapBoundUserCount ?? 0,
    description: '当前绑定在 AI 权限缺口角色上的后台账号数',
  },
])
const recruitMatrixSummaryCards = computed(() => [
  {
    label: '启用角色',
    value: recruitRoleMatrix.value?.enabledRoleCount ?? 0,
    description: '当前仍在生效的后台角色数',
  },
  {
    label: '招募已就绪',
    value: recruitRoleMatrix.value?.recruitReadyRoleCount ?? 0,
    description: `页面 ready ${recruitRoleMatrix.value?.pageReadyRoleCount ?? 0} / 动作 ready ${recruitRoleMatrix.value?.actionReadyRoleCount ?? 0}`,
  },
  {
    label: '权限缺口',
    value: recruitRoleMatrix.value?.recruitPermissionGapRoleCount ?? 0,
    description: `页面缺口 ${recruitPagePermissionGapRoleCount.value} / 动作缺口 ${recruitActionPermissionGapRoleCount.value}`,
  },
  {
    label: '受影响账号',
    value: recruitRoleMatrix.value?.recruitPermissionGapBoundUserCount ?? 0,
    description: '当前绑定在招募权限缺口角色上的后台账号数',
  },
])
const roleMatrixStatusTag = computed(() =>
  roleMatrix.value?.operationLogsPermissionGapCleared
    ? { label: '权限已收口', tone: 'success' as const }
    : { label: '存在权限缺口', tone: 'warning' as const },
)
const recruitMatrixStatusTag = computed(() =>
  recruitRoleMatrix.value?.recruitPermissionGapCleared
    ? { label: '权限已收口', tone: 'success' as const }
    : recruitRoleMatrix.value?.pagePermissionGapCleared
      ? { label: '动作授权缺口', tone: 'info' as const }
      : recruitRoleMatrix.value?.actionPermissionGapCleared
        ? { label: '页面授权缺口', tone: 'info' as const }
        : { label: '存在权限缺口', tone: 'warning' as const },
)
const roleMatrixAlertText = computed(() => {
  if (!roleMatrix.value) {
    return '正在加载 AI 授权矩阵。'
  }
  if (roleMatrix.value.operationLogsPermissionGapCleared) {
    return '当前启用角色已完成 AI 页面与动作权限收口，可沿独立权限模型维护。'
  }
  return `仍有 ${roleMatrix.value.operationLogsPermissionGapRoleCount} 个启用角色、${roleMatrix.value.operationLogsPermissionGapBoundUserCount} 个后台账号存在 AI 权限缺口，应配置页面与动作授权。`
})
const recruitMatrixAlertText = computed(() => {
  if (!recruitRoleMatrix.value) {
    return '正在加载招募治理授权矩阵。'
  }
  if (recruitRoleMatrix.value.recruitPermissionGapCleared) {
    return '当前启用角色已完成招募页面与动作权限收口，可沿独立权限模型维护。'
  }
  if (recruitRoleMatrix.value.pagePermissionGapCleared) {
    return `当前启用角色的招募页面权限已齐备，但仍有 ${recruitRoleMatrix.value.actionPermissionGapRoleCount ?? 0} 个启用角色缺少动作授权。`
  }
  if (recruitRoleMatrix.value.actionPermissionGapCleared) {
    return `当前启用角色的招募动作权限已齐备，但仍有 ${recruitRoleMatrix.value.pagePermissionGapRoleCount ?? 0} 个启用角色缺少页面授权。`
  }
  return `仍有 ${recruitRoleMatrix.value.recruitPermissionGapRoleCount} 个启用角色、${recruitRoleMatrix.value.recruitPermissionGapBoundUserCount} 个后台账号存在招募权限缺口；其中页面缺口 ${recruitPagePermissionGapRoleCount.value} 个、动作缺口 ${recruitActionPermissionGapRoleCount.value} 个。`
})

const statusMeta = computed(() => [
  { label: '角色 ID', value: currentRow.value?.adminRoleId },
  { label: '角色编码', value: currentRow.value?.roleCode },
  { label: '角色名称', value: currentRow.value?.roleName },
  { label: '目标状态', value: statusMode.value === 'enable' ? '启用' : '禁用' },
])

function hasRecruitDirectPages(item: AdminRoleRecruitGovernanceMatrixItem) {
  return Boolean(item.pageReady ?? (item.hasRecruitProjectsPage && item.hasRecruitRolesPage && item.hasRecruitAppliesPage))
}

function hasRecruitDirectActions(item: AdminRoleRecruitGovernanceMatrixItem) {
  return Boolean(item.actionReady ?? (item.hasRecruitProjectStatusAction && item.hasRecruitRoleStatusAction))
}

function hasRecruitPagePermissionGap(item: AdminRoleRecruitGovernanceMatrixItem) {
  return Boolean(item.pagePermissionGap ?? (item.hasAdminUsersPage && !hasRecruitDirectPages(item)))
}

function hasRecruitActionPermissionGap(item: AdminRoleRecruitGovernanceMatrixItem) {
  return Boolean(item.actionPermissionGap ?? (item.hasAdminUsersPage && !hasRecruitDirectActions(item)))
}

const recruitPagePermissionGapRoleCount = computed(() =>
  recruitRoleMatrix.value?.pagePermissionGapRoleCount
    ?? recruitMatrixRows.value.filter((item) => item.status === 1 && hasRecruitPagePermissionGap(item)).length,
)

const recruitActionPermissionGapRoleCount = computed(() =>
  recruitRoleMatrix.value?.actionPermissionGapRoleCount
    ?? recruitMatrixRows.value.filter((item) => item.status === 1 && hasRecruitActionPermissionGap(item)).length,
)

const recruitMatrixPermissionTextMap: Record<string, string> = {
  [PERMISSIONS.page.recruitProjects]: '剧组项目页',
  [PERMISSIONS.page.recruitRoles]: '招募角色页',
  [PERMISSIONS.page.recruitApplies]: '投递记录页',
  [PERMISSIONS.action.recruitProjectStatus]: '项目处置',
  [PERMISSIONS.action.recruitRoleStatus]: '角色处置',
}

function getRecruitMatrixPermissionDisplayText(permission: string) {
  return recruitMatrixPermissionTextMap[permission] || getPermissionDisplayText(permission)
}

function getPermissionCompactDisplayText(permission: string) {
  const fullText = getPermissionDisplayText(permission)
  return fullText.split(' · ')[0]
}

const aiGovernancePresetNotice = computed(() => {
  const hasIndependentPage = form.pagePermissions.includes(PERMISSIONS.page.systemAiResumeGovernance)
  const hasReviewAction = form.actionPermissions.includes(PERMISSIONS.action.systemAiResumeReview)
  const hasResolveAction = form.actionPermissions.includes(PERMISSIONS.action.systemAiResumeResolve)
  const hasPermissionGap =
    form.pagePermissions.includes(PERMISSIONS.page.systemOperationLogs) &&
    !hasIndependentPage &&
    !hasReviewAction &&
    !hasResolveAction

  if (hasIndependentPage && hasReviewAction && hasResolveAction) {
    return {
      title: '当前角色已具备 AI 治理处置权限',
      description: '该角色可直接进入 AI 治理页，并执行人工复核与建议重试动作。',
      type: 'success' as const,
    }
  }

  if (hasIndependentPage) {
    return {
      title: '当前角色已具备 AI 治理页面权限',
      description: '若还需要人工处置失败记录，可配置 action.system.ai-resume.review / resolve。',
      type: 'info' as const,
    }
  }

  if (hasPermissionGap) {
    return {
      title: '当前角色缺少 AI 治理权限',
      description: '当前 AI 治理使用独立页面与动作权限，应配置缺失权限。',
      type: 'warning' as const,
    }
  }

  return {
    title: '建议优先套用独立 AI 治理权限包',
    description: '角色页权限树已支持真实分配 page.system.ai-resume-governance 与 action.system.ai-resume.*，不建议再把 operation-logs 当成新授权入口。',
    type: 'info' as const,
  }
})
const recruitGovernancePresetNotice = computed(() => {
  const hasProjectsPage = form.pagePermissions.includes(PERMISSIONS.page.recruitProjects)
  const hasRolesPage = form.pagePermissions.includes(PERMISSIONS.page.recruitRoles)
  const hasAppliesPage = form.pagePermissions.includes(PERMISSIONS.page.recruitApplies)
  const hasProjectAction = form.actionPermissions.includes(PERMISSIONS.action.recruitProjectStatus)
  const hasRoleAction = form.actionPermissions.includes(PERMISSIONS.action.recruitRoleStatus)
  const hasPermissionGap =
    form.pagePermissions.includes(PERMISSIONS.page.systemAdminUsers) &&
    !hasProjectsPage &&
    !hasRolesPage &&
    !hasAppliesPage &&
    !hasProjectAction &&
    !hasRoleAction

  if (hasProjectsPage && hasRolesPage && hasAppliesPage && hasProjectAction && hasRoleAction) {
    return {
      title: '当前角色已具备招募治理处置权限',
      description: '该角色可直接进入招募治理页，并执行项目与角色状态校准动作。',
      type: 'success' as const,
    }
  }

  if (hasProjectsPage && hasRolesPage && hasAppliesPage) {
    return {
      title: '当前角色已具备招募治理页面权限',
      description: '若还需要处置项目或角色状态，可配置 action.recruit.project.status / action.recruit.role.status。',
      type: 'info' as const,
    }
  }

  if (hasPermissionGap) {
    return {
      title: '当前角色缺少招募治理权限',
      description: '当前招募治理使用独立页面与动作权限，应配置缺失权限。',
      type: 'warning' as const,
    }
  }

  return {
    title: '建议优先套用独立招募治理权限包',
    description: '角色页权限树已支持真实分配 page.recruit.* 与 action.recruit.*，后台账号页不作为新授权入口。',
    type: 'info' as const,
  }
})

function resolveRoleStatus(status?: number) {
  return { label: `状态 ${status ?? '--'}`, tone: 'info' as const }
}

function getAiGovernanceStageMeta(stage?: string) {
  if (stage === 'ai_ready') {
    return { label: '新权限已齐备', tone: 'success' as const }
  }
  if (stage === 'permission_review') {
    return { label: '权限缺口', tone: 'danger' as const }
  }
  if (stage === 'ai_partial') {
    return { label: '新权限不完整', tone: 'warning' as const }
  }
  return { label: 'AI 权限缺口', tone: 'info' as const }
}

function getRecruitGovernanceStageMeta(stage?: string) {
  if (stage === 'recruit_ready') {
    return { label: '新权限已齐备', tone: 'success' as const }
  }
  if (stage === 'permission_review') {
    return { label: '权限缺口', tone: 'danger' as const }
  }
  if (stage === 'recruit_partial') {
    return { label: '新权限不完整', tone: 'warning' as const }
  }
  return { label: '招募权限缺口', tone: 'info' as const }
}

function mergeUniquePermissions(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next]))
}

function resetFormModel() {
  form.roleCode = ''
  form.roleName = ''
  form.status = 1
  form.remark = ''
  form.menuPermissions = []
  form.pagePermissions = []
  form.actionPermissions = []
}

function applyAiGovernanceBundle(bundle: PermissionBundlePreset) {
  form.menuPermissions = mergeUniquePermissions(form.menuPermissions, bundle.menuPermissions)
  form.pagePermissions = mergeUniquePermissions(form.pagePermissions, bundle.pagePermissions)
  form.actionPermissions = mergeUniquePermissions(form.actionPermissions, bundle.actionPermissions)
}

function applyRecruitGovernanceBundle(bundle: PermissionBundlePreset) {
  form.menuPermissions = mergeUniquePermissions(form.menuPermissions, bundle.menuPermissions)
  form.pagePermissions = mergeUniquePermissions(form.pagePermissions, bundle.pagePermissions)
  form.actionPermissions = mergeUniquePermissions(form.actionPermissions, bundle.actionPermissions)
}

async function loadRoles() {
  loading.value = true
  try {
    const result = await fetchAdminRoles(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function loadRoleMatrix() {
  matrixLoading.value = true
  try {
    roleMatrix.value = await fetchAdminRoleAiGovernanceMatrix()
  } finally {
    matrixLoading.value = false
  }
}

async function loadRecruitRoleMatrix() {
  recruitMatrixLoading.value = true
  try {
    recruitRoleMatrix.value = await fetchAdminRoleRecruitGovernanceMatrix()
  } finally {
    recruitMatrixLoading.value = false
  }
}

async function reloadRoleData() {
  await Promise.all([loadRoles(), loadRoleMatrix(), loadRecruitRoleMatrix()])
}

async function openDetail(id: number) {
  detail.value = await fetchAdminRoleDetail(id)
  detailVisible.value = true
}

function openCreateDialog() {
  formMode.value = 'create'
  resetFormModel()
  formVisible.value = true
}

function openEditDialog(row: AdminRoleItem) {
  currentRow.value = row
  formMode.value = 'edit'
  form.roleCode = row.roleCode
  form.roleName = row.roleName
  form.status = row.status
  form.remark = row.remark || ''
  form.menuPermissions = [...(row.menuPermissions || [])]
  form.pagePermissions = [...(row.pagePermissions || [])]
  form.actionPermissions = [...(row.actionPermissions || [])]
  formVisible.value = true
}

async function openEditFromMatrix(adminRoleId: number) {
  const detailRow = await fetchAdminRoleDetail(adminRoleId)
  openEditDialog(detailRow)
}

function openCopyDialog(row: AdminRoleItem) {
  currentRow.value = row
  copyForm.roleCode = `${row.roleCode}_copy`
  copyForm.roleName = `${row.roleName}副本`
  copyForm.remark = row.remark || ''
  copyVisible.value = true
}

function openStatusDialog(mode: StatusMode, row: AdminRoleItem) {
  currentRow.value = row
  statusMode.value = mode
  statusVisible.value = true
}

async function submitForm() {
  if (!form.roleCode || !form.roleName) {
    ElMessage.warning('请填写角色编码和角色名称')
    return
  }
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      await createAdminRole(form)
      ElMessage.success('角色已创建')
    } else if (currentRow.value) {
      await updateAdminRole(currentRow.value.adminRoleId, form)
      ElMessage.success('角色已更新')
    }
    formVisible.value = false
    await reloadRoleData()
  } finally {
    formSubmitting.value = false
  }
}

async function submitCopy() {
  if (!currentRow.value) {
    return
  }
  if (!copyForm.roleCode || !copyForm.roleName) {
    ElMessage.warning('请填写新角色编码和名称')
    return
  }
  copySubmitting.value = true
  try {
    await copyAdminRole(currentRow.value.adminRoleId, {
      roleCode: copyForm.roleCode,
      roleName: copyForm.roleName,
      remark: copyForm.remark,
    })
    ElMessage.success('角色已复制')
    copyVisible.value = false
    await reloadRoleData()
  } finally {
    copySubmitting.value = false
  }
}

async function submitStatusChange(reason: string) {
  if (!currentRow.value) {
    return
  }
  if (statusMode.value === 'enable') {
    await enableAdminRole(currentRow.value.adminRoleId, { reason })
    ElMessage.success('角色已启用')
  } else {
    await disableAdminRole(currentRow.value.adminRoleId, { reason })
    ElMessage.success('角色已禁用')
  }
  statusVisible.value = false
  await reloadRoleData()
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.roleCode = ''
  filters.roleName = ''
  filters.status = undefined
  loadRoles()
}

onMounted(loadRoles)
onMounted(loadRoleMatrix)
onMounted(loadRecruitRoleMatrix)
</script>

<style scoped lang="scss">

.roles-shell-card :deep(.el-card__body) {
  padding: 14px 18px 12px;
}

.roles-shell-card__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.roles-shell-pill {
  display: grid;
  gap: 4px;
  min-width: 148px;
  padding: 12px 14px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.roles-shell-pill span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.roles-shell-pill strong {
  font-size: 22px;
  line-height: 1.1;
}

.roles-shell-pill--dark {
  background: #221f1c;
  border-color: rgba(34, 31, 28, 0.92);
  color: #f6efe6;
}

.roles-shell-pill--dark span {
  color: rgba(246, 239, 230, 0.58);
}

.roles-shell-card__note {
  margin: 10px 0 0;
  color: rgba(47, 36, 27, 0.56);
  font-size: 12px;
  line-height: 1.6;
}

.roles-filter-panel :deep(.el-card__body) {
  padding: 16px 18px 14px;
}

.roles-filter-panel :deep(.filter-panel__header) {
  margin-bottom: 12px;
  padding-bottom: 10px;
}

.roles-filter-panel :deep(.filter-panel__header h3) {
  font-size: 15px;
}

.roles-filter-panel :deep(.filter-panel__header p) {
  margin-top: 4px;
  font-size: 12px;
}

.roles-filter-panel :deep(.filter-panel__body) {
  gap: 12px;
}

.roles-filter-panel :deep(.el-form--inline) {
  gap: 10px 14px;
}

.roles-filter-panel :deep(.el-form--inline .el-form-item) {
  gap: 8px;
}

.roles-filter-panel :deep(.el-form-item__label) {
  min-height: 40px;
  font-size: 11px;
}

.roles-filter-panel :deep(.el-form-item__content) {
  min-width: 152px;
}

.roles-filter-panel :deep(.el-input__wrapper),
.roles-filter-panel :deep(.el-select__wrapper) {
  min-height: 46px;
  border-radius: 16px;
}

.roles-ai-matrix-card :deep(.el-card__header),
.roles-recruit-matrix-card :deep(.el-card__header) {
  padding: 16px 20px 12px;
}

.roles-ai-matrix-card :deep(.el-card__body),
.roles-recruit-matrix-card :deep(.el-card__body) {
  padding: 18px 20px 18px;
}

.card-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 16px;
  }

  p {
    margin: 4px 0 0;
    color: var(--kp-text-secondary);
    font-size: 12px;
    line-height: 1.5;
  }
}

.matrix-summary {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-block {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(47, 36, 27, 0.08);
  border-radius: 14px;
  background: rgba(47, 36, 27, 0.04);

  span {
    color: var(--kp-text-secondary);
    font-size: 11px;
  }

  strong {
    font-size: 20px;
    line-height: 1.1;
  }

  small {
    color: var(--kp-text-secondary);
    font-size: 11px;
    line-height: 1.4;
  }
}

.roles-ai-matrix-card :deep(.el-alert),
.roles-recruit-matrix-card :deep(.el-alert) {
  padding: 10px 12px;
  border-radius: 14px;
}

.roles-ai-matrix-card :deep(.el-alert__title),
.roles-recruit-matrix-card :deep(.el-alert__title) {
  font-size: 13px;
}

.roles-ai-matrix-card :deep(.el-alert__description),
.roles-recruit-matrix-card :deep(.el-alert__description) {
  font-size: 12px;
  line-height: 1.5;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table th.el-table__cell) {
  padding: 10px 0;
  font-size: 11px;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table td.el-table__cell) {
  padding: 9px 0;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .cell) {
  line-height: 1.4;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .stack-cell) {
  gap: 3px;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .stack-cell strong) {
  font-size: 14px;
  line-height: 1.25;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .stack-cell span) {
  font-size: 11px;
  line-height: 1.45;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .tag-list) {
  gap: 6px;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .tag-list .el-tag) {
  min-height: 24px;
  padding-inline: 9px;
  font-size: 11px;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .table-actions) {
  gap: 4px 8px;
}

.roles-ai-matrix-card :deep(.roles-ai-matrix-table .table-actions :is(.el-button.is-link, .el-button--link)) {
  min-height: 22px;
  font-size: 12px;
  line-height: 1.35;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table th.el-table__cell) {
  padding: 10px 0;
  font-size: 11px;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table td.el-table__cell) {
  padding: 9px 0;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .cell) {
  line-height: 1.4;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .stack-cell) {
  gap: 3px;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .stack-cell strong) {
  font-size: 14px;
  line-height: 1.25;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .stack-cell span) {
  font-size: 11px;
  line-height: 1.45;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .tag-list) {
  gap: 6px;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .tag-list .el-tag) {
  min-height: 24px;
  padding-inline: 9px;
  font-size: 11px;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .table-actions) {
  gap: 4px 8px;
}

.roles-recruit-matrix-card :deep(.roles-recruit-matrix-table .table-actions :is(.el-button.is-link, .el-button--link)) {
  min-height: 22px;
  font-size: 12px;
  line-height: 1.35;
}

.roles-directory-card :deep(.el-card__body) {
  padding: 16px 20px 16px;
}

.roles-directory-card .table-header {
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.roles-directory-card .table-header > div {
  display: grid;
  gap: 4px;
}

.roles-directory-card .table-header__eyebrow {
  margin: 0;
  color: rgba(47, 36, 27, 0.5);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.roles-directory-card .table-header h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.2;
}

.roles-directory-card .table-header__hint {
  max-width: 336px;
  color: var(--kp-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.roles-directory-card :deep(.roles-directory-table th.el-table__cell) {
  padding: 10px 0;
  font-size: 11px;
}

.roles-directory-card :deep(.roles-directory-table td.el-table__cell) {
  padding: 8px 0;
}

.roles-directory-card :deep(.roles-directory-table .cell) {
  line-height: 1.4;
}

.roles-directory-card :deep(.roles-directory-table .stack-cell) {
  gap: 3px;
}

.roles-directory-card :deep(.roles-directory-table .stack-cell strong) {
  font-size: 13px;
  line-height: 1.25;
}

.roles-directory-card :deep(.roles-directory-table .stack-cell span) {
  font-size: 11px;
  line-height: 1.45;
}

.roles-directory-card :deep(.roles-directory-table .table-actions) {
  gap: 4px 8px;
}

.roles-directory-card :deep(.roles-directory-table .table-actions :is(.el-button.is-link, .el-button--link)) {
  min-height: 22px;
  font-size: 12px;
  line-height: 1.35;
}

.roles-directory-pager {
  margin-top: 12px;
}

.roles-directory-card :deep(.roles-directory-pager .el-pagination) {
  min-height: 32px;
}

:deep(.roles-detail-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 22px 12px;
}

:deep(.roles-detail-drawer .el-drawer__title) {
  font-size: 18px;
  line-height: 1.3;
}

:deep(.roles-detail-drawer .el-drawer__body) {
  padding: 18px 22px;
}

:deep(.roles-detail-drawer .el-drawer__close-btn) {
  width: 30px;
  height: 30px;
}

:deep(.roles-detail-drawer .detail-layout) {
  gap: 14px;
}

:deep(.roles-detail-drawer .drawer-hero) {
  padding: 16px 18px;
  gap: 10px;
}

:deep(.roles-detail-drawer .drawer-hero p) {
  margin: 0 0 4px;
  font-size: 11px;
}

:deep(.roles-detail-drawer .drawer-hero strong) {
  font-size: 16px;
  line-height: 1.2;
}

:deep(.roles-detail-drawer .drawer-hero span) {
  font-size: 12px;
  line-height: 1.45;
}

:deep(.roles-detail-drawer .detail-grid) {
  gap: 12px;
}

:deep(.roles-detail-drawer .detail-block) {
  min-height: 70px;
  padding: 14px 16px;
}

:deep(.roles-detail-drawer .detail-block span) {
  font-size: 11px;
}

:deep(.roles-detail-drawer .detail-block strong) {
  font-size: 14px;
  line-height: 1.35;
}

:deep(.roles-detail-drawer .permission-grid) {
  gap: 14px;
}

:deep(.roles-detail-drawer .detail-card > .el-card__header) {
  padding: 14px 18px 12px;
}

:deep(.roles-detail-drawer .detail-card > .el-card__body) {
  padding: 16px 18px;
}

:deep(.roles-detail-drawer .detail-card h3) {
  margin: 0;
  font-size: 15px;
}

:deep(.roles-detail-drawer .detail-card .tag-list) {
  gap: 6px;
}

:deep(.roles-detail-drawer .detail-card .el-tag) {
  min-height: 24px;
  padding-inline: 9px;
  font-size: 11px;
}

:deep(.roles-action-dialog) {
  overflow: hidden;
}

:deep(.roles-action-dialog .el-dialog__header) {
  margin-bottom: 0;
  padding: 18px 22px 12px;
}

:deep(.roles-action-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
}

:deep(.roles-action-dialog .el-dialog__body) {
  padding: 18px 22px 18px;
}

:deep(.roles-action-dialog .el-dialog__footer) {
  padding: 14px 22px 18px;
}

:deep(.roles-action-dialog .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
}

:deep(.roles-action-dialog .dialog-intro) {
  gap: 6px;
  margin-bottom: 14px;
  padding: 12px 16px;
  border-radius: 16px;
}

:deep(.roles-action-dialog .dialog-intro__eyebrow) {
  font-size: 10px;
  letter-spacing: 0.18em;
}

:deep(.roles-action-dialog .dialog-intro strong) {
  font-size: 18px;
  line-height: 1.2;
}

:deep(.roles-action-dialog .dialog-intro p) {
  font-size: 12px;
  line-height: 1.55;
}

:deep(.roles-action-dialog .el-form-item) {
  margin-bottom: 14px;
}

:deep(.roles-action-dialog .el-form-item__label) {
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.roles-action-dialog :is(.el-input__wrapper, .el-select__wrapper, .el-date-editor.el-input__wrapper)) {
  min-height: 44px;
  border-radius: 14px;
}

:deep(.roles-action-dialog .el-textarea__inner) {
  min-height: 92px !important;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.55;
}

:deep(.roles-action-dialog--form) {
  max-height: calc(100vh - 36px);
  margin: 18px auto !important;
  display: flex;
  flex-direction: column;
}

:deep(.roles-action-dialog--form .el-dialog__body) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

:deep(.roles-action-dialog--form .permission-stack) {
  gap: 8px;
}

:deep(.roles-action-dialog--form .permission-stack .el-alert) {
  padding: 8px 10px;
  border-radius: 12px;
}

:deep(.roles-action-dialog--form .permission-stack .el-alert__title) {
  font-size: 12px;
}

:deep(.roles-action-dialog--form .permission-stack .el-alert__description) {
  font-size: 11px;
  line-height: 1.45;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-grid) {
  gap: 8px;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card) {
  gap: 8px;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card > .el-card__body) {
  padding: 14px 16px;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card .stack-cell) {
  gap: 3px;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card .stack-cell strong) {
  font-size: 14px;
  line-height: 1.25;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card .stack-cell span) {
  font-size: 11px;
  line-height: 1.45;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card .tag-list) {
  gap: 4px;
}

:deep(.roles-action-dialog--form .ai-governance-bundle-card .el-tag) {
  min-height: 22px;
  padding-inline: 8px;
  font-size: 11px;
}

:deep(.roles-action-dialog--form .bundle-actions .el-button) {
  min-height: 22px;
  font-size: 12px;
  line-height: 1.35;
}

:deep(.roles-action-dialog--form .permission-editor) {
  gap: 10px;
}

:deep(.roles-action-dialog--form .permission-editor .toolbar) {
  gap: 6px;
}

:deep(.roles-action-dialog--form .permission-editor .toolbar-actions) {
  gap: 6px;
}

:deep(.roles-action-dialog--form .permission-editor .toolbar .el-input__wrapper) {
  min-height: 36px !important;
  height: 36px;
}

:deep(.roles-action-dialog--form .permission-editor .toolbar-actions .el-tag) {
  min-height: 24px;
  padding-inline: 9px;
  font-size: 11px;
}

:deep(.roles-action-dialog--form .permission-editor .unknown-list) {
  gap: 6px;
}

:deep(.roles-action-dialog--form .permission-editor .unknown-list .el-tag) {
  min-height: 24px;
  padding-inline: 9px;
  font-size: 11px;
}

:deep(.roles-action-dialog--form .permission-editor .permission-tree) {
  padding: 10px 12px;
  border-radius: 14px;
}

:deep(.roles-action-dialog--form .permission-editor .el-tree-node__content) {
  min-height: 28px !important;
  height: 28px;
}

:deep(.roles-action-dialog--form .permission-editor .tree-node) {
  gap: 6px;
}

:deep(.roles-action-dialog--form .permission-editor .tree-node code) {
  font-size: 11px;
}

:deep(.roles-status-dialog .el-dialog__header) {
  margin-bottom: 0;
  padding: 18px 22px 12px;
}

:deep(.roles-status-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
}

:deep(.roles-status-dialog .el-dialog__body) {
  padding: 18px 22px 18px;
}

:deep(.roles-status-dialog .el-dialog__footer) {
  padding: 14px 22px 18px;
}

:deep(.roles-status-dialog .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
}

:deep(.roles-status-dialog .dialog-content) {
  gap: 10px;
}

:deep(.roles-status-dialog .dialog-intro) {
  gap: 6px;
  padding: 12px 16px;
  border-radius: 16px;
}

:deep(.roles-status-dialog .dialog-intro__eyebrow) {
  font-size: 10px;
  letter-spacing: 0.18em;
}

:deep(.roles-status-dialog .dialog-intro strong) {
  font-size: 18px;
  line-height: 1.2;
}

:deep(.roles-status-dialog .dialog-intro p) {
  font-size: 12px;
  line-height: 1.55;
}

:deep(.roles-status-dialog .dialog-meta) {
  gap: 6px;
}

:deep(.roles-status-dialog .dialog-meta li) {
  padding: 10px 12px;
  border-radius: 14px;
}

:deep(.roles-status-dialog .dialog-meta span) {
  font-size: 12px;
}

:deep(.roles-status-dialog .dialog-meta strong) {
  font-size: 13px;
  line-height: 1.4;
}

:deep(.roles-status-dialog .el-textarea__inner) {
  min-height: 92px !important;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.55;
}

:deep(.roles-status-dialog .dialog-tip) {
  font-size: 12px;
  line-height: 1.4;
}

.matrix-table {
  margin-top: 12px;
}

.permission-stack {
  display: grid;
  gap: 12px;
  width: 100%;
}

.ai-governance-bundle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.ai-governance-bundle-card {
  display: grid;
  gap: 12px;
}

.bundle-actions {
  display: flex;
  justify-content: flex-end;
}

.permission-grid {
  display: grid;
  gap: 16px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.muted {
  color: var(--kp-text-secondary);
}

@media (max-width: 820px) {
  .card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .matrix-summary {
    grid-template-columns: 1fr;
  }

  .roles-directory-card .table-header {
    flex-direction: column;
  }

  .roles-directory-card .table-header__hint {
    max-width: none;
  }
}

@media (max-width: 1200px) {
  .roles-shell-pill {
    min-width: 132px;
  }
}
</style>
