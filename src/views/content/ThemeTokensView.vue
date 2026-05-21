<template>
  <PageContainer>
    <GovernanceOverviewCards :cards="overviewCards" />

    <FilterPanel description="按模板、场景和状态回看主题 Token，并在 JSON 校验通过后执行最小编辑。">
      <el-form :model="filters" inline>
        <el-form-item label="模板 ID">
          <el-input v-model.number="filters.templateId" clearable placeholder="模板 ID" />
        </el-form-item>
        <el-form-item label="模板编码">
          <el-input v-model="filters.templateCode" clearable placeholder="模板编码" />
        </el-form-item>
        <el-form-item label="场景">
          <el-input v-model="filters.templateSceneCode" clearable placeholder="模板场景码" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusValue" clearable placeholder="全部状态" style="width: 160px">
            <el-option label="草稿" :value="0" />
            <el-option label="已发布" :value="1" />
            <el-option label="已停用" :value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="primary" @click="loadTokens">查询</el-button>
      </template>
    </FilterPanel>

    <el-card class="table-card" shadow="never">
      <div class="table-header">
        <div>
          <p class="table-header__eyebrow">THEME GOVERNANCE</p>
          <h3>主题 Token 列表</h3>
        </div>
        <span class="table-header__hint">当前页只承接模板主题 JSON 的台账回看与最小编辑，不扩展新的模板治理动作。</span>
      </div>
      <el-table :data="rows" v-loading="loading">
        <el-table-column prop="templateId" label="模板 ID" min-width="110" />
        <el-table-column label="模板" min-width="220">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ row.templateName || '--' }}</strong>
              <span>{{ row.templateCode || '--' }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column prop="templateSceneCode" label="场景" min-width="120" />
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <StatusTag v-bind="resolveTemplateStatus(row.status)" />
          </template>
        </el-table-column>
        <el-table-column label="主题摘要" min-width="320">
          <template #default="{ row }">
            <StackCell>
              <strong>{{ summarizeThemeJson(row.baseThemeJson) }}</strong>
              <span>{{ summarizeThemeKeys(row.baseThemeJson) }}</span>
            </StackCell>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="170">
          <template #default="{ row }">
            <TableActions>
              <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
              <PermissionButton link action="action.content.theme.edit" @click="openEdit(row)">
                编辑
              </PermissionButton>
            </TableActions>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <strong>当前条件下没有主题 Token</strong>
            <p>可以切换模板、场景或状态，查看模板主题 JSON 台账。</p>
          </div>
        </template>
      </el-table>
      <div class="pager">
        <AdminPager
          v-model:current-page="filters.pageNo"
          v-model:page-size="filters.pageSize"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[20, 50, 100]"
          :total="total"
          @current-change="loadTokens"
          @size-change="loadTokens"
        />
      </div>
    </el-card>

    <AdminDetailDrawer v-model="detailVisible" title="主题 Token 详情" size="860px" destroy-on-close>
      <div v-if="currentToken" class="detail-layout">
        <section class="drawer-hero">
          <div>
            <p>THEME DETAIL / 主题台账</p>
            <strong>{{ currentToken.templateName || currentToken.templateCode || '--' }}</strong>
            <span>{{ currentToken.templateSceneCode || '--' }} · 模板 {{ currentToken.templateId }}</span>
          </div>
          <StatusTag v-bind="resolveTemplateStatus(currentToken.status)" />
        </section>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>记录概览</h3></template>
          <DetailGrid>
            <DetailBlock v-for="item in detailBlocks" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </DetailBlock>
          </DetailGrid>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><h3>主题 JSON</h3></template>
          <pre class="payload-pre">{{ formatJsonPayload(currentToken.baseThemeJson) }}</pre>
        </el-card>
      </div>
    </AdminDetailDrawer>

    <el-dialog
      v-model="editorVisible"
      title="编辑主题 Token"
      width="760px"
      destroy-on-close
      class="theme-edit-dialog"
    >
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">THEME EDITOR / 主题编辑</p>
        <strong>{{ editorTargetTitle }}</strong>
        <p>当前仅做最小 JSON 编辑，提交前会做基础 JSON 合法性校验。</p>
      </section>
      <el-form label-position="top">
        <el-form-item label="模板 ID">
          <el-input :model-value="String(currentToken?.templateId || '--')" disabled />
        </el-form-item>
        <el-form-item label="场景">
          <el-input :model-value="currentToken?.templateSceneCode || '--'" disabled />
        </el-form-item>
        <el-form-item label="主题 JSON">
          <el-input
            v-model="editorForm.baseThemeJson"
            type="textarea"
            :rows="16"
            placeholder='{"themeColors":{"primary":"#2F6B5F"}}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchThemeTokens, updateThemeTokens } from '@/api/content'
import FilterPanel from '@/components/business/FilterPanel.vue'
import GovernanceOverviewCards from '@/components/business/GovernanceOverviewCards.vue'
import PageContainer from '@/components/business/PageContainer.vue'
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { templateStatusMap } from '@/constants/status'
import type { ThemeTokenItem, ThemeTokenQuery } from '@/types/content'
import { formatDateTime } from '@/utils/format'
import AdminPager from '@/components/business/AdminPager.vue'
import AdminDetailDrawer from '@/components/business/AdminDetailDrawer.vue'

const loading = ref(false)
const submitting = ref(false)
const rows = ref<ThemeTokenItem[]>([])
const total = ref(0)
const detailVisible = ref(false)
const editorVisible = ref(false)
const currentToken = ref<ThemeTokenItem | null>(null)

const filters = reactive<ThemeTokenQuery>({
  pageNo: 1,
  pageSize: 20,
  templateSceneCode: '',
  status: undefined,
  templateId: undefined,
  templateCode: '',
})

const editorForm = reactive({
  baseThemeJson: '',
})

const statusValue = computed({
  get: () => filters.status,
  set: (value: number | undefined) => {
    filters.status = value == null ? undefined : Number(value)
  },
})

const overviewCards = computed(() => {
  const publishedCount = rows.value.filter((item) => item.status === 1).length
  const sceneCount = new Set(rows.value.map((item) => item.templateSceneCode).filter((item) => item)).size
  const editableCount = rows.value.filter((item) => item.baseThemeJson).length

  return [
    {
      label: '查询规模',
      badge: '当前查询',
      tone: null,
      value: `${total.value} 条`,
      hint: '当前筛选条件下的主题 Token 总数。',
    },
    {
      label: '当前页已发布',
      badge: 'status=1',
      tone: 'success' as const,
      value: `${publishedCount} 条`,
      hint: '当前页已发布模板的主题 Token 数量。',
    },
    {
      label: '当前页场景',
      badge: 'scene',
      tone: 'info' as const,
      value: `${sceneCount} 个 / ${editableCount} 条可编辑`,
      hint: '当前页涉及的场景数，以及具备主题 JSON 的记录数。',
    },
  ]
})

const detailBlocks = computed(() => {
  if (!currentToken.value) {
    return []
  }
  return [
    { label: '模板 ID', value: currentToken.value.templateId },
    { label: '模板编码', value: currentToken.value.templateCode || '--' },
    { label: '模板名称', value: currentToken.value.templateName || '--' },
    { label: '场景', value: currentToken.value.templateSceneCode || '--' },
    { label: '状态', value: resolveTemplateStatus(currentToken.value.status).label },
    { label: '更新时间', value: formatDateTime(currentToken.value.updateTime) },
  ]
})

const editorTargetTitle = computed(() => currentToken.value?.templateName || currentToken.value?.templateCode || '编辑主题 Token')

function resolveTemplateStatus(status?: number | null) {
  return templateStatusMap[status ?? 0] || templateStatusMap[0]
}

function parseThemeJson(raw?: string | null) {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function summarizeThemeJson(raw?: string | null) {
  const parsed = parseThemeJson(raw)
  if (!parsed) {
    return raw ? '原始 JSON 可回看' : '--'
  }
  const themeColors = typeof parsed.themeColors === 'object' && parsed.themeColors ? parsed.themeColors as Record<string, unknown> : null
  if (themeColors?.primary) {
    return `primary ${String(themeColors.primary)}`
  }
  return `${Object.keys(parsed).length} 个顶层字段`
}

function summarizeThemeKeys(raw?: string | null) {
  const parsed = parseThemeJson(raw)
  if (!parsed) {
    return raw ? '未解析 JSON 结构' : '--'
  }
  return Object.keys(parsed).join(' / ') || '--'
}

function formatJsonPayload(raw?: string | null) {
  if (!raw) {
    return '--'
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

async function loadTokens() {
  loading.value = true
  try {
    const result = await fetchThemeTokens(filters)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function openDetail(row: ThemeTokenItem) {
  currentToken.value = row
  detailVisible.value = true
}

function openEdit(row: ThemeTokenItem) {
  currentToken.value = row
  editorForm.baseThemeJson = formatJsonPayload(row.baseThemeJson)
  editorVisible.value = true
}

async function submitEdit() {
  if (!currentToken.value) {
    return
  }
  if (!editorForm.baseThemeJson.trim()) {
    ElMessage.warning('请输入主题 JSON')
    return
  }
  try {
    JSON.parse(editorForm.baseThemeJson)
  } catch {
    ElMessage.warning('主题 JSON 格式不合法，请先修正后再提交')
    return
  }

  submitting.value = true
  try {
    await updateThemeTokens(currentToken.value.templateId, { baseThemeJson: editorForm.baseThemeJson })
    ElMessage.success('主题 Token 已更新')
    editorVisible.value = false
    await loadTokens()
    const refreshed = rows.value.find((item) => item.templateId === currentToken.value?.templateId)
    if (refreshed) {
      currentToken.value = refreshed
    }
  } finally {
    submitting.value = false
  }
}

function resetFilters() {
  filters.pageNo = 1
  filters.pageSize = 20
  filters.templateSceneCode = ''
  filters.status = undefined
  filters.templateId = undefined
  filters.templateCode = ''
  loadTokens()
}

onMounted(loadTokens)
</script>

<style scoped lang="scss">
.table-empty {
  display: grid;
  gap: 8px;
  padding: 32px 16px 36px;
  text-align: center;

  strong {
    font-size: 20px;
  }

  p {
    max-width: 420px;
    margin: 0 auto;
    color: var(--kp-text-secondary);
    line-height: 1.75;
  }
}

.payload-pre {
  min-height: 180px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(34, 31, 28, 0.04);
  color: rgba(47, 36, 27, 0.78);
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.theme-edit-dialog .dialog-intro) {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(47, 36, 27, 0.04);
}

:deep(.theme-edit-dialog .dialog-intro__eyebrow) {
  margin: 0;
  color: rgba(47, 36, 27, 0.48);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

:deep(.theme-edit-dialog .dialog-intro strong) {
  font-size: 18px;
  line-height: 1.2;
}

:deep(.theme-edit-dialog .dialog-intro p:last-child) {
  margin: 0;
  color: var(--kp-text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
</style>
