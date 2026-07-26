<template>
  <el-card
    v-if="canRead || canAudit"
    class="profile-import-prompt-panel"
    shadow="never"
  >
    <header class="prompt-panel-header">
      <div>
        <h3>识别模板</h3>
        <p v-if="canRead">{{ selectedTemplate?.displayName || 'Prompt 版本治理' }}</p>
        <p v-else>Prompt 模板审计</p>
      </div>
      <el-button
        v-if="canRead"
        class="prompt-template-refresh"
        circle
        :icon="Refresh"
        :loading="templateLoading"
        :disabled="mutationLoading"
        aria-label="刷新识别模板"
        title="刷新识别模板"
        @click="loadTemplates()"
      />
    </header>

    <section v-if="canRead" class="prompt-version-section">
      <div v-if="templateLoadError" class="prompt-template-error" role="alert">
        <span>模板加载失败</span>
        <el-button class="prompt-template-retry" :disabled="templateLoading || mutationLoading" @click="loadTemplates()">
          重试
        </el-button>
      </div>

      <template v-else>
        <el-tabs
          v-model="selectedTemplateCode"
          class="prompt-scene-tabs"
          @tab-change="handleTemplateChange"
        >
          <el-tab-pane
            v-for="template in templates"
            :key="template.templateCode"
            :label="sceneLabel(template.scene)"
            :name="template.templateCode"
          />
        </el-tabs>

        <template v-if="selectedTemplate">
          <div class="prompt-summary-toolbar">
            <div class="prompt-summary-grid" aria-label="模板版本概览">
              <div class="prompt-summary-item">
                <span>当前版本</span>
                <strong>{{ activeVersionLabel }}</strong>
              </div>
              <div class="prompt-summary-item">
                <span>开放草稿</span>
                <strong>{{ draftVersionLabel }}</strong>
              </div>
              <div class="prompt-summary-item">
                <span>草稿试运行</span>
                <StatusTag
                  :label="testStatusLabel(selectedTemplate.draftTestStatus || 'untested')"
                  :tone="testStatusTone(selectedTemplate.draftTestStatus || 'untested')"
                />
              </div>
              <div class="prompt-summary-item">
                <span>当前内容哈希</span>
                <strong class="hash-value">{{ hashPrefix(selectedTemplate.activeContentSha256) }}</strong>
              </div>
            </div>
          </div>

          <p v-if="versionLoadError" class="prompt-inline-error" role="alert">版本列表加载失败</p>
          <p v-if="panelError" class="prompt-inline-error" role="alert">{{ panelError }}</p>

          <div class="prompt-table-scroll" v-loading="versionsLoading">
            <el-table
              class="prompt-version-table"
              :data="versions"
              empty-text="暂无版本"
              row-key="promptVersionId"
            >
              <el-table-column label="版本" min-width="150">
                <template #default="{ row }">
                  <div class="version-cell">
                    <strong>v{{ row.versionNo }}</strong>
                    <span>{{ row.versionLabel }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="生命周期" width="112">
                <template #default="{ row }">
                  <StatusTag
                    :label="lifecycleLabel(row.lifecycleStatus)"
                    :tone="lifecycleTone(row.lifecycleStatus)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="内容哈希" width="132">
                <template #default="{ row }">
                  <span class="hash-value">{{ hashPrefix(row.contentSha256) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="试运行" min-width="190">
                <template #default="{ row }">
                  <div class="test-cell">
                    <StatusTag :label="testStatusLabel(row.testStatus)" :tone="testStatusTone(row.testStatus)" />
                    <span>{{ row.testedModelName || '未绑定模型' }}</span>
                    <small v-if="row.testStatus === 'success'">
                      {{ row.testCandidateCount }} 人 / {{ row.testWorkCount }} 项作品
                    </small>
                    <small v-else-if="row.testErrorCode">{{ row.testErrorCode }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作人 / 时间" min-width="170">
                <template #default="{ row }">
                  <div class="operator-cell">
                    <span>{{ row.updateUserName || '--' }}</span>
                    <small>{{ row.lastUpdate || '--' }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="390">
                <template #default="{ row }">
                  <TableActions class="prompt-row-actions">
                    <PermissionButton
                      v-if="row.lifecycleStatus !== 'abandoned' && (row.lifecycleStatus !== 'draft' || !canUpdate)"
                      mode="hide"
                      link
                      :icon="View"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplateRead"
                      :disabled="surfaceBusy"
                      data-action="view"
                      @click="openEditor(row.promptVersionId, false)"
                    >
                      查看正文
                    </PermissionButton>
                    <PermissionButton
                      v-if="row.lifecycleStatus === 'draft'"
                      mode="hide"
                      link
                      :icon="Edit"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplateUpdate"
                      :disabled="surfaceBusy"
                      data-action="edit"
                      @click="openEditor(row.promptVersionId, true)"
                    >
                      编辑
                    </PermissionButton>
                    <PermissionButton
                      v-if="row.lifecycleStatus !== 'abandoned'"
                      mode="hide"
                      link
                      :icon="VideoPlay"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplateTest"
                      :disabled="surfaceBusy"
                      data-action="test"
                      @click="runTest(row)"
                    >
                      固定样例试运行
                    </PermissionButton>
                    <PermissionButton
                      v-if="row.lifecycleStatus === 'draft'"
                      mode="hide"
                      link
                      :icon="Promotion"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplatePublish"
                      :disabled="surfaceBusy || row.testStatus !== 'success'"
                      data-action="publish"
                      @click="openAction('publish', row)"
                    >
                      发布
                    </PermissionButton>
                    <PermissionButton
                      v-if="row.lifecycleStatus === 'released' && !selectedTemplate.draftVersionId"
                      mode="hide"
                      link
                      :icon="Plus"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplateUpdate"
                      :disabled="surfaceBusy"
                      data-action="create"
                      @click="createDraft(row.promptVersionId)"
                    >
                      新建草稿
                    </PermissionButton>
                    <PermissionButton
                      v-if="row.lifecycleStatus === 'draft' && Boolean(selectedTemplate.activeVersionId)"
                      mode="hide"
                      link
                      :icon="Close"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplateUpdate"
                      :disabled="surfaceBusy"
                      data-action="abandon"
                      @click="openAction('abandon', row)"
                    >
                      放弃
                    </PermissionButton>
                    <PermissionButton
                      v-if="row.lifecycleStatus === 'released' && row.promptVersionId !== selectedTemplate.activeVersionId"
                      mode="hide"
                      link
                      :icon="RefreshLeft"
                      :action="PERMISSIONS.action.systemAiProfileImportTemplateRestore"
                      :disabled="surfaceBusy"
                      data-action="restore"
                      @click="openAction('restore', row)"
                    >
                      恢复
                    </PermissionButton>
                  </TableActions>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <section v-if="currentTestBinding" class="prompt-test-binding" aria-label="最近试运行绑定">
            <header>
              <div>
                <h4>最近试运行绑定</h4>
                <StatusTag
                  :label="currentTestBinding.status === 'success' ? '通过' : '失败'"
                  :tone="currentTestBinding.status === 'success' ? 'success' : 'danger'"
                />
              </div>
            </header>
            <dl>
              <div>
                <dt>版本绑定</dt>
                <dd>
                  v{{ currentTestBindingVersion?.versionNo ?? '--' }} · ID {{ currentTestBinding.promptVersionId }}
                </dd>
              </div>
              <div>
                <dt>Content SHA-256</dt>
                <dd class="hash-value binding-hash">{{ currentTestBinding.contentSha256 }}</dd>
              </div>
              <div>
                <dt>Runtime SHA-256</dt>
                <dd class="hash-value binding-hash">{{ currentTestBinding.runtimeSha256 }}</dd>
              </div>
              <div>
                <dt>Fixture</dt>
                <dd>{{ currentTestBinding.fixtureCode }} · {{ currentTestBinding.fixtureVersion }}</dd>
              </div>
              <div>
                <dt>Fixture SHA-256</dt>
                <dd class="hash-value binding-hash">{{ currentTestBinding.fixtureSha256 }}</dd>
              </div>
              <div>
                <dt>模型绑定</dt>
                <dd>{{ currentTestBinding.modelName }} · config {{ currentTestBinding.configVersion }}</dd>
              </div>
              <div>
                <dt>识别计数</dt>
                <dd>{{ currentTestBinding.candidateCount }} 人 / {{ currentTestBinding.workCount }} 项作品</dd>
              </div>
              <div>
                <dt>耗时</dt>
                <dd>{{ currentTestBinding.elapsedMs }} ms</dd>
              </div>
            </dl>
          </section>
        </template>
      </template>
    </section>

    <section v-if="canAudit" class="prompt-audit-section">
      <header class="prompt-section-heading">
        <div>
          <h4>Prompt 模板审计</h4>
          <p>最近治理动作</p>
        </div>
        <el-button
          circle
          :icon="Refresh"
          :loading="auditLoading"
          :disabled="mutationLoading"
          data-action="refresh-prompt-audit"
          aria-label="刷新 Prompt 模板审计"
          title="刷新 Prompt 模板审计"
          @click="loadAudits()"
        />
      </header>
      <p v-if="auditLoadError" class="prompt-inline-error" role="alert">Prompt 模板审计加载失败</p>
      <div class="prompt-table-scroll" v-loading="auditLoading">
        <el-table class="prompt-template-audit-table" :data="audits" empty-text="暂无 Prompt 模板审计">
          <el-table-column label="场景 / 模板" min-width="170">
            <template #default="{ row }">{{ auditTemplateLabel(row.templateId) }}</template>
          </el-table-column>
          <el-table-column prop="promptVersionId" label="版本 ID" width="110" />
          <el-table-column prop="actionCode" label="动作" min-width="140" />
          <el-table-column prop="resultStatus" label="结果" width="100" />
          <el-table-column prop="reasonCode" label="固定原因" min-width="150" />
          <el-table-column prop="operatorName" label="操作人" width="130" />
          <el-table-column prop="modelName" label="模型" min-width="150" />
          <el-table-column prop="message" label="消息" min-width="180" show-overflow-tooltip />
          <el-table-column prop="createTime" label="时间" width="180" />
        </el-table>
      </div>
    </section>

    <el-dialog
      v-model="editorOpen"
      class="prompt-editor-dialog"
      width="min(1040px, calc(100vw - 32px))"
      append-to-body
      destroy-on-close
      :close-on-click-modal="!mutationLoading"
      :close-on-press-escape="!mutationLoading"
      :show-close="!mutationLoading"
      @closed="resetEditor"
    >
      <template #header>
        <div class="prompt-dialog-heading">
          <strong>{{ editorEditable ? '编辑 Prompt 草稿' : '查看 Prompt 正文' }}</strong>
          <span v-if="editorDetail">v{{ editorDetail.versionNo }} · row {{ editor?.expectedVersion }}</span>
        </div>
      </template>

      <div v-loading="editorLoading">
        <el-form v-if="editor" label-position="top" class="prompt-editor-form">
          <el-form-item label="版本标签" class="prompt-field-version-label">
            <el-input v-model="editor.versionLabel" maxlength="80" :readonly="!editorEditable || mutationLoading" />
          </el-form-item>

          <div v-if="editorDetail" class="prompt-contract-grid">
            <div>
              <span>Schema</span>
              <strong>{{ editorDetail.schemaVersion }}</strong>
            </div>
            <div>
              <span>Contract</span>
              <strong>{{ editorDetail.contractVersion }}</strong>
            </div>
          </div>

          <el-form-item label="System Prompt" class="prompt-field-system">
            <el-input v-model="editor.systemPromptBody" type="textarea" :rows="12" resize="vertical" :readonly="!editorEditable || mutationLoading" />
          </el-form-item>
          <el-form-item label="Repair Prompt" class="prompt-field-repair">
            <el-input v-model="editor.repairPromptBody" type="textarea" :rows="8" resize="vertical" :readonly="!editorEditable || mutationLoading" />
          </el-form-item>
          <el-form-item label="变更摘要" class="prompt-field-summary">
            <el-input v-model="editor.changeSummary" maxlength="500" :readonly="!editorEditable || mutationLoading" />
          </el-form-item>

          <p v-if="editorError" class="prompt-inline-error prompt-editor-error" role="alert">
            {{ editorError }}
          </p>

          <section v-if="editorEditable && conflictSnapshot" class="prompt-conflict-snapshot" aria-label="服务端版本对照">
            <header>
              <div>
                <strong>服务端版本对照</strong>
                <span>row {{ conflictSnapshot.version }} · {{ conflictSnapshot.versionLabel }}</span>
              </div>
              <el-button
                :disabled="mutationLoading"
                data-action="adopt-server-version"
                @click="adoptServerVersion"
              >
                采用服务端版本号
              </el-button>
            </header>
            <div class="prompt-conflict-bodies">
              <label>
                <span>System Prompt</span>
                <el-input :model-value="conflictSnapshot.systemPromptBody" type="textarea" :rows="8" readonly />
              </label>
              <label>
                <span>Repair Prompt</span>
                <el-input :model-value="conflictSnapshot.repairPromptBody" type="textarea" :rows="6" readonly />
              </label>
            </div>
          </section>
        </el-form>
      </div>

      <template #footer>
        <div class="prompt-dialog-footer">
          <el-button :disabled="mutationLoading" @click="editorOpen = false">
            {{ editorEditable ? '取消' : '关闭' }}
          </el-button>
          <el-button
            v-if="editorEditable"
            type="primary"
            :loading="mutationLoading"
            :disabled="editorLoading || !editor"
            data-action="save"
            @click="saveDraft"
          >
            保存草稿
          </el-button>
        </div>
      </template>
    </el-dialog>

    <AuditConfirmDialog
      v-if="actionState"
      v-model="actionDialogOpen"
      :title="actionTitle"
      :summary="actionSummary"
      :confirm-text="actionConfirmText"
      :loading="mutationLoading"
      :require-reason="true"
      :reason-options="actionReasonOptions"
      placeholder="请选择固定原因"
      reason-label="固定原因"
      width="min(560px, calc(100vw - 32px))"
      @submit="submitAction"
    >
      <template #extra>
        <p v-if="actionError" class="prompt-inline-error prompt-action-error" role="alert">
          {{ actionError }}
        </p>
      </template>
    </AuditConfirmDialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Edit, Plus, Promotion, Refresh, RefreshLeft, VideoPlay, View } from '@element-plus/icons-vue'
import {
  abandonProfileImportPromptDraft,
  createProfileImportPromptDraft,
  fetchProfileImportPromptAudits,
  fetchProfileImportPromptTemplates,
  fetchProfileImportPromptVersion,
  fetchProfileImportPromptVersions,
  publishProfileImportPromptVersion,
  restoreProfileImportPromptTemplate,
  testProfileImportPromptVersion,
  updateProfileImportPromptDraft,
} from '@/api/ai'
import { PERMISSIONS } from '@/constants/permission'
import { usePermissionStore } from '@/stores/permission'
import { isApiBusinessError } from '@/utils/request'
import type {
  ProfileImportPromptAudit,
  ProfileImportPromptLifecycle,
  ProfileImportPromptReasonCode,
  ProfileImportPromptScene,
  ProfileImportPromptTemplateSummary,
  ProfileImportPromptTestResult,
  ProfileImportPromptTestStatus,
  ProfileImportPromptUpdateDraftPayload,
  ProfileImportPromptVersionDetail,
  ProfileImportPromptVersionSummary,
} from '@/types/ai'
import AuditConfirmDialog from '@/components/dialogs/AuditConfirmDialog.vue'
import TableActions from '@/components/tables/TableActions.vue'
import PermissionButton from './PermissionButton.vue'
import StatusTag from './StatusTag.vue'

type StatusTone = 'info' | 'warning' | 'success' | 'danger'
type PromptActionKind = 'publish' | 'restore' | 'abandon'

interface PromptActionState {
  kind: PromptActionKind
  template: ProfileImportPromptTemplateSummary
  version: ProfileImportPromptVersionSummary
}

const publishReasons = [
  { label: '首次发布', value: 'INITIAL_RELEASE' },
  { label: '质量调整', value: 'QUALITY_ADJUSTMENT' },
  { label: '模型配置对齐', value: 'CONFIG_ALIGNMENT' },
]
const restoreReasons = [
  { label: '质量回退', value: 'QUALITY_REGRESSION' },
  { label: '故障恢复', value: 'INCIDENT_ROLLBACK' },
]
const abandonReasons = [
  { label: '已有替代草稿', value: 'DRAFT_SUPERSEDED' },
  { label: '草稿内容无效', value: 'DRAFT_INVALID' },
]

const promptErrorCopy: Record<string, string> = {
  PROFILE_IMPORT_PROMPT_VERSION_CONFLICT: '版本已变化，请对照服务端版本人工合并',
  PROFILE_IMPORT_PROMPT_INVALID: '模板内容或操作参数无效',
  PROFILE_IMPORT_PROMPT_TEST_REQUIRED: '请先完成固定样例试运行',
  PROFILE_IMPORT_PROMPT_TEST_STALE: '试运行绑定已失效，请重新测试',
  PROFILE_IMPORT_PROMPT_STATE_CONFLICT: '当前模板状态不允许该操作',
}

const permissionStore = usePermissionStore()
const canRead = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportTemplateRead))
const canUpdate = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportTemplateUpdate))
const canTest = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportTemplateTest))
const canPublish = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportTemplatePublish))
const canRestore = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportTemplateRestore))
const canAudit = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportAudit))

