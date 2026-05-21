<template>
  <PageContainer>
    <template #actions>
      <PermissionButton action="action.system.admin-user.create" type="primary" @click="openCreateDialog">
        新建后台账号
      </PermissionButton>
    </template>

    <el-card class="table-card admin-users-shell-card" shadow="never">
      <div class="admin-users-shell-card__stats">
        <article class="admin-users-shell-pill admin-users-shell-pill--dark">
          <span>账号总数</span>
          <strong>{{ total }}</strong>
        </article>
        <article class="admin-users-shell-pill">
          <span>当前筛选</span>
          <strong>{{ filters.account || filters.userName || filters.phone || filters.roleCode || '全部账号' }}</strong>
        </article>
        <article class="admin-users-shell-pill">
          <span>当前状态</span>
          <strong>{{ filters.status === 1 ? '启用中' : filters.status === 2 ? '已禁用' : '全部状态' }}</strong>
        </article>
      </div>
      <p class="admin-users-shell-card__note">当前页只承接后台账号、角色绑定、密码处置与启停用，不扩展额外管理模型。</p>
    </el-card>

    <FilterPanel class="admin-users-filter-panel" description="按账号、姓名、手机号、状态和角色编码筛选后台成员。">
      <el-form :model="filters" inline>
        <el-form-item label="账号">
          <el-input v-model="filters.account" placeholder="账号" clearable />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="filters.userName" placeholder="姓名" clearable />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="filters.phone" placeholder="手机号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable style="width: 148px">
            <el-option label="启用中" :value="1" />
            <el-option label="已禁用" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色编码">
          <el-input v-model="filters.roleCode" placeholder="super_admin" clearable />
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadUsers">查询</el-button>
      </template>
    </FilterPanel>

    <el-card class="table-card admin-users-table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">ADMIN USER / 后台成员</p>
          <h3>后台账号清单</h3>
        </div>
        <span class="table-header__hint">统一查看账号、角色、状态和最近登录，不在这里新增用户侧扩展能力。</span>
      </div>
      <el-table class="admin-users-table" :data="rows" v-loading="loading">
        <el-table-column prop="adminUserId" label="ID" min-width="90" />
        <el-table-column prop="account" label="账号" min-width="150" />
        <el-table-column prop="userName" label="姓名" min-width="120" />
        <el-table-column label="联系方式" min-width="220">
          <template #default="{ row }">
            <StackCell :title="row.phone || '--'" :subtitle="row.email || '--'" />
          </template>
        </el-table-column>
        <el-table-column label="角色" min-width="220">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="role in row.roles" :key="role.roleCode" effect="plain" :type="role.status === 1 ? undefined : 'warning'">
                {{ role.roleName }}
              </el-tag>
              <span v-if="!row.roles?.length" class="muted">未绑定角色</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <StatusTag v-bind="adminUserStatusMap[row.status] || { label: `状态 ${row.status}`, tone: 'info' }" />
          </template>
        </el-table-column>
        <el-table-column label="最近登录" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.lastLoginTime) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="288">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row.adminUserId)">查看详情</el-button>
              <PermissionButton link action="action.system.admin-user.edit" @click="openEditDialog(row)">
                编辑
              </PermissionButton>
              <PermissionButton link action="action.system.admin-user.bind-roles" @click="openBindDialog(row)">
                绑定角色
              </PermissionButton>
              <PermissionButton link action="action.system.admin-user.reset-password" @click="openResetDialog(row)">
                重置密码
              </PermissionButton>
              <PermissionButton
                v-if="row.status === 1"
                link
                type="danger"
                action="action.system.admin-user.disable"
                @click="openStatusDialog('disable', row)"
              >
                禁用
              </PermissionButton>
              <PermissionButton
                v-else
                link
                type="success"
                action="action.system.admin-user.enable"
                @click="openStatusDialog('enable', row)"
              >
                启用
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
          @current-change="loadUsers"
          @size-change="loadUsers"
        />
      </div>
    </el-card>

    <AdminDetailDrawer
      v-model="detailVisible"
      title="后台账号详情"
      size="580px"
      destroy-on-close
      class="admin-users-detail-drawer"
    >
      <DetailGrid v-if="detail" :items="detailBlocks" class="admin-users-detail-grid">
        <section class="drawer-hero">
          <div>
            <p>ADMIN USER DETAIL / 账号详情</p>
            <strong>{{ detail.userName || detail.account || '后台账号详情' }}</strong>
            <span>{{ detail.account || '--' }} · {{ detail.phone || '--' }}</span>
          </div>
          <StatusTag v-bind="adminUserStatusMap[detail.status] || { label: `状态 ${detail.status}`, tone: 'info' }" />
        </section>
        <DetailBlock wide>
          <span>角色绑定</span>
          <div class="tag-list">
            <el-tag v-for="role in detail.roles" :key="role.roleCode" effect="plain" :type="role.status === 1 ? undefined : 'warning'">
              {{ role.roleName }} ({{ role.roleCode }})
            </el-tag>
            <strong v-if="!detail.roles?.length">未绑定角色</strong>
          </div>
        </DetailBlock>
      </DetailGrid>
    </AdminDetailDrawer>

    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '新建后台账号' : '编辑后台账号'"
      width="720px"
      destroy-on-close
      class="admin-users-action-dialog admin-users-action-dialog--form"
    >
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">ADMIN USER / 账号维护</p>
        <strong>{{ formMode === 'create' ? '创建后台账号' : '编辑后台账号' }}</strong>
        <p>沿当前后台账号模型维护账号、联系方式和初始角色。</p>
      </section>
      <el-form ref="formRef" label-position="top" :model="form" :rules="formRules">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="账号" prop="account">
              <el-input v-model="form.account" placeholder="请输入后台账号" />
            </el-form-item>
          </el-col>
          <el-col v-if="formMode === 'create'" :span="12">
            <el-form-item label="初始密码" prop="password">
              <el-input v-model="form.password" type="password" show-password placeholder="请输入初始密码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="userName">
              <el-input v-model="form.userName" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col v-if="formMode === 'create'" :span="24">
            <el-form-item label="角色">
              <div class="role-field">
                <el-alert
                  v-if="roleCatalogNotice"
                  type="warning"
                  :closable="false"
                  show-icon
                  title="角色目录不可用"
                  :description="roleCatalogNotice"
                />
                <el-select
                  v-model="form.roleCodes"
                  multiple
                  filterable
                  style="width: 100%"
                  placeholder="选择启用中的角色"
                  :loading="roleLoading"
                  :disabled="!canChooseRoles"
                >
                  <el-option
                    v-for="role in activeRoleOptions"
                    :key="role.roleCode"
                    :label="`${role.roleName} (${role.roleCode})`"
                    :value="role.roleCode"
                  />
                </el-select>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitForm">
          {{ formMode === 'create' ? '创建账号' : '保存修改' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="bindVisible"
      title="绑定后台账号角色"
      width="560px"
      destroy-on-close
      class="admin-users-action-dialog admin-users-action-dialog--bind"
    >
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">ROLE BIND / 角色绑定</p>
        <strong>更新后台账号角色</strong>
        <p>这里只调整当前账号与启用角色的绑定关系，不扩展新的授权模型。</p>
      </section>
      <el-form ref="bindFormRef" label-position="top" :model="bindForm" :rules="bindFormRules">
        <el-form-item label="角色">
          <div class="role-field">
            <el-alert
              v-if="roleCatalogNotice"
              type="warning"
              :closable="false"
              show-icon
              title="角色目录不可用"
              :description="roleCatalogNotice"
            />
            <el-alert
              v-if="inactiveBoundRoles.length"
              type="warning"
              :closable="false"
              show-icon
              title="当前账号存在已禁用角色"
              :description="inactiveRolesNotice"
            />
            <div v-if="inactiveBoundRoles.length" class="tag-list">
              <el-tag v-for="role in inactiveBoundRoles" :key="role.roleCode" type="warning" effect="plain">
                {{ role.roleName }} ({{ role.roleCode }})
              </el-tag>
            </div>
            <el-select
              v-model="bindForm.roleCodes"
              multiple
              filterable
              style="width: 100%"
              placeholder="选择启用中的角色"
              :loading="roleLoading"
              :disabled="!canChooseRoles"
            >
              <el-option
                v-for="role in activeRoleOptions"
                :key="role.roleCode"
                :label="`${role.roleName} (${role.roleCode})`"
                :value="role.roleCode"
              />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="原因" prop="reason">
          <el-input v-model="bindForm.reason" type="textarea" :rows="4" placeholder="请输入角色调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindVisible = false">取消</el-button>
        <el-button type="primary" :loading="bindSubmitting" :disabled="!canChooseRoles" @click="submitBindRoles">
          确认绑定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="resetVisible"
      title="重置后台账号密码"
      width="560px"
      destroy-on-close
      class="admin-users-action-dialog admin-users-action-dialog--reset"
    >
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">PASSWORD RESET / 密码重置</p>
        <strong>重置后台账号密码</strong>
        <p>沿当前密码重置链路处理。</p>
      </section>
      <el-form ref="resetFormRef" label-position="top" :model="resetForm" :rules="resetFormRules">
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="resetForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="凭证交付方式" prop="credentialDeliveryMode">
          <el-input v-model="resetForm.credentialDeliveryMode" placeholder="例如：站内信 / 当面交付" />
        </el-form-item>
        <el-form-item label="重置原因" prop="reason">
          <el-input v-model="resetForm.reason" type="textarea" :rows="3" placeholder="请输入重置原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetSubmitting" @click="submitResetPassword">确认重置</el-button>
      </template>
    </el-dialog>

    <AuditConfirmDialog
      v-model="statusVisible"
      :title="statusMode === 'enable' ? '确认启用后台账号' : '确认禁用后台账号'"
      :confirm-text="statusMode === 'enable' ? '确认启用' : '确认禁用'"
      dialog-class="admin-users-status-dialog"
      width="500px"
      reason-required
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
import type { FormInstance, FormRules } from 'element-plus'
import {
  bindAdminUserRoles,
  createAdminUser,
  disableAdminUser,
  enableAdminUser,
  fetchAdminRoles,
  fetchAdminUserDetail,
  fetchAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '@/api/system'
import FilterPanel from '@/components/business/FilterPanel.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import AuditConfirmDialog from '@/components/dialogs/AuditConfirmDialog.vue'
import StackCell from '@/components/tables/StackCell.vue'
import TableActions from '@/components/tables/TableActions.vue'
import { PERMISSIONS } from '@/constants/permission'
import { adminUserStatusMap } from '@/constants/status'
import { usePermissionStore } from '@/stores/permission'
import type {
  AdminRoleItem,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserQuery,
  AdminUserCreatePayload,
} from '@/types/system'
import { formatDateTime } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

type FormMode = 'create' | 'edit'
type StatusMode = 'enable' | 'disable'

const permissionStore = usePermissionStore()
const loading = ref(false)
const detailVisible = ref(false)
const detail = ref<AdminUserDetail | null>(null)
const rows = ref<AdminUserListItem[]>([])
const total = ref(0)
const roleOptions = ref<AdminRoleItem[]>([])
const roleLoading = ref(false)
const roleCatalogLoadFailed = ref(false)
const currentRow = ref<AdminUserListItem | null>(null)

const formVisible = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
const formRef = ref<FormInstance>()
const bindVisible = ref(false)
const bindSubmitting = ref(false)
const bindFormRef = ref<FormInstance>()
const resetVisible = ref(false)
const resetSubmitting = ref(false)
const resetFormRef = ref<FormInstance>()
const statusVisible = ref(false)
const statusMode = ref<StatusMode>('disable')

const filters = reactive<AdminUserQuery>({
  pageNo: 1,
  pageSize: 20,
  account: '',
  userName: '',
  phone: '',
  status: undefined,
  roleCode: '',
})

const form = reactive<AdminUserCreatePayload>({
  account: '',
  password: '',
  userName: '',
  phone: '',
  email: '',
  roleCodes: [],
})

const bindForm = reactive({
  roleCodes: [] as string[],
  reason: '',
})

const resetForm = reactive({
  newPassword: '',
  credentialDeliveryMode: '',
  reason: '',
})

const formRules: FormRules<typeof form> = {
  account: [
    { required: true, message: '请输入后台账号', trigger: 'blur' },
    { validator: (_rule, value, callback) => validateTrimmedRequired(value, callback, '后台账号'), trigger: 'blur' },
  ],
  password: [{ validator: (_rule, value, callback) => validateCreatePassword(value, callback), trigger: 'blur' }],
  userName: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { validator: (_rule, value, callback) => validateTrimmedRequired(value, callback, '姓名'), trigger: 'blur' },
  ],
  phone: [{ validator: (_rule, value, callback) => validatePhone(value, callback), trigger: 'blur' }],
  email: [{ validator: (_rule, value, callback) => validateEmail(value, callback), trigger: 'blur' }],
}

const bindFormRules: FormRules<typeof bindForm> = {
  reason: [{ validator: (_rule, value, callback) => validateTrimmedRequired(value, callback, '角色调整原因'), trigger: 'blur' }],
}

const resetFormRules: FormRules<typeof resetForm> = {
  newPassword: [{ validator: (_rule, value, callback) => validateTrimmedRequired(value, callback, '新密码'), trigger: 'blur' }],
  credentialDeliveryMode: [{ validator: (_rule, value, callback) => validateTrimmedRequired(value, callback, '凭证交付方式'), trigger: 'blur' }],
  reason: [{ validator: (_rule, value, callback) => validateTrimmedRequired(value, callback, '重置原因'), trigger: 'blur' }],
}

const detailBlocks = computed(() => {
  if (!detail.value) {
    return []
  }
  return [
    { label: '账号 ID', value: detail.value.adminUserId },
    { label: '后台账号', value: detail.value.account },
    { label: '姓名', value: detail.value.userName },
    { label: '手机号', value: detail.value.phone || '--' },
    { label: '邮箱', value: detail.value.email || '--' },
    { label: '状态', value: (adminUserStatusMap[detail.value.status] || { label: `状态 ${detail.value.status}` }).label },
    { label: '最近登录时间', value: formatDateTime(detail.value.lastLoginTime) },
    { label: '最近登录 IP', value: detail.value.lastLoginIp || '--' },
    { label: '创建人', value: detail.value.createUserName || '--' },
    { label: '创建时间', value: formatDateTime(detail.value.createTime) },
    { label: '最后更新人', value: detail.value.updateUserName || '--' },
    { label: '最后更新时间', value: formatDateTime(detail.value.lastUpdate) },
  ]
})

const canReadRoleCatalog = computed(() => permissionStore.hasPage(PERMISSIONS.page.systemRoles))
const canChooseRoles = computed(() => canReadRoleCatalog.value && !roleCatalogLoadFailed.value)
const activeRoleOptions = computed(() => roleOptions.value.filter((item) => item.status === 1))
const inactiveBoundRoles = computed(() => (currentRow.value?.roles || []).filter((item) => item.status !== 1))
const roleCatalogNotice = computed(() => {
  if (!canReadRoleCatalog.value) {
    return '当前账号暂时没有角色目录查看权限，因此这里无法选择可绑定角色。'
  }
  if (roleCatalogLoadFailed.value) {
    return '角色目录加载失败，请稍后重试。'
  }
  return ''
})
const inactiveRolesNotice = computed(
  () => '后端创建账号与绑定角色都只接受启用角色；本次保存后，下列已禁用角色会被移除。',
)

const statusMeta = computed(() => [
  { label: '账号 ID', value: currentRow.value?.adminUserId },
  { label: '后台账号', value: currentRow.value?.account },
  { label: '姓名', value: currentRow.value?.userName },
  { label: '目标状态', value: statusMode.value === 'enable' ? '启用' : '禁用' },
])

function resetFormModel() {
  form.account = ''
  form.password = ''
  form.userName = ''
  form.phone = ''
  form.email = ''
  form.roleCodes = []
}

function validateTrimmedRequired(value: string | undefined, callback: (error?: Error) => void, label: string) {
  if (!String(value ?? '').trim()) {
    callback(new Error(`请输入${label}`))
    return
  }
  callback()
}

function validateCreatePassword(value: string | undefined, callback: (error?: Error) => void) {
  if (formMode.value !== 'create') {
    callback()
    return
  }
  validateTrimmedRequired(value, callback, '初始密码')
}

function validatePhone(value: string | undefined, callback: (error?: Error) => void) {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    callback()
    return
  }
  if (!/^1\d{10}$/.test(normalized)) {
    callback(new Error('手机号格式不正确'))
    return
  }
  callback()
}

function validateEmail(value: string | undefined, callback: (error?: Error) => void) {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    callback()
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    callback(new Error('邮箱格式不正确'))
    return
  }
  callback()
}

