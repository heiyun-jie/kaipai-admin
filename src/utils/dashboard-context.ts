import type { DashboardRouteSource } from '@/types/dashboard'
import type { LocationQuery } from 'vue-router'

const dashboardRouteSources = new Set<DashboardRouteSource>(['dashboard_recent_item', 'dashboard_scope'])
const dashboardContextPaths = new Set([
  '/verify/pending',
  '/referral/risk',
  '/referral/records',
  '/referral/eligibility',
  '/referral/policies',
  '/refund/orders',
  '/payment/orders',
])

export function readRouteQueryString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0] ? value[0] : undefined
  }
  return typeof value === 'string' && value ? value : undefined
}

export function resolveDashboardRouteSource(value: unknown): DashboardRouteSource | undefined {
  const source = readRouteQueryString(value)
  if (source && dashboardRouteSources.has(source as DashboardRouteSource)) {
    return source as DashboardRouteSource
  }
  return undefined
}

export function getDashboardContextTitle(source?: DashboardRouteSource) {
  if (source === 'dashboard_recent_item') {
    return '当前来自工作台最近事项'
  }
  if (source === 'dashboard_scope') {
    return '当前来自工作台筛查上下文'
  }
  return ''
}

export function getDashboardContextFallbackSummary(source?: DashboardRouteSource) {
  if (source === 'dashboard_recent_item') {
    return '已自动带入最近事项筛查条件'
  }
  if (source === 'dashboard_scope') {
    return '当前从工作台进入，可继续按本页条件细化筛查'
  }
  return ''
}

export function shouldCarryDashboardSource(path: string) {
  return dashboardContextPaths.has(path)
}

const referralGovernancePaths = new Set([
  '/referral/risk',
  '/referral/records',
  '/referral/eligibility',
  '/referral/policies',
])

export function isReferralGovernancePath(path: string) {
  return referralGovernancePaths.has(path)
}

function readReferralDashboardWindow(query: LocationQuery) {
  const registeredAtFrom = readRouteQueryString(query.registeredAtFrom)
  const registeredAtTo = readRouteQueryString(query.registeredAtTo)
  if (registeredAtFrom && registeredAtTo) {
    return { from: registeredAtFrom, to: registeredAtTo }
  }

  const effectiveFrom = readRouteQueryString(query.effectiveFrom)
  const effectiveTo = readRouteQueryString(query.effectiveTo)
  if (effectiveFrom && effectiveTo) {
    return { from: effectiveFrom, to: effectiveTo }
  }

  return { from: undefined, to: undefined }
}

export function buildReferralGovernanceRouteQuery(currentQuery: LocationQuery, targetPath: string) {
  const currentSource = resolveDashboardRouteSource(currentQuery.source)
  const query: Record<string, string> = {}

  if (!isReferralGovernancePath(targetPath)) {
    return undefined
  }

  if (currentSource) {
    query.source = 'dashboard_scope'
  }

  const window = readReferralDashboardWindow(currentQuery)
  if (window.from && window.to) {
    if (targetPath === '/referral/risk' || targetPath === '/referral/records') {
      query.registeredAtFrom = window.from
      query.registeredAtTo = window.to
    }
    if (targetPath === '/referral/eligibility') {
      query.effectiveFrom = window.from
      query.effectiveTo = window.to
    }
  }

  return Object.keys(query).length ? query : undefined
}
