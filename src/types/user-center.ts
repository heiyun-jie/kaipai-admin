import type { PageResult } from './common'

export interface UserCenterQuery {
  pageNo: number
  pageSize: number
  userId?: number
  phone?: string
  nickname?: string
  role?: number
  userType?: number
  realAuthStatus?: number
  referralStatus?: number
  entitlementStatus?: number
}

export interface UserCenterEntitlementSummary {
  latestStatus?: number | null
  totalCount?: number | null
  activeCount?: number | null
  latestExpireTime?: string | null
  activeGrantCodes?: string[] | null
}

export interface UserCenterListItem {
  userId: number
  nickname?: string | null
  phone?: string | null
  userType?: number | null
  role?: string | null
  realAuthStatus?: number | null
  referralStatus?: number | null
  validInviteCount?: number | null
  entitlementSummary?: UserCenterEntitlementSummary | null
  registeredAt?: string | null
  lastActiveAt?: string | null
}

export interface UserCenterDetail {
  userInfo?: {
    userId?: number | null
    userNo?: string | null
    account?: string | null
    phone?: string | null
    email?: string | null
    userName?: string | null
    avatarUrl?: string | null
    userType?: number | null
    role?: string | null
    registerSource?: number | null
    realAuthStatus?: number | null
    invitedByUserId?: number | null
    validInviteCount?: number | null
    registerDeviceFingerprint?: string | null
    status?: number | null
    remark?: string | null
    registeredAt?: string | null
    lastActiveAt?: string | null
    lastLoginIp?: string | null
  } | null
  actorProfileSummary?: {
    actorProfileId?: number | null
    actorNo?: string | null
    nickName?: string | null
    realName?: string | null
    gender?: number | null
    birthday?: string | null
    age?: number | null
    locationProvince?: string | null
    locationCity?: string | null
    avatarUrl?: string | null
    certified?: boolean | null
    openApply?: boolean | null
    profileStatus?: number | null
  } | null
  verifySummary?: {
    realAuthStatus?: number | null
    latestVerificationId?: number | null
    latestVerificationStatus?: number | null
    latestRealName?: string | null
    latestRejectReason?: string | null
    latestSubmittedAt?: string | null
    latestReviewedAt?: string | null
  } | null
  referralSummary?: {
    inviteCode?: string | null
    inviteCodeStatus?: number | null
    invitedByUserId?: number | null
    referralStatus?: number | null
    referralId?: number | null
    riskFlag?: number | null
    riskReason?: string | null
    validInviteCount?: number | null
    totalInviteCount?: number | null
    pendingInviteCount?: number | null
    invalidInviteCount?: number | null
    lastInvitedAt?: string | null
  } | null
  entitlementSummary?: UserCenterEntitlementSummary | null
  paymentSummary?: {
    totalOrderCount?: number | null
    paidOrderCount?: number | null
    totalPaidAmount?: number | null
  } | null
  refundSummary?: {
    totalRefundCount?: number | null
    pendingRefundCount?: number | null
    processingRefundCount?: number | null
    successRefundCount?: number | null
    totalRefundAmount?: number | null
  } | null
  recentOperationLogs?: Array<{
    operationLogId?: number | null
    adminUserId?: number | null
    adminUserName?: string | null
    moduleCode?: string | null
    operationCode?: string | null
    targetType?: string | null
    targetId?: number | null
    operationResult?: number | null
    createTime?: string | null
  }> | null
}

export type UserCenterPageResult = PageResult<UserCenterListItem>
