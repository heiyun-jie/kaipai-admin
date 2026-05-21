<template>
  <div class="forbidden-page">
    <div class="forbidden-card">
      <p>FORBIDDEN / 403</p>
      <h1>当前账号没有访问权限</h1>
      <span>请确认当前账号是否分配了对应页面权限，再返回控制台处理现有功能。</span>
      <el-button type="primary" @click="handlePrimaryAction">{{ primaryActionLabel }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePermissionStore } from '@/stores/permission';

const router = useRouter();
const authStore = useAuthStore();
const permissionStore = usePermissionStore();
const primaryActionLabel = computed(() => (permissionStore.landingPath ? '返回可用页面' : '退出并重新登录'));

function handlePrimaryAction() {
  if (permissionStore.landingPath) {
    router.push(permissionStore.landingPath);
    return;
  }
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped lang="scss">
.forbidden-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.forbidden-card {
  display: grid;
  gap: 12px;
  width: min(560px, 100%);
  padding: 40px;
  border-radius: 32px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(245, 238, 229, 0.82)),
    rgba(255, 251, 246, 0.86);
  text-align: center;
  box-shadow: 0 24px 48px rgba(63, 42, 20, 0.08);

  p {
    margin: 0;
    color: rgba(47, 36, 27, 0.42);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.3em;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 4vw, 42px);
  }

  span {
    color: rgba(47, 36, 27, 0.58);
    line-height: 1.7;
  }
}
</style>
