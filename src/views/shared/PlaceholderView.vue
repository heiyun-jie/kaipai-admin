<template>
  <PageContainer>
    <el-card class="placeholder-card" shadow="never">
      <h3>页面建设中</h3>
      <p>该页面入口已预留，后续将补充完整的业务数据、处理动作与操作说明。</p>
    </el-card>
  </PageContainer>
</template>

<script setup lang="ts">
import PageContainer from '@/components/business/PageContainer.vue'
</script>

<style scoped lang="scss">
.placeholder-card {
  border: 1px solid var(--kp-border);
  background: var(--kp-surface);
}
</style>
