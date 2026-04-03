export interface DashboardOverviewQuery {
  dateFrom?: string
  dateTo?: string
  bizLine?: string
}

export type DashboardRouteSource = 'dashboard_recent_item' | 'dashboard_scope'

export type DashboardRecentItemType =
  | 'identity_verification'
  | 'referral_risk'
  | 'refund_order'
  | 'payment_order'
  | (string & {})

export interface DashboardRecentItem {
  bizLine: string
  itemType: DashboardRecentItemType
  itemId: number
  userId?: number | null
  referenceNo?: string | null
  title: string
  status?: number | null
  occurredAt?: string | null
}

export interface DashboardOverview {
  verifyPendingCount?: number | null
  referralRiskPendingCount?: number | null
  refundPendingCount?: number | null
  todayPaymentOrderCount?: number | null
  recentItems: DashboardRecentItem[]
}