function sanitizeText(value?: string) {
  return String(value ?? '').trim()
}

async function loadUsers() {
  loading.value = true
  try {
    const result = await fetchAdminUsers(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  if (!canReadRoleCatalog.value) {
    roleOptions.value = []
    roleCatalogLoadFailed.value = false
    return
  }
  roleLoading.value = true
  roleCatalogLoadFailed.value = false
  try {
    const result = await fetchAdminRoles({
      pageNo: 1,
      pageSize: 200,
      roleCode: '',
      roleName: '',
      status: undefined,
    })
    roleOptions.value = result.list
  } catch {
    roleOptions.value = []
    roleCatalogLoadFailed.value = true
  } finally {
    roleLoading.value = false
  }
}

async function openDetail(id: number) {
  detail.value = await fetchAdminUserDetail(id)
  detailVisible.value = true
}

function openCreateDialog() {
  formMode.value = 'create'
  resetFormModel()
  formVisible.value = true
}

function openEditDialog(row: AdminUserListItem) {
  formMode.value = 'edit'
  currentRow.value = row
  form.account = row.account
  form.password = ''
  form.userName = row.userName
  form.phone = row.phone || ''
  form.email = row.email || ''
  form.roleCodes = row.roles?.map((item) => item.roleCode) || []
  formVisible.value = true
}

function openBindDialog(row: AdminUserListItem) {
  currentRow.value = row
  bindForm.roleCodes = row.roles?.filter((item) => item.status === 1).map((item) => item.roleCode) || []
  bindForm.reason = ''
  bindVisible.value = true
}

function openResetDialog(row: AdminUserListItem) {
  currentRow.value = row
  resetForm.newPassword = ''
  resetForm.credentialDeliveryMode = ''
  resetForm.reason = ''
  resetVisible.value = true
}

function openStatusDialog(mode: StatusMode, row: AdminUserListItem) {
  currentRow.value = row
  statusMode.value = mode
  statusVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      await createAdminUser({
        account: sanitizeText(form.account),
        password: sanitizeText(form.password),
        userName: sanitizeText(form.userName),
        phone: sanitizeText(form.phone),
        email: sanitizeText(form.email),
        roleCodes: form.roleCodes,
      })
      ElMessage.success('后台账号已创建')
    } else if (currentRow.value) {
      await updateAdminUser(currentRow.value.adminUserId, {
        account: sanitizeText(form.account),
        userName: sanitizeText(form.userName),
        phone: sanitizeText(form.phone),
        email: sanitizeText(form.email),
      })
      ElMessage.success('后台账号已更新')
    }
    formVisible.value = false
    await loadUsers()
  } finally {
    formSubmitting.value = false
  }
}

