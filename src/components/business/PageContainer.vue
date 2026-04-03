<template>
  <section class="page-container">
    <div v-if="$slots.actions" class="page-container__actions">
      <slot name="actions" />
    </div>
    <div class="page-container__content">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.page-container {
  display: grid;
  gap: 16px;
  width: min(100%, var(--kp-layout-max));
  margin: 0 auto;
}

.page-container__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.page-container__actions :deep(.el-button) {
  min-height: 42px;
  padding-inline: 18px;
  border-radius: 14px;
  font-weight: 700;
}

.page-container__content {
  display: grid;
  gap: 16px;
}

@media (max-width: 900px) {
  .page-container__actions {
    justify-content: flex-start;
  }
}
</style>
