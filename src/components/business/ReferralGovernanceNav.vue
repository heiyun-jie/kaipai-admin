<template>
  <section class="referral-nav">
    <div class="referral-nav__copy">
      <p class="referral-nav__eyebrow">REFERRAL GOVERNANCE</p>
      <h3>邀请治理入口链</h3>
      <p class="referral-nav__description">在异常邀请、邀请记录、邀请资格和邀请规则之间快速切换，保持治理链闭环。</p>
    </div>
    <div class="referral-nav__actions">
      <el-button
        v-for="item in navItems"
        :key="item.path"
        class="referral-nav__button"
        :class="{ 'referral-nav__button--active': route.path === item.path }"
        :type="route.path === item.path ? 'primary' : undefined"
        :plain="route.path !== item.path"
        @click="goTo(item.path)"
      >
        {{ item.label }}
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { buildReferralGovernanceRouteQuery } from '@/utils/dashboard-context'

const route = useRoute()
const router = useRouter()

const navItems = [
  { label: '异常邀请', path: '/referral/risk' },
  { label: '邀请记录', path: '/referral/records' },
  { label: '邀请资格', path: '/referral/eligibility' },
  { label: '邀请规则', path: '/referral/policies' },
]

function goTo(path: string) {
  if (route.path === path) {
    return
  }
  router.push({
    path,
    query: buildReferralGovernanceRouteQuery(route.query, path),
  })
}
</script>

<style scoped lang="scss">
.referral-nav {
  display: grid;
  gap: 16px;
  padding: 22px 24px;
  border: 1px solid rgba(196, 122, 40, 0.16);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(196, 122, 40, 0.12), transparent 28%),
    linear-gradient(140deg, rgba(255, 252, 248, 0.95), rgba(250, 243, 234, 0.92));
}

.referral-nav__copy {
  display: grid;
  gap: 8px;
}

.referral-nav__eyebrow {
  margin: 0;
  color: var(--kp-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.referral-nav__copy h3 {
  margin: 0;
  font-size: 22px;
}

.referral-nav__description {
  margin: 0;
  color: var(--kp-text-secondary);
  line-height: 1.75;
}

.referral-nav__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.referral-nav__button {
  min-height: 38px;
  padding-inline: 16px;
  border-radius: 999px;
  font-weight: 700;
}

.referral-nav__button--active {
  box-shadow: 0 10px 22px rgba(196, 122, 40, 0.18);
}

@media (max-width: 960px) {
  .referral-nav__button {
    width: 100%;
  }
}
</style>
