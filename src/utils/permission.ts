import type { AdminMenuItem } from '@/types/admin'

export function hasPermission(source: string[], target?: string) {
  if (!target) {
    return true
  }
  return source.includes(target)
}

export function hasAnyPermission(source: string[], targets?: string[]) {
  if (!targets?.length) {
    return false
  }
  return targets.some((target) => source.includes(target))
}

export function filterMenus(menus: AdminMenuItem[], permissions: string[]): AdminMenuItem[] {
  return menus
    .map((item): AdminMenuItem | null => {
      const visibleByMenu = !item.menuPermission || permissions.includes(item.menuPermission)
      const visibleByPage = item.pagePermission
        ? hasPermission(permissions, item.pagePermission)
        : item.anyPagePermissions?.length
          ? hasAnyPermission(permissions, item.anyPagePermissions)
          : true
      const children: AdminMenuItem[] | undefined = item.children ? filterMenus(item.children, permissions) : undefined
      const visible =
        visibleByMenu &&
        (visibleByPage || Boolean(children?.length) || (!item.pagePermission && !item.anyPagePermissions?.length && Boolean(item.route)))

      if (!visible) {
        return null
      }

      return {
        ...item,
        children,
      }
    })
    .filter((item): item is AdminMenuItem => Boolean(item))
}