const templates = ref<ProfileImportPromptTemplateSummary[]>([])
const versions = ref<ProfileImportPromptVersionSummary[]>([])
const audits = ref<ProfileImportPromptAudit[]>([])
const selectedTemplateCode = ref<ProfileImportPromptScene>('full_profile')
const templateLoading = ref(false)
const versionsLoading = ref(false)
const auditLoading = ref(false)
const templateLoadError = ref(false)
const versionLoadError = ref(false)
const auditLoadError = ref(false)
const panelError = ref('')
const mutationLoading = ref(false)
const editorOpen = ref(false)
const editorLoading = ref(false)
const editorEditable = ref(false)
const editorTemplateCode = ref<ProfileImportPromptScene | null>(null)
const editorVersionId = ref<number | null>(null)
const editor = ref<ProfileImportPromptUpdateDraftPayload | null>(null)
const editorDetail = ref<ProfileImportPromptVersionDetail | null>(null)
const editorError = ref('')
const conflictSnapshot = ref<ProfileImportPromptVersionDetail | null>(null)
const actionDialogOpen = ref(false)
const actionState = ref<PromptActionState | null>(null)
const actionError = ref('')
const testBindings = ref<Partial<Record<ProfileImportPromptScene, ProfileImportPromptTestResult>>>({})
let versionsRequestSequence = 0
let editorRequestSequence = 0

