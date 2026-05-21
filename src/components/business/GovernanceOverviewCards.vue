<template>
  <section class="console-overview governance-overview">
    <article
      v-for="(card, index) in cards"
      :key="card.label"
      class="console-overview-card governance-overview__card"
      :data-dark="index === 0"
    >
      <div class="console-overview-card__head governance-overview__head">
        <p>{{ card.label }}</p>
        <StatusTag v-if="card.tone" :label="card.badge" :tone="card.tone" />
        <span v-else class="governance-overview__badge">{{ card.badge }}</span>
      </div>
      <strong>{{ card.value }}</strong>
      <small>{{ card.hint }}</small>
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
.governance-overview__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(34, 31, 28, 0.06);
  color: rgba(47, 36, 27, 0.56);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.governance-overview__card[data-dark='true'] .governance-overview__badge {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(246, 239, 230, 0.76);
}
</style>
