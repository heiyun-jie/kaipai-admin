<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const currentPage = defineModel<number>('currentPage', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

const emit = defineEmits<{
  (event: 'current-change', value: number): void
  (event: 'size-change', value: number): void
}>()

function handleCurrentChange(value: number) {
  emit('current-change', value)
}

function handleSizeChange(value: number) {
  emit('size-change', value)
}
</script>

<template>
  <el-pagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    v-bind="$attrs"
    @current-change="handleCurrentChange"
    @size-change="handleSizeChange"
  />
</template>