const selectedTemplate = computed(() =>
  templates.value.find((item) => item.templateCode === selectedTemplateCode.value) || null,
)
const surfaceBusy = computed(() =>
  mutationLoading.value || templateLoading.value || versionsLoading.value || auditLoading.value || editorLoading.value,
)
const currentTestBinding = computed(() => testBindings.value[selectedTemplateCode.value] || null)
const currentTestBindingVersion = computed(() => {
  const binding = currentTestBinding.value
  return binding ? versions.value.find((item) => item.promptVersionId === binding.promptVersionId) || null : null
})
const activeVersionLabel = computed(() => {
  const template = selectedTemplate.value
  if (!template?.activeVersionId) return '尚未发布'
  return `v${template.activeVersionNo ?? '--'} · ${template.activeVersionLabel || '未命名'}`
})
const draftVersionLabel = computed(() => {
  const template = selectedTemplate.value
  if (!template?.draftVersionId) return '无开放草稿'
  return `v${template.draftVersionNo ?? '--'} · ${template.draftVersionLabel || '未命名'}`
})
const actionReasonOptions = computed(() => {
  if (actionState.value?.kind === 'publish') return publishReasons
  if (actionState.value?.kind === 'restore') return restoreReasons
  return abandonReasons
})
const actionTitle = computed(() => {
  if (actionState.value?.kind === 'publish') return '发布 Prompt 版本'
  if (actionState.value?.kind === 'restore') return '恢复历史 Prompt 版本'
  return '放弃 Prompt 草稿'
})
const actionConfirmText = computed(() => {
  if (actionState.value?.kind === 'publish') return '确认发布'
  if (actionState.value?.kind === 'restore') return '确认恢复'
  return '确认放弃'
})
const actionSummary = computed(() => {
  const action = actionState.value
  if (!action) return ''
  const versionSummary = `${sceneLabel(action.template.scene)} · v${action.version.versionNo} · ${action.version.versionLabel}`
  if (action.kind === 'restore' && action.template.draftVersionId) {
    return `${versionSummary}；开放草稿 v${action.template.draftVersionNo ?? '--'} 仍保留`
  }
  return versionSummary
})

