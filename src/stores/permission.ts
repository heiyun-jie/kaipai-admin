import { computed } from 'vue'
import { defineStore } from 'pinia'
import { adminMenus, adminSidebarMenus } from '@/constants/menus'
import type { AdminMenuItem } from '@/types/admin'
import { useAuthStore } from './auth'
import { filterMenus, hasPermission } from '@/utils/permission'

export const usePermissionStore = defineStore('permission', () => {
  const authStore = useAuthStore()

  const menus = computed(() => filterMenus(adminMenus as AdminMenuItem[], authStore.permissionSet))
  const sidebarMenus = computed(() => filterMenus(adminSidebarMenus as AdminMenuItem[], authStore.permissionSet))
  const landingPath = computed(() => {
    const first = sidebarMenus.value[0] || menus.value[0]
    if (!first) {
      return ''
    }
    return first.route || first.children?.[0]?.route || ''
  })

  function canAccess(permission?: string) {
    return hasPermission(authStore.permissionSet, permission)
  }

  function hasAction(permission?: string) {
    return canAccess(permission)
  }

  function hasPage(permission?: string) {
    return canAccess(permission)
  }

  return {
    menus,
    sidebarMenus,
    landingPath,
    canAccess,
    hasAction,
    hasPage,
  }
})
