<template>
  <aside class="admin-sidebar" :data-collapsed="appStore.sidebarCollapsed">
    <div class="admin-sidebar__brand">
      <span class="admin-sidebar__mark">{{ ADMIN_BRAND.adminMark }}</span>
      <div v-if="!appStore.sidebarCollapsed" class="admin-sidebar__brand-copy">
        <p>{{ ADMIN_BRAND.adminRomanName }}</p>
        <strong>{{ ADMIN_BRAND.platformName }}</strong>
      </div>
    </div>

    <el-scrollbar class="admin-sidebar__scroll">
      <section v-for="section in sidebarSections" :key="section.key" class="admin-sidebar__section">
        <p v-if="!appStore.sidebarCollapsed" class="admin-sidebar__section-title">{{ section.label }}</p>
        <el-menu
          :default-active="route.path"
          :default-openeds="section.openKeys"
          :collapse="appStore.sidebarCollapsed"
          :collapse-transition="false"
          router
          class="admin-sidebar__menu"
        >
          <template v-for="item in section.items" :key="item.key">
            <el-sub-menu v-if="item.children?.length" :index="item.key">
              <template #title>
                <el-icon><component :is="iconOf(item.icon)" /></el-icon>
                <span>{{ item.label }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.key" :index="child.route || child.key">
                <el-icon><component :is="iconOf(child.icon)" /></el-icon>
                <span>{{ child.label }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.route || item.key">
              <el-icon><component :is="iconOf(item.icon)" /></el-icon>
              <span>{{ item.label }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </section>
    </el-scrollbar>

    <div class="admin-sidebar__footer">
      <div class="admin-sidebar__identity" :data-collapsed="appStore.sidebarCollapsed">
        <span class="admin-sidebar__identity-badge">{{ identityBadge }}</span>
        <div v-if="!appStore.sidebarCollapsed" class="admin-sidebar__identity-copy">
          <strong>{{ identityTitle }}</strong>
          <span>{{ identitySubtitle }}</span>
        </div>
      </div>
      <el-button circle plain class="admin-sidebar__collapse" @click="appStore.toggleSidebar()">
        <el-icon><Fold /></el-icon>
      </el-button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Avatar,
  Box,
  ChatDotRound,
  CircleCheck,
  Coin,
  Connection,
  DataBoard,
  Document,
  Files,
  Fold,
  Histogram,
  List,
  MagicStick,
  Medal,
  Memo,
  Picture,
  Postcard,
  Setting,
  SetUp,
  Tickets,
  UserFilled,
  Warning,
  Wallet,
} from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import type { AdminMenuItem } from '@/types/admin'
import { ADMIN_BRAND } from '@/constants/brand'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

type SidebarSection = {
  key: string
  label: string
  items: AdminMenuItem[]
  openKeys: string[]
}

const icons = {
  Avatar,
  Box,
  ChatDotRound,
  CircleCheck,
  Coin,
  Connection,
  DataBoard,
  Document,
  Files,
  Histogram,
  List,
  MagicStick,
  Medal,
  Memo,
  Picture,
  Postcard,
  Setting,
  SetUp,
  Tickets,
  UserFilled,
  Warning,
  Wallet,
}

const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const { sidebarMenus } = storeToRefs(permissionStore)

const currentRoleLabel = computed(() => authStore.session?.roleCodes?.join(' / ') || 'ADMIN')
const identityBadge = computed(() => (authStore.session?.roleCodes?.includes('ADMIN') ? '管' : (authStore.session?.userName || 'A').slice(0, 1)))
const identityTitle = computed(() => `平台运营 · ${authStore.session?.userName || 'Admin'}`)
const identitySubtitle = computed(() => currentRoleLabel.value || 'SUPER ROLE')

const sidebarSections = computed<SidebarSection[]>(() => {
  if (!sidebarMenus.value.length) {
    return []
  }
  return ([
    ['overview', 'OVERVIEW'],
    ['growth', 'GROWTH'],
    ['operate', 'OPERATE'],
  ] as const)
    .map(([key, label]) => buildSection(key, label, sidebarMenus.value.filter((item) => (item.section || 'overview') === key)))
    .filter((section) => section.items.length)
})

function buildSection(key: string, label: string, items: AdminMenuItem[]): SidebarSection {
  return {
    key,
    label,
    items,
    openKeys: items.filter((item) => item.children?.length).map((item) => item.key),
  }
}

function iconOf(name?: string) {
  return icons[(name || 'Document') as keyof typeof icons] || Document
}
</script>

<style scoped lang="scss">
.admin-sidebar {
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  align-self: flex-start;
  width: 232px;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  padding: 14px 14px 14px;
  border-right: 1px solid rgba(34, 31, 28, 0.08);
  background:
    linear-gradient(180deg, rgba(248, 244, 238, 0.98), rgba(241, 236, 228, 0.95)),
    rgba(247, 243, 236, 0.96);
  transition: width 0.25s ease;
}

.admin-sidebar[data-collapsed='true'] {
  width: 86px;
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 16px;
}

.admin-sidebar__brand-copy {
  display: grid;
  gap: 2px;

  p {
    margin: 0;
    color: rgba(47, 36, 27, 0.42);
    font-size: 11px;
    letter-spacing: 0.28em;
  }

  strong {
    font-size: 21px;
    letter-spacing: 0.08em;
  }
}

.admin-sidebar__mark {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #221f1c;
  color: #f5efe6;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  box-shadow: 0 8px 20px rgba(34, 31, 28, 0.16);
}

.admin-sidebar__scroll {
  flex: 1;
  min-height: 0;
}

.admin-sidebar__section {
  display: grid;
  gap: 8px;
}

.admin-sidebar__section + .admin-sidebar__section {
  margin-top: 10px;
}

.admin-sidebar__section-title {
  margin: 0;
  padding: 0 12px;
  color: rgba(47, 36, 27, 0.42);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.34em;
}

:deep(.admin-sidebar__menu) {
  border-right: none;
  background: transparent;
}

:deep(.admin-sidebar__menu .el-menu-item),
:deep(.admin-sidebar__menu .el-sub-menu__title) {
  height: 40px;
  margin-bottom: 4px;
  border-radius: 11px;
  color: rgba(47, 36, 27, 0.68);
}

:deep(.admin-sidebar__menu .el-menu-item .el-icon),
:deep(.admin-sidebar__menu .el-sub-menu__title .el-icon) {
  margin-right: 10px;
  font-size: 15px;
}

:deep(.admin-sidebar__menu .el-menu-item.is-active) {
  background: #221f1c;
  color: #f6efe6;
  box-shadow: 0 10px 24px rgba(34, 31, 28, 0.16);
}

:deep(.admin-sidebar__menu .el-sub-menu.is-active > .el-sub-menu__title) {
  color: #221f1c;
}

:deep(.admin-sidebar__menu .el-sub-menu .el-menu) {
  background: transparent;
}

:deep(.admin-sidebar__menu .el-sub-menu .el-menu-item) {
  min-width: 0;
  padding-left: 46px !important;
}

.admin-sidebar__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 4px 2px;
  border-top: 1px solid rgba(34, 31, 28, 0.08);
}

.admin-sidebar__identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 4px;
}

.admin-sidebar__identity[data-collapsed='true'] {
  justify-content: center;
  width: 100%;
  padding: 0;
}

.admin-sidebar__identity-badge {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(164, 128, 82, 0.18);
  color: #7b5b33;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.admin-sidebar__identity-copy {
  display: grid;
  min-width: 0;
  gap: 2px;

  strong {
    font-size: 12px;
    white-space: nowrap;
  }

  span {
    color: rgba(47, 36, 27, 0.48);
    font-size: 10px;
    letter-spacing: 0.16em;
    white-space: nowrap;
  }
}

.admin-sidebar__collapse {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-color: rgba(34, 31, 28, 0.08);
  background: rgba(255, 255, 255, 0.78);
}

@media (max-width: 760px) {
  .admin-sidebar {
    position: relative;
    top: auto;
    align-self: stretch;
    width: 100%;
    height: auto;
    min-height: 0;
  }
}
</style>
