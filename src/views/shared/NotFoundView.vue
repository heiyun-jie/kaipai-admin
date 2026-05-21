<template>
  <div class="not-found">
    <div class="not-found__panel">
      <p>NOT FOUND / 404</p>
      <h1>页面不存在</h1>
      <span>当前后台控制台中找不到这个页面入口，请返回已存在的功能模块处理。</span>
      <el-button type="primary" @click="router.push('/dashboard')">返回工作台</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped lang="scss">
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.not-found__panel {
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
