<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const visible = defineModel<boolean>({ required: true })
</script>

<template>
  <el-drawer v-model="visible" v-bind="$attrs">
    <slot />
  </el-drawer>
</template>
