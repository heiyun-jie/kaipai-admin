<template>
  <section class="governance-overview">
    <article v-for="card in cards" :key="card.label" class="governance-overview__card">
      <div class="governance-overview__head">
        <p>{{ card.label }}</p>
        <StatusTag v-if="card.tone" :label="card.badge" :tone="card.tone" />
        <span v-else class="governance-overview__badge">{{ card.badge }}</span>
      </div>
      <strong>{{ card.value }}</strong>
      <span>{{ card.hint }}</span>
    </article>
  </section>
</template>

<script setup lang="ts">
import StatusTag from '@/components/business/StatusTag.vue'

type StatusTone = 'info' | 'warning' | 'success' | 'danger'

defineProps<{
  cards: Array<{
    label: string
    badge: string
    tone?: StatusTone | null
    value: string
    hint: string
  }>
}>()
</script>

<style scoped lang="scss">
.governance-overview {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.governance-overview__card {
  display: grid;
  gap: 12px;
  min-height: 172px;
  padding: 22px 22px 20px;
  border: 1px solid rgba(196, 77, 52, 0.12);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(196, 77, 52, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(247, 240, 231, 0.92));
  box-shadow: 0 14px 28px rgba(63, 42, 20, 0.07);
}

.governance-overview__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;

  p {
    margin: 0;
    color: var(--kp-text-secondary);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
}

.governance-overview__badge {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--kp-accent-deep);
  font-size: 12px;
  font-weight: 700;
}

.governance-overview__card strong {
  font-size: 24px;
  line-height: 1.35;
}

.governance-overview__card span {
  color: var(--kp-text-secondary);
  line-height: 1.75;
}

@media (max-width: 1100px) {
  .governance-overview {
    grid-template-columns: 1fr;
  }
}
</style>