function promptErrorMessage(error: unknown, fallback: string) {
  if (isApiBusinessError(error) && error.errorCode) {
    return promptErrorCopy[error.errorCode] || fallback
  }
  return fallback
}

function sceneLabel(scene: ProfileImportPromptScene) {
  return scene === 'works_only' ? '仅作品' : '完整资料'
}

function lifecycleLabel(value: ProfileImportPromptLifecycle) {
  return value === 'released' ? '已发布' : value === 'abandoned' ? '已放弃' : '草稿'
}

function lifecycleTone(value: ProfileImportPromptLifecycle): StatusTone {
  return value === 'released' ? 'success' : value === 'abandoned' ? 'info' : 'warning'
}

function testStatusLabel(value: ProfileImportPromptTestStatus) {
  const labels: Record<ProfileImportPromptTestStatus, string> = {
    untested: '未测试',
    success: '通过',
    failed: '失败',
    stale: '已失效',
  }
  return labels[value]
}

function testStatusTone(value: ProfileImportPromptTestStatus): StatusTone {
  if (value === 'success') return 'success'
  if (value === 'failed') return 'danger'
  if (value === 'stale') return 'warning'
  return 'info'
}

function hashPrefix(value?: string | null) {
  return value ? value.slice(0, 12) : '--'
}

