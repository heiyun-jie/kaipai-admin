<template>
  <div class="admin-table-actions">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.admin-table-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  min-width: 0;
  white-space: nowrap;
}

.admin-table-actions :deep(.el-button.is-link),
.admin-table-actions :deep(.el-button--link) {
  min-height: 22px;
  padding: 0 2px;
  font-size: 12px;
}
</style>
