<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  hint: string
}>()
</script>

<template>
  <section class="template-config-panel">
    <div class="template-config-panel__head">
      <div>
        <p>{{ eyebrow }}</p>
        <strong>{{ title }}</strong>
      </div>
      <span>{{ hint }}</span>
    </div>
    <slot />
  </section>
</template>

<style scoped lang="scss">
.template-config-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
}

.template-config-panel__head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;

  p {
    margin: 0 0 6px;
    color: rgba(47, 36, 27, 0.45);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
  }

  strong {
    font-size: 18px;
    line-height: 1.2;
  }

  span {
    color: rgba(47, 36, 27, 0.48);
    font-size: 12px;
    line-height: 1.5;
    text-align: right;
  }
}

@media (max-width: 720px) {
  .template-config-panel__head {
    grid-template-columns: 1fr;
  }

  .template-config-panel__head span {
    text-align: left;
  }
}
</style>