function auditTemplateLabel(templateId: number) {
  const template = templates.value.find((item) => item.templateId === templateId)
  return template ? `${sceneLabel(template.scene)} · ${templateId}` : `模板 ${templateId}`
}

async function loadTemplates(allowDuringMutation = false) {
  if (!canRead.value || templateLoading.value || (mutationLoading.value && !allowDuringMutation)) return
  templateLoading.value = true
  templateLoadError.value = false
  panelError.value = ''
  try {
    const result = await fetchProfileImportPromptTemplates()
    templates.value = result
    if (!result.some((item) => item.templateCode === selectedTemplateCode.value)) {
      selectedTemplateCode.value = result[0]?.scene || 'full_profile'
    }
    if (result.length) {
      await loadVersions(selectedTemplateCode.value)
    } else {
      versions.value = []
    }
  } catch {
    templates.value = []
    versions.value = []
    templateLoadError.value = true
  } finally {
    templateLoading.value = false
  }
}

async function loadVersions(templateCode: string) {
  if (!canRead.value) return
  const requestSequence = ++versionsRequestSequence
  versionsLoading.value = true
  versionLoadError.value = false
  try {
    const result = await fetchProfileImportPromptVersions(templateCode)
    if (requestSequence === versionsRequestSequence && templateCode === selectedTemplateCode.value) {
      versions.value = result
    }
  } catch {
    if (requestSequence === versionsRequestSequence) {
      versions.value = []
      versionLoadError.value = true
    }
  } finally {
    if (requestSequence === versionsRequestSequence) {
      versionsLoading.value = false
    }
  }
}

