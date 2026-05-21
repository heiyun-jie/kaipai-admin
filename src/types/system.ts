import type { PageResult } from './common'

export interface AdminRoleBrief {
  adminRoleId: number
  roleCode: string
  roleName: string
  status: number
}

export interface AdminUserQuery {
  pageNo: number
  pageSize: number
  account?: string
  userName?: string
  phone?: string
  status?: number
  roleCode?: string
}

export interface AdminUserListItem {
  adminUserId: number
  account: string
  userName: string
  phone?: string | null
  email?: string | null
  status: number
  lastLoginTime?: string | null
  lastLoginIp?: string | null
  createTime?: string | null
  roles: AdminRoleBrief[]
}

export interface AdminUserDetail {
  adminUserId: number
  account: string
  userName: string
  phone?: string | null
  email?: string | null
  status: number
  lastLoginTime?: string | null
  lastLoginIp?: string | null
  createUserName?: string | null
  createTime?: string | null
  updateUserName?: string | null
  lastUpdate?: string | null
  roles: AdminRoleBrief[]
}

export interface AdminUserCreatePayload {
  account: string
  password: string
  userName: string
  phone?: string
  email?: string
  roleCodes: string[]
}

export interface AdminUserUpdatePayload {
  account: string
  userName: string
  phone?: string
  email?: string
}

export interface AdminUserStatusPayload {
  status?: number
  reason?: string
}

export interface AdminUserPasswordResetPayload {
  newPassword: string
  credentialDeliveryMode?: string
  reason?: string
  resetResult?: string
}

export interface AdminUserBindRolesPayload {
  roleCodes: string[]
  reason?: string
}

export interface AdminRoleQuery {
  pageNo: number
  pageSize: number
  roleCode?: string
  roleName?: string
  status?: number
}

export interface AdminRoleItem {
  adminRoleId: number
  roleCode: string
  roleName: string
  status: number
  remark?: string | null
  menuPermissions?: string[]
  pagePermissions?: string[]
  actionPermissions?: string[]
  createUserName?: string | null
  createTime?: string | null
  updateUserName?: string | null
  lastUpdate?: string | null
}

export interface AdminRoleAiGovernanceMatrixItem {
  adminRoleId: number
  roleCode: string
  roleName: string
  status: number
  boundUserCount: number
  hasAiGovernancePage: boolean
  hasOperationLogsPage: boolean
  hasAiReviewAction: boolean
  hasAiResolveAction: boolean
  aiReady: boolean
  operationLogsPermissionGap: boolean
  permissionStage: 'ai_ready' | 'permission_review' | 'ai_partial' | 'unassigned' | string
  missingPermissions: string[]
}

export interface AdminRoleAiGovernanceMatrix {
  totalRoleCount: number
  enabledRoleCount: number
  aiReadyRoleCount: number
  operationLogsPermissionGapRoleCount: number
  pendingRoleCount: number
  operationLogsPermissionGapBoundUserCount: number
  operationLogsPermissionGapCleared: boolean
  list: AdminRoleAiGovernanceMatrixItem[]
}

export interface AdminRoleRecruitGovernanceMatrixItem {
  adminRoleId: number
  roleCode: string
  roleName: string
  status: number
  boundUserCount: number
  hasRecruitProjectsPage: boolean
  hasRecruitRolesPage: boolean
  hasRecruitAppliesPage: boolean
  hasRecruitProjectStatusAction: boolean
  hasRecruitRoleStatusAction: boolean
  hasAdminUsersPage: boolean
  pageReady: boolean
  actionReady: boolean
  pagePermissionGap: boolean
  actionPermissionGap: boolean
  recruitReady: boolean
  recruitPermissionGap: boolean
  permissionStage: 'recruit_ready' | 'permission_review' | 'recruit_partial' | 'unassigned' | string
  missingPermissions: string[]
}

export interface AdminRoleRecruitGovernanceMatrix {
  totalRoleCount: number
  enabledRoleCount: number
  recruitReadyRoleCount: number
  pageReadyRoleCount: number
  actionReadyRoleCount: number
  recruitPermissionGapRoleCount: number
  pagePermissionGapRoleCount: number
  actionPermissionGapRoleCount: number
  pendingRoleCount: number
  recruitPermissionGapBoundUserCount: number
  pagePermissionGapCleared: boolean
  actionPermissionGapCleared: boolean
  recruitPermissionGapCleared: boolean
  list: AdminRoleRecruitGovernanceMatrixItem[]
}

export interface AdminRoleSavePayload {
  roleCode: string
  roleName: string
  status?: number
  remark?: string
  menuPermissions: string[]
  pagePermissions: string[]
  actionPermissions: string[]
}

export interface AdminRoleCopyPayload {
  sourceRoleId?: number
  roleCode: string
  roleName: string
  remark?: string
}

export interface AdminRoleStatusChangePayload {
  adminRoleId?: number
  status?: number
  reason?: string
}

export interface AdminOperationLogQuery {
  pageNo: number
  pageSize: number
  adminUserId?: number
  moduleCode?: string
  operationCode?: string
  targetType?: string
  requestId?: string
  result?: number
  dateFrom?: string
  dateTo?: string
}

export interface AdminOperationLogItem {
  operationLogId: number
  adminUserId?: number | null
  adminUserName?: string | null
  moduleCode?: string | null
  operationCode?: string | null
  targetType?: string | null
  targetId?: number | null
  requestId?: string | null
  operationResult?: number | null
  failReason?: string | null
  clientIp?: string | null
  confirmedAt?: string | null
  createTime?: string | null
}

export interface AdminOperationLogDetail {
  operationLogId: number
  adminUserId?: number | null
  adminUserName?: string | null
  moduleCode?: string | null
  operationCode?: string | null
  targetType?: string | null
  targetId?: number | null
  requestId?: string | null
  clientIp?: string | null
  userAgent?: string | null
  beforeSnapshotJson?: string | null
  afterSnapshotJson?: string | null
  operationResult?: number | null
  failReason?: string | null
  extraContextJson?: string | null
  confirmToken?: string | null
  confirmedAt?: string | null
  createUserName?: string | null
  createTime?: string | null
}

export type AdminUserPageResult = PageResult<AdminUserListItem>
export type AdminRolePageResult = PageResult<AdminRoleItem>
export type AdminOperationLogPageResult = PageResult<AdminOperationLogItem>