async function submitBindRoles() {
  if (!currentRow.value) {
    return
  }
  if (!canChooseRoles.value) {
    ElMessage.warning('当前无法读取角色目录，不能执行角色绑定')
    return
  }
  const valid = await bindFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  bindSubmitting.value = true
  try {
    await bindAdminUserRoles(currentRow.value.adminUserId, {
      roleCodes: bindForm.roleCodes,
      reason: sanitizeText(bindForm.reason),
    })
    ElMessage.success('角色绑定已更新')
    bindVisible.value = false
    await loadUsers()
    if (detailVisible.value) {
      detail.value = await fetchAdminUserDetail(currentRow.value.adminUserId)
    }
  } finally {
    bindSubmitting.value = false
  }
}

async function submitResetPassword() {
  if (!currentRow.value) {
    return
  }
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  resetSubmitting.value = true
  try {
    await resetAdminUserPassword(currentRow.value.adminUserId, {
      newPassword: sanitizeText(resetForm.newPassword),
      credentialDeliveryMode: sanitizeText(resetForm.credentialDeliveryMode),
      reason: sanitizeText(resetForm.reason),
      resetResult: 'success',
    })
    ElMessage.success('密码已重置')
    resetVisible.value = false
  } finally {
    resetSubmitting.value = false
  }
}