async function loadAudits(allowDuringMutation = false) {
  if (!canAudit.value || auditLoading.value || (mutationLoading.value && !allowDuringMutation)) return
  auditLoading.value = true
  auditLoadError.value = false
  try {
    audits.value = await fetchProfileImportPromptAudits()
  } catch {
    auditLoadError.value = true
  } finally {
    auditLoading.value = false
  }
}

async function handleTemplateChange(value: string | number) {
  const templateCode = String(value) as ProfileImportPromptScene
  if (editorLoading.value) {
    editorRequestSequence += 1
    editorLoading.value = false
  }
  selectedTemplateCode.value = templateCode
  versions.value = []
  panelError.value = ''
  await loadVersions(templateCode)
}

async function refreshAfterMutation() {
  await loadTemplates(true)
  if (canAudit.value) await loadAudits(true)
}

async function openEditor(versionId: number, editable: boolean) {
  if (!canRead.value || (editable && !canUpdate.value) || surfaceBusy.value) return
  const requestedTemplateCode = selectedTemplateCode.value
  const requestSequence = ++editorRequestSequence
  editorLoading.value = true
  editorError.value = ''
  conflictSnapshot.value = null
  try {
    const detail = await fetchProfileImportPromptVersion(versionId)
    if (requestSequence !== editorRequestSequence || requestedTemplateCode !== selectedTemplateCode.value) return
    editorEditable.value = editable
    editorTemplateCode.value = requestedTemplateCode
    editorVersionId.value = versionId
    editorDetail.value = detail
    editor.value = {
      versionLabel: detail.versionLabel,
      systemPromptBody: detail.systemPromptBody,
      repairPromptBody: detail.repairPromptBody,
      changeSummary: detail.changeSummary || '',
      expectedVersion: detail.version,
    }
    editorOpen.value = true
  } catch (error) {
    if (requestSequence === editorRequestSequence) {
      panelError.value = promptErrorMessage(error, '草稿详情加载失败')
    }
  } finally {
    if (requestSequence === editorRequestSequence) {
      editorLoading.value = false
    }
  }
}

function resetEditor() {
  if (mutationLoading.value) return
  editor.value = null
  editorEditable.value = false
  editorTemplateCode.value = null
  editorDetail.value = null
  editorVersionId.value = null
  editorError.value = ''
  conflictSnapshot.value = null
}

function adoptServerVersion() {
  if (!editor.value || !conflictSnapshot.value || mutationLoading.value) return
  editor.value.expectedVersion = conflictSnapshot.value.version
}

