import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { ADMIN_BRAND } from '@/constants/brand'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      public: true,
      title: '后台登录',
    },
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/common/ForbiddenView.vue'),
    meta: {
      public: true,
      title: '无权限访问',
    },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard/index',
    children: [
      {
        path: 'dashboard/index',
        name: 'dashboard',
        component: () => import('@/views/dashboard/OverviewView.vue'),
        meta: {
          title: '仪表盘',
          pagePermission: 'page.dashboard.index',
          architectureLayer: 'mainline',
          architectureArea: 'overview',
        },
      },
      {
        path: 'dashboard/analytics',
        name: 'dashboard-analytics',
        component: () => import('@/views/dashboard/DashboardAnalyticsView.vue'),
        meta: {
          title: '数据分析',
          pagePermission: 'page.dashboard.index',
          architectureLayer: 'mainline',
          architectureArea: 'overview',
        },
      },
      {
        path: 'verify/pending',
        name: 'verify-pending',
        component: () => import('@/views/verify/VerificationBoard.vue'),
        props: {
          mode: 'pending',
        },
        meta: {
          title: '实名认证待审核',
          pagePermission: 'page.verify.pending',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'verify/history',
        name: 'verify-history',
        component: () => import('@/views/verify/VerificationBoard.vue'),
        props: {
          mode: 'history',
        },
        meta: {
          title: '实名认证历史',
          pagePermission: 'page.verify.history',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'referral/records',
        name: 'referral-records',
        component: () => import('@/views/referral/RecordsView.vue'),
        meta: {
          title: '邀请记录',
          pagePermission: 'page.referral.records',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'referral/risk',
        name: 'referral-risk',
        component: () => import('@/views/referral/RiskView.vue'),
        meta: {
          title: '异常邀请',
          pagePermission: 'page.referral.risk',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'referral/policies',
        name: 'referral-policies',
        component: () => import('@/views/referral/PoliciesView.vue'),
        meta: {
          title: '邀请规则',
          pagePermission: 'page.referral.policies',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'referral/eligibility',
        name: 'referral-eligibility',
        component: () => import('@/views/referral/EligibilityView.vue'),
        meta: {
          title: '邀请资格',
          pagePermission: 'page.referral.eligibility',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'recruit/projects',
        name: 'recruit-projects',
        component: () => import('@/views/recruit/ProjectsView.vue'),
        meta: {
          title: '招募项目治理',
          pagePermission: 'page.recruit.projects',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'recruit/roles',
        name: 'recruit-roles',
        component: () => import('@/views/recruit/RolesView.vue'),
        meta: {
          title: '招募角色治理',
          pagePermission: 'page.recruit.roles',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'recruit/applies',
        name: 'recruit-applies',
        component: () => import('@/views/recruit/AppliesView.vue'),
        meta: {
          title: '投递链路回看',
          pagePermission: 'page.recruit.applies',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'payment/orders',
        name: 'payment-orders',
        component: () => import('@/views/payment/OrdersView.vue'),
        meta: {
          title: '支付订单',
          pagePermission: 'page.payment.orders',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'refund/orders',
        name: 'refund-orders',
        component: () => import('@/views/refund/OrdersView.vue'),
        meta: {
          title: '退款单',
          pagePermission: 'page.refund.orders',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'content/templates',
        name: 'content-templates',
        component: () => import('@/views/content/TemplatesView.vue'),
        meta: {
          title: '风格模板',
          pagePermission: 'page.content.templates',
          architectureLayer: 'mainline',
          architectureArea: 'operate',
        },
      },
      {
        path: 'content/publish-logs',
        name: 'content-publish-logs',
        component: () => import('@/views/content/PublishLogsView.vue'),
        meta: {
          title: '模板发布记录',
          pagePermission: 'page.content.publish-logs',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'content/theme-tokens',
        name: 'content-theme-tokens',
        component: () => import('@/views/content/ThemeTokensView.vue'),
        meta: {
          title: '主题 Token',
          pagePermission: 'page.content.theme-tokens',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'content/share-artifacts',
        name: 'content-share-artifacts',
        component: () => import('@/views/content/ShareArtifactsView.vue'),
        meta: {
          title: '分享产物配置',
          pagePermission: 'page.content.share-artifacts',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'content/contact-requests',
        name: 'content-contact-requests',
        component: () => import('@/views/content/ContactRequestsView.vue'),
        meta: {
          title: '联系方式申请',
          pagePermission: 'page.content.contact-requests',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'content/share-cards',
        name: 'content-share-cards',
        component: () => import('@/views/content/ShareCardsView.vue'),
        meta: {
          title: '分享内容',
          pagePermission: 'page.content.share-cards',
          architectureLayer: 'mainline',
          architectureArea: 'growth',
        },
      },
      {
        path: 'users/index',
        name: 'users-index',
        component: () => import('@/views/user/UserCenterView.vue'),
        meta: {
          title: '用户管理',
          pagePermission: 'page.users.index',
          architectureLayer: 'mainline',
          architectureArea: 'growth',
        },
      },
      {
        path: 'system/ai-resume-governance',
        name: 'system-ai-resume-governance',
        component: () => import('@/views/system/AiResumeGovernanceView.vue'),
        meta: {
          title: 'AI 简历治理',
          pagePermission: 'page.system.ai-resume-governance',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'system/ai-image-providers',
        name: 'system-ai-image-providers',
        component: () => import('@/views/system/AiImageProvidersView.vue'),
        meta: {
          title: 'AI 生图模型配置',
          pagePermissions: [
            'page.system.ai-image-providers',
          ],
          architectureLayer: 'mainline',
          architectureArea: 'operate',
        },
      },
      {
        path: 'system/admin-users',
        name: 'system-admin-users',
        component: () => import('@/views/system/AdminUsersView.vue'),
        meta: {
          title: '后台账号治理',
          pagePermission: 'page.system.admin-users',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'system/roles',
        name: 'system-roles',
        component: () => import('@/views/system/RolesView.vue'),
        meta: {
          title: '角色权限治理',
          pagePermission: 'page.system.roles',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
      {
        path: 'operate/actions',
        name: 'operate-actions',
        component: () => import('@/views/operate/ActionsView.vue'),
        meta: {
          title: '运营动作',
          pagePermission: 'page.dashboard.index',
          architectureLayer: 'mainline',
          architectureArea: 'operate',
        },
      },
      {
        path: 'system/settings',
        name: 'system-settings',
        component: () => import('@/views/system/SettingsView.vue'),
        meta: {
          title: '系统设置',
          pagePermissions: [
            'page.verify.pending',
            'page.content.contact-requests',
            'page.content.templates',
            'page.content.share-cards',
            'page.system.admin-users',
            'page.system.roles',
            'page.system.operation-logs',
            'page.system.ai-resume-governance',
            'page.system.ai-image-providers',
          ],
          architectureLayer: 'mainline',
          architectureArea: 'operate',
        },
      },
      {
        path: 'system/operation-logs',
        name: 'system-operation-logs',
        component: () => import('@/views/system/OperationLogsView.vue'),
        meta: {
          title: '操作留痕审计',
          pagePermission: 'page.system.operation-logs',
          architectureLayer: 'tooling',
          architectureArea: 'tooling',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/shared/NotFoundView.vue'),
    meta: {
      public: true,
      title: '页面不存在',
    },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const permissionStore = usePermissionStore()
  document.title = `${to.meta.title || '平台后台'} | ${import.meta.env.VITE_APP_TITLE || `${ADMIN_BRAND.shortName}平台后台`}`

  if (!to.meta.public && !authStore.isAuthed) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (authStore.isAuthed && !authStore.initialized) {
    await authStore.bootstrap()
  }

  const pagePermission = to.meta.pagePermission as string | undefined
  const pagePermissions = to.meta.pagePermissions as string[] | undefined
  const canAccessPage =
    pagePermission
      ? permissionStore.canAccess(pagePermission)
      : pagePermissions?.length
        ? pagePermissions.some((permission) => permissionStore.canAccess(permission))
        : true
  if (!canAccessPage) {
    ElMessage.warning('当前账号没有该页面权限')
    if (!authStore.isAuthed) {
      return '/login'
    }
    return permissionStore.landingPath && permissionStore.landingPath !== to.path
      ? permissionStore.landingPath
      : '/403'
  }

  if (to.path === '/login' && authStore.isAuthed) {
    return permissionStore.landingPath || '/403'
  }

  return true
})

export default router