async function submitStatusChange(reason: string) {
  if (!currentRow.value) {
    return
  }
  if (statusMode.value === 'enable') {
    await enableAdminUser(currentRow.value.adminUserId, { reason })
    ElMessage.success('后台账号已启用')
  } else {
    await disableAdminUser(currentRow.value.adminUserId, { reason })
    ElMessage.success('后台账号已禁用')
  }
  statusVisible.value = false
  await loadUsers()
  if (detailVisible.value) {
    detail.value = await fetchAdminUserDetail(currentRow.value.adminUserId)
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.account = ''
  filters.userName = ''
  filters.phone = ''
  filters.status = undefined
  filters.roleCode = ''
  loadUsers()
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<style scoped lang="scss">
.admin-users-shell-card :deep(.el-card__body) {
  padding: 14px 18px 12px;
}

.admin-users-shell-card__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-users-shell-pill {
  display: grid;
  gap: 4px;
  min-width: 148px;
  padding: 12px 14px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.admin-users-shell-pill span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.admin-users-shell-pill strong {
  font-size: 22px;
  line-height: 1.1;
}

.admin-users-shell-pill--dark {
  background: #221f1c;
  border-color: rgba(34, 31, 28, 0.92);
  color: #f6efe6;
}

.admin-users-shell-pill--dark span {
  color: rgba(246, 239, 230, 0.58);
}

.admin-users-shell-card__note {
  margin: 10px 0 0;
  color: rgba(47, 36, 27, 0.56);
  font-size: 12px;
  line-height: 1.6;
}

.admin-users-filter-panel :deep(.el-card__body) {
  padding: 16px 18px 14px;
}

.admin-users-filter-panel :deep(.filter-panel__header) {
  margin-bottom: 12px;
  padding-bottom: 10px;
}

.admin-users-filter-panel :deep(.filter-panel__header h3) {
  font-size: 15px;
}

.admin-users-filter-panel :deep(.filter-panel__header p) {
  margin-top: 4px;
  font-size: 12px;
}

.admin-users-filter-panel :deep(.filter-panel__body) {
  gap: 12px;
}

.admin-users-filter-panel :deep(.el-form--inline) {
  gap: 10px 14px;
}

.admin-users-filter-panel :deep(.el-form--inline .el-form-item) {
  gap: 8px;
}

.admin-users-filter-panel :deep(.el-form-item__label) {
  min-height: 40px;
  font-size: 11px;
}

.admin-users-filter-panel :deep(.el-form-item__content) {
  min-width: 152px;
}

.admin-users-filter-panel :deep(.el-input__wrapper),
.admin-users-filter-panel :deep(.el-select__wrapper) {
  min-height: 46px;
  border-radius: 16px;
}

.admin-users-table-card :deep(.el-card__body) {
  padding-top: 16px;
  padding-bottom: 12px;
}

.admin-users-table-card :deep(.table-header) {
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 8px;
}

.admin-users-table-card :deep(.table-header__hint) {
  max-width: 340px;
  font-size: 12px;
  line-height: 1.5;
}

.admin-users-table-card :deep(.el-table th.el-table__cell) {
  padding: 10px 0;
  font-size: 11px;
}

.admin-users-table-card :deep(.el-table td.el-table__cell) {
  padding: 10px 0;
}

.admin-users-table-card :deep(.el-table .cell) {
  line-height: 1.42;
}

.admin-users-table-card :deep(.el-table :is(th, td).el-table-fixed-column--right) {
  background: #fffbf5 !important;
}

.admin-users-table-card :deep(.el-table__fixed-right-patch),
.admin-users-table-card :deep(.el-table th.el-table-fixed-column--right) {
  background: #f8f3eb !important;
}

.admin-users-table-card .stack-cell {
  gap: 3px;
}

.admin-users-table-card .stack-cell strong {
  font-size: 14px;
  line-height: 1.25;
}

.admin-users-table-card .stack-cell span {
  color: rgba(47, 36, 27, 0.5);
  font-size: 11px;
  line-height: 1.45;
}

.admin-users-table-card .tag-list {
  gap: 6px;
}

.admin-users-table-card :deep(.el-table .tag-list .el-tag) {
  min-height: 26px;
  padding-inline: 10px;
  font-size: 12px;
}

.admin-users-table-card :deep(.el-table .admin-table-actions) {
  gap: 4px 8px;
  align-items: center;
}

.admin-users-table-card :deep(.el-table .admin-table-actions :is(.el-button.is-link, .el-button--link)) {
  min-height: 22px;
  font-size: 12px;
  line-height: 1.35;
}

.admin-users-table-card .pager {
  margin-top: 16px;
  padding-top: 14px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-field {
  display: grid;
  gap: 12px;
  width: 100%;
}

.muted {
  color: var(--kp-text-secondary);
}

:deep(.admin-users-detail-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(80, 63, 47, 0.08);
}

:deep(.admin-users-detail-drawer .el-drawer__title) {
  font-size: 16px;
  font-weight: 700;
}

:deep(.admin-users-detail-drawer .el-drawer__body) {
  padding: 18px 20px 20px;
}

:deep(.admin-users-detail-drawer .el-drawer__close-btn) {
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
}

:deep(.admin-users-detail-drawer .admin-users-detail-grid) {
  gap: 10px;
}

:deep(.admin-users-detail-drawer .el-drawer__body .drawer-hero) {
  align-items: center;
  gap: 12px;
  grid-column: 1 / -1;
  padding: 10px 14px;
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.95), rgba(248, 242, 233, 0.9)),
    rgba(255, 251, 245, 0.92);
}

:deep(.admin-users-detail-drawer .el-drawer__body .drawer-hero p) {
  margin: 0 0 2px;
  color: rgba(47, 36, 27, 0.42);
  font-size: 10px;
  letter-spacing: 0.18em;
}

:deep(.admin-users-detail-drawer .el-drawer__body .drawer-hero strong) {
  display: block;
  font-size: 17px;
  line-height: 1.2;
}

:deep(.admin-users-detail-drawer .el-drawer__body .drawer-hero span) {
  display: block;
  margin-top: 1px;
  color: rgba(47, 36, 27, 0.54);
  font-size: 12px;
  line-height: 1.45;
}

:deep(.admin-users-detail-drawer .admin-detail-block),
:deep(.admin-users-detail-drawer .admin-info-block) {
  align-content: start;
  gap: 6px;
  min-height: 70px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 251, 245, 0.78);
}

:deep(.admin-users-detail-drawer .admin-detail-block span),
:deep(.admin-users-detail-drawer .admin-info-block span) {
  color: rgba(47, 36, 27, 0.46);
  font-size: 11px;
  line-height: 1.3;
}

:deep(.admin-users-detail-drawer .admin-detail-block strong),
:deep(.admin-users-detail-drawer .admin-info-block strong) {
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

:deep(.admin-users-detail-drawer .admin-info-block .tag-list) {
  gap: 6px;
}

:deep(.admin-users-detail-drawer .admin-info-block .el-tag) {
  min-height: 28px;
  padding-inline: 10px;
  font-size: 12px;
}

:deep(.admin-users-action-dialog .el-dialog__header) {
  margin-bottom: 0;
  padding: 18px 22px 12px;
}

:deep(.admin-users-action-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
}

:deep(.admin-users-action-dialog .el-dialog__body) {
  padding: 18px 22px 18px;
}

:deep(.admin-users-action-dialog .el-dialog__footer) {
  padding: 14px 22px 18px;
}

:deep(.admin-users-action-dialog .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
}

:deep(.admin-users-action-dialog .dialog-intro) {
  gap: 6px;
  margin-bottom: 14px;
  padding: 12px 16px;
  border-radius: 16px;
}

:deep(.admin-users-action-dialog .dialog-intro__eyebrow) {
  font-size: 10px;
  letter-spacing: 0.18em;
}

:deep(.admin-users-action-dialog .dialog-intro strong) {
  font-size: 18px;
  line-height: 1.2;
}

:deep(.admin-users-action-dialog .dialog-intro p) {
  font-size: 12px;
  line-height: 1.55;
}

:deep(.admin-users-action-dialog .el-form-item) {
  margin-bottom: 14px;
}

:deep(.admin-users-action-dialog .el-form-item__label) {
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.admin-users-action-dialog :is(.el-input__wrapper, .el-select__wrapper, .el-date-editor.el-input__wrapper)) {
  min-height: 44px;
  border-radius: 14px;
}

:deep(.admin-users-action-dialog .el-textarea__inner) {
  min-height: 92px !important;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.55;
}

:deep(.admin-users-action-dialog .role-field) {
  gap: 10px;
}

:deep(.admin-users-action-dialog .role-field .el-alert) {
  padding: 10px 12px;
  border-radius: 14px;
}

:deep(.admin-users-action-dialog .role-field .tag-list) {
  gap: 6px;
}

:deep(.admin-users-action-dialog .role-field .el-tag) {
  min-height: 28px;
  padding-inline: 10px;
  font-size: 12px;
}

:deep(.admin-users-status-dialog .el-dialog__header) {
  margin-bottom: 0;
  padding: 18px 22px 12px;
}

:deep(.admin-users-status-dialog .el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
}

:deep(.admin-users-status-dialog .el-dialog__body) {
  padding: 18px 22px 18px;
}

:deep(.admin-users-status-dialog .el-dialog__footer) {
  padding: 14px 22px 18px;
}

:deep(.admin-users-status-dialog .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
}

:deep(.admin-users-status-dialog .dialog-content) {
  gap: 10px;
}

:deep(.admin-users-status-dialog .dialog-intro) {
  gap: 6px;
  padding: 12px 16px;
  border-radius: 16px;
}

:deep(.admin-users-status-dialog .dialog-intro__eyebrow) {
  font-size: 10px;
  letter-spacing: 0.18em;
}

:deep(.admin-users-status-dialog .dialog-intro strong) {
  font-size: 18px;
  line-height: 1.2;
}

:deep(.admin-users-status-dialog .dialog-intro p) {
  font-size: 12px;
  line-height: 1.55;
}

:deep(.admin-users-status-dialog .dialog-meta) {
  gap: 6px;
}

:deep(.admin-users-status-dialog .dialog-meta li) {
  padding: 10px 12px;
  border-radius: 12px;
}

:deep(.admin-users-status-dialog .dialog-meta span) {
  font-size: 12px;
}

:deep(.admin-users-status-dialog .dialog-meta strong) {
  line-height: 1.35;
}

:deep(.admin-users-status-dialog .el-textarea__inner) {
  min-height: 88px !important;
  padding: 10px 12px;
  border-radius: 14px;
  line-height: 1.55;
}

:deep(.admin-users-status-dialog .dialog-tip) {
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 1200px) {
  .admin-users-shell-pill {
    min-width: 132px;
  }
}
</style>