async function saveDraft() {
  const versionId = editorVersionId.value
  const localEditor = editor.value
  const templateCode = editorTemplateCode.value
  if (!versionId || !localEditor || !templateCode || !editorEditable.value || !canUpdate.value) return
  if (surfaceBusy.value) return
  mutationLoading.value = true
  editorError.value = ''
  conflictSnapshot.value = null
  try {
    await updateProfileImportPromptDraft(versionId, { ...localEditor })
    delete testBindings.value[templateCode]
    ElMessage.success('Prompt 草稿已保存')
    editorOpen.value = false
    await refreshAfterMutation()
  } catch (error) {
    editorError.value = promptErrorMessage(error, 'Prompt 草稿保存失败')
    if (isApiBusinessError(error) && error.errorCode === 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT') {
      try {
        conflictSnapshot.value = await fetchProfileImportPromptVersion(versionId)
      } catch {
        editorError.value = `${editorError.value}，服务端版本读取失败`
      }
    }
  } finally {
    mutationLoading.value = false
    if (!editorOpen.value) resetEditor()
  }
}

async function createDraft(sourceVersionId?: number) {
  const template = selectedTemplate.value
  if (!template || template.draftVersionId || !canUpdate.value) return
  if (surfaceBusy.value) return
  mutationLoading.value = true
  panelError.value = ''
  try {
    await createProfileImportPromptDraft(template.templateCode, {
      sourceVersionId: sourceVersionId || null,
      expectedTemplateVersion: template.version,
    })
    delete testBindings.value[template.scene]
    ElMessage.success('Prompt 草稿已创建')
    await refreshAfterMutation()
  } catch (error) {
    panelError.value = promptErrorMessage(error, 'Prompt 草稿创建失败')
  } finally {
    mutationLoading.value = false
  }
}

async function runTest(version: ProfileImportPromptVersionSummary) {
  if (!version.promptVersionId || version.lifecycleStatus === 'abandoned' || !canTest.value) return
  if (surfaceBusy.value) return
  const testedTemplateCode = selectedTemplateCode.value
  mutationLoading.value = true
  panelError.value = ''
  try {
    const result = await testProfileImportPromptVersion(version.promptVersionId)
    testBindings.value[testedTemplateCode] = result
    if (result.status === 'success') {
      ElMessage.success('固定样例试运行通过')
    } else {
      panelError.value = result.errorCode || '固定样例试运行失败'
    }
    await refreshAfterMutation()
  } catch (error) {
    panelError.value = promptErrorMessage(error, '固定样例试运行失败')
  } finally {
    mutationLoading.value = false
  }
}

function openAction(kind: PromptActionKind, version: ProfileImportPromptVersionSummary) {
  const template = selectedTemplate.value
  if (!template || surfaceBusy.value) return
  if (kind === 'publish' && !canPublish.value) return
  if (kind === 'restore' && !canRestore.value) return
  if (kind === 'abandon' && !canUpdate.value) return
  actionState.value = { kind, template: { ...template }, version: { ...version } }
  actionError.value = ''
  actionDialogOpen.value = true
}

async function submitAction(reason: string) {
  const action = actionState.value
  if (!action || !actionReasonOptions.value.some((item) => item.value === reason)) return
  if (mutationLoading.value) return
  mutationLoading.value = true
  actionError.value = ''
  try {
    const reasonCode = reason as ProfileImportPromptReasonCode
    if (action.kind === 'publish') {
      await publishProfileImportPromptVersion(action.version.promptVersionId, {
        reasonCode,
        expectedTemplateVersion: action.template.version,
        expectedVersion: action.version.version,
      })
      ElMessage.success('Prompt 版本已发布')
    } else if (action.kind === 'restore') {
      await restoreProfileImportPromptTemplate(
        action.template.templateCode,
        action.version.promptVersionId,
        { reasonCode, expectedTemplateVersion: action.template.version },
      )
      delete testBindings.value[action.template.scene]
      ElMessage.success('历史 Prompt 版本已恢复')
    } else {
      await abandonProfileImportPromptDraft(action.version.promptVersionId, {
        reasonCode,
        expectedTemplateVersion: action.template.version,
        expectedVersion: action.version.version,
      })
      delete testBindings.value[action.template.scene]
      ElMessage.success('Prompt 草稿已放弃')
    }
    actionDialogOpen.value = false
    await refreshAfterMutation()
  } catch (error) {
    actionError.value = promptErrorMessage(error, 'Prompt 版本操作失败')
  } finally {
    mutationLoading.value = false
    if (!actionDialogOpen.value) {
      actionState.value = null
      actionError.value = ''
    }
  }
}

