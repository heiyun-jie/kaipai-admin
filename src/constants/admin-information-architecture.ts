export type AdminInfoArchitectureArea = 'overview' | 'growth' | 'operate' | 'tooling'
export type AdminArchitectureLayer = 'mainline' | 'tooling'

export const adminOverviewRoutes = [
  '/dashboard/index',
  '/dashboard/analytics',
] as const

export const adminGrowthRoutes = [
  '/users/index',
  '/content/share-cards',
] as const

export const adminOperateRoutes = [
  '/content/templates',
  '/operate/actions',
  '/system/settings',
  '/system/ai-image-providers',
] as const

export const adminToolingRoutePrefixes = [
  '/verify',
  '/referral',
  '/recruit',
  '/payment',
  '/refund',
  '/content/publish-logs',
  '/content/theme-tokens',
  '/content/share-artifacts',
  '/content/contact-requests',
  '/system',
] as const

export function isOverviewRoute(path: string) {
  return adminOverviewRoutes.some((route) => path === route || path.startsWith(`${route}/`))
}

export function isGrowthRoute(path: string) {
  return adminGrowthRoutes.some((route) => path === route || path.startsWith(`${route}/`))
}

export function isOperateRoute(path: string) {
  return adminOperateRoutes.some((route) => path === route || path.startsWith(`${route}/`))
}

export function isToolingRoute(path: string) {
  return adminToolingRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function matchesRoute(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function getAdminInfoArchitectureArea(path: string): AdminInfoArchitectureArea {
  if (isOverviewRoute(path)) {
    return 'overview'
  }
  if (isGrowthRoute(path)) {
    return 'growth'
  }
  if (isOperateRoute(path)) {
    return 'operate'
  }
  return 'tooling'
}

export function getAdminInfoArchitectureEyebrow(path: string, layer?: string) {
  const area = getAdminInfoArchitectureArea(path)
  if (area === 'overview') {
    return path.startsWith('/dashboard/analytics') ? 'OVERVIEW / 数据分析' : 'OVERVIEW / 仪表盘'
  }
  if (area === 'growth') {
    if (path.startsWith('/users/index')) {
      return 'GROWTH / 用户管理'
    }
    return 'GROWTH / 分享内容'
  }
  if (area === 'operate') {
    if (path.startsWith('/content/templates')) {
      return 'OPERATE / 风格模板'
    }
    if (path.startsWith('/operate/actions')) {
      return 'OPERATE / 运营动作'
    }
    if (path.startsWith('/system/settings')) {
      return 'OPERATE / 系统设置'
    }
    if (path.startsWith('/system/ai-image-providers')) {
      return 'OPERATE / AI 生图配置'
    }
    return 'OPERATE / 运营管理'
  }
  return 'TOOLING / 治理工具'
}

function getAdminToolingDescription(path: string) {
  if (matchesRoute(path, '/content/templates')) {
    return '当前页面属于模板配置治理工具，直接维护分享卡模板的场景、门槛、主题与产物配置。'
  }
  if (matchesRoute(path, '/content/publish-logs')) {
    return '当前页面属于模板发布记录治理工具，承接发布、回滚与版本变更台账回看，不属于主导航。'
  }
  if (matchesRoute(path, '/content/theme-tokens')) {
    return '当前页面属于主题 Token 治理工具，承接模板主题 JSON 台账回看与最小编辑，不属于主导航。'
  }
  if (matchesRoute(path, '/content/share-artifacts')) {
    return '当前页面属于分享产物治理工具，承接模板产物 JSON 台账回看与最小编辑，不属于主导航。'
  }
  if (matchesRoute(path, '/content/contact-requests')) {
    return '当前页面属于联系方式授权链路治理工具，承接申请记录、处理结果与双方身份回看，不属于主导航。'
  }
  if (matchesRoute(path, '/system/admin-users')) {
    return '当前页面属于后台账号治理工具，承接账号、角色绑定、密码处置与启停用管理。'
  }
  if (matchesRoute(path, '/system/roles')) {
    return '当前页面属于权限治理工具，承接角色权限树以及 AI / 招募授权矩阵，不属于用户中心。'
  }
  if (matchesRoute(path, '/system/operation-logs')) {
    return '当前页面属于后台审计工具，承接操作留痕、前后快照与请求链路排查。'
  }
  if (matchesRoute(path, '/system/ai-resume-governance')) {
    return '当前页面属于独立 AI 治理工具，承接失败样本、敏感命中、协同流转与处置动作。'
  }
  if (matchesRoute(path, '/recruit')) {
    return '当前页面属于招募治理工具，当前已按独立页面 / 动作权限直连放通，不属于主导航。'
  }
  if (matchesRoute(path, '/verify') || matchesRoute(path, '/referral') || matchesRoute(path, '/payment') || matchesRoute(path, '/refund')) {
    return '当前页面属于治理工具页，承接运营、审计或排查动作，不属于主导航。'
  }
  return '当前页面属于后台治理工具，仅作为运维或审计入口保留，不属于主导航。'
}

export function getAdminInfoArchitectureDescription(path: string) {
  const area = getAdminInfoArchitectureArea(path)
  if (area === 'overview') {
    return '当前后台主入口为仪表盘与数据分析，使用现有真实聚合字段。'
  }
  if (area === 'growth') {
    if (matchesRoute(path, '/users/index')) {
      return '业务用户管理已回接真实 `/admin/users` 事实源，不再用后台账号治理页顶替。'
    }
    return '分享内容采用增长域表达，治理字段作为辅助能力展示。'
  }
  if (area === 'operate') {
    if (matchesRoute(path, '/content/templates')) {
      return '风格模板采用模板库表达，发布、回滚与启停用基于现有真实模板能力。'
    }
    if (matchesRoute(path, '/system/ai-image-providers')) {
      return '后台动态切换资料卡生图 provider，公开参数、密钥与主模型状态按权限受控管理。'
    }
    return '运营管理页整合现有动作、配置和治理入口。'
  }
  return getAdminToolingDescription(path)
}

export function getAdminRouteActionLabel(path: string) {
  return getAdminInfoArchitectureArea(path) === 'tooling' ? '进入治理工具' : '进入'
}