watch(actionDialogOpen, (open) => {
  if (!open && !mutationLoading.value) {
    actionState.value = null
    actionError.value = ''
  }
})

onMounted(async () => {
  const work: Promise<unknown>[] = []
  if (canRead.value) work.push(loadTemplates())
  if (canAudit.value) work.push(loadAudits())
  await Promise.all(work)
})
</script>

<style scoped lang="scss">
.profile-import-prompt-panel {
  min-width: 0;
  border-radius: 8px;
  letter-spacing: 0;
}

.profile-import-prompt-panel :deep(.el-card__body) {
  min-width: 0;
  overflow: hidden;
}

.profile-import-prompt-panel :deep(.status-tag) {
  min-height: 26px;
  padding: 0 10px;
  letter-spacing: 0;
}

.prompt-panel-header,
.prompt-section-heading,
.prompt-conflict-snapshot header,
.prompt-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prompt-panel-header h3,
.prompt-section-heading h4,
.prompt-panel-header p,
.prompt-section-heading p,
.prompt-dialog-heading strong,
.prompt-dialog-heading span {
  margin: 0;
  letter-spacing: 0;
}

.prompt-panel-header h3,
.prompt-section-heading h4 {
  font-size: 17px;
}

.prompt-panel-header p,
.prompt-section-heading p {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.prompt-version-section,
.prompt-audit-section {
  min-width: 0;
  margin-top: 18px;
}

.prompt-audit-section {
  padding-top: 18px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.prompt-template-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 10px 0;
  color: var(--el-color-danger);
}

.prompt-summary-toolbar {
  margin-bottom: 14px;
}

.prompt-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 18px;
  min-width: 0;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.prompt-summary-item {
  display: grid;
  align-content: center;
  gap: 7px;
  min-width: 0;
  min-height: 76px;
  padding: 12px 0;
}

.prompt-summary-item span:first-child,
.prompt-contract-grid span,
.prompt-conflict-bodies label > span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.prompt-summary-item strong,
.prompt-contract-grid strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
}

.prompt-test-binding {
  margin-top: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.prompt-test-binding header > div {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.prompt-test-binding h4,
.prompt-test-binding dl,
.prompt-test-binding dt,
.prompt-test-binding dd {
  margin: 0;
  letter-spacing: 0;
}

.prompt-test-binding h4 {
  font-size: 14px;
}

.prompt-test-binding dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 18px;
  margin-top: 14px;
}

.prompt-test-binding dl > div {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.prompt-test-binding dt {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.prompt-test-binding dd {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
}

.binding-hash {
  word-break: break-all;
}

.prompt-table-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

.prompt-version-table,
.prompt-template-audit-table {
  min-width: 1040px;
}

.version-cell,
.test-cell,
.operator-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.version-cell span,
.test-cell span,
.test-cell small,
.operator-cell small {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.hash-value {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}

.prompt-row-actions {
  flex-wrap: wrap;
  gap: 4px 8px;
  white-space: normal;
}

.prompt-inline-error {
  margin: 10px 0;
  color: var(--el-color-danger);
  font-size: 13px;
  line-height: 1.5;
}

.prompt-editor-form {
  min-width: 0;
}

.prompt-contract-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
  padding: 12px 0;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.prompt-contract-grid > div,
.prompt-dialog-heading {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.prompt-dialog-heading span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.prompt-conflict-snapshot {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-color-warning-light-5);
}

.prompt-conflict-snapshot header > div {
  display: grid;
  gap: 4px;
}

.prompt-conflict-snapshot header span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.prompt-conflict-bodies {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.prompt-conflict-bodies label {
  display: grid;
  gap: 7px;
  min-width: 0;
}

@media (max-width: 900px) {
  .prompt-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .prompt-test-binding dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .profile-import-prompt-panel :deep(.el-card__body) {
    padding-right: 12px;
    padding-left: 12px;
  }

  .prompt-panel-header,
  .prompt-section-heading,
  .prompt-conflict-snapshot header,
  .prompt-dialog-footer {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .prompt-summary-grid,
  .prompt-test-binding dl,
  .prompt-contract-grid,
  .prompt-conflict-bodies {
    grid-template-columns: 1fr;
  }

  .prompt-dialog-footer {
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
