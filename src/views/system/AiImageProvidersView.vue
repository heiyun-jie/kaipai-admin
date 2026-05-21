<template>
  <PageContainer>
    <section class="provider-layout">
      <el-card class="surface-card provider-list" shadow="never">
        <template #header>
          <div class="card-head">
            <div>
              <h3>AI 生图厂商</h3>
              <p>填写厂商接口、模型和密钥后，选择当前资料卡生图使用的厂商。</p>
            </div>
            <div class="header-actions">
              <el-button type="primary" @click="openCreateProviderDialog">新增厂商</el-button>
              <el-button :loading="loading" @click="loadProviders">刷新</el-button>
            </div>
          </div>
        </template>

        <el-alert
          v-if="loadError"
          class="provider-load-error"
          type="warning"
          :title="loadError"
          :closable="false"
          show-icon
        />
        <el-empty v-else-if="!providers.length && !loading" description="暂无 AI 生图 provider 配置" />
        <button
          v-for="item in providers"
          :key="item.providerCode"
          type="button"
          class="provider-item"
          :class="{ 'provider-item--active': item.providerCode === selectedCode }"
          @click="selectProvider(item.providerCode)"
        >
          <div class="provider-item__main">
            <strong>{{ item.displayName }}</strong>
            <span>{{ item.providerCode }} · {{ item.publicConfig?.model || '--' }}</span>
          </div>
          <div class="provider-item__tags">
            <StatusTag v-if="item.active" label="当前主模型" tone="success" />
            <StatusTag v-else-if="item.enabled" label="已启用" tone="info" />
            <StatusTag v-else label="停用" tone="warning" />
            <StatusTag v-if="item.activationReady" label="配置完整" tone="success" />
            <StatusTag v-else label="配置待补" tone="warning" />
            <StatusTag v-if="item.secretConfigured" label="密钥已配置" tone="success" />
            <StatusTag v-else label="未配密钥" tone="danger" />
          </div>
        </button>
      </el-card>

      <el-card v-if="currentProvider" class="surface-card config-panel" shadow="never">
        <template #header>
          <div class="card-head">
            <div>
              <h3>{{ currentProvider.displayName }}</h3>
              <p>{{ currentProvider.providerCode }} · 更新 {{ formatDateTime(currentProvider.lastUpdate) }}</p>
            </div>
            <div class="header-actions">
              <el-button @click="openEditProviderDialog">
                编辑厂商信息
              </el-button>
              <el-button
                :type="currentProvider.enabled ? 'warning' : 'primary'"
                :loading="statusSubmitting"
                @click="toggleEnabled"
              >
                {{ currentProvider.enabled ? '停用' : '启用' }}
              </el-button>
              <el-button
                type="success"
                :disabled="currentProvider.active"
                :loading="statusSubmitting"
                @click="activateProvider"
              >
                设为主模型
              </el-button>
            </div>
          </div>
        </template>

        <el-tabs v-model="activeTab">
          <el-tab-pane label="厂商接口" name="public">
            <el-alert
              v-if="!currentProvider.activationReady"
              class="provider-warning"
              type="warning"
              :title="activationMissingText"
              :closable="false"
              show-icon
            />
            <el-form class="config-form" label-width="140px">
              <el-form-item :label="publicLabel('endpoint')">
                <el-input v-model="publicForm.endpoint" :placeholder="publicPlaceholder('endpoint')" />
              </el-form-item>
              <el-form-item :label="publicLabel('region')">
                <el-input v-model="publicForm.region" :placeholder="publicPlaceholder('region')" />
              </el-form-item>
              <el-form-item :label="publicLabel('model')">
                <el-input v-model="publicForm.model" :placeholder="publicPlaceholder('model')" />
              </el-form-item>
              <el-form-item :label="publicLabel('modelVersion')">
                <el-input v-model="publicForm.modelVersion" :placeholder="publicPlaceholder('modelVersion')" />
              </el-form-item>
              <div class="form-grid">
                <el-form-item :label="publicLabel('size')">
                  <el-input v-model="publicForm.size" :placeholder="publicPlaceholder('size')" />
                </el-form-item>
                <el-form-item :label="publicLabel('resolution')">
                  <el-input v-model="publicForm.resolution" :placeholder="publicPlaceholder('resolution')" />
                </el-form-item>
                <el-form-item :label="publicLabel('quality')">
                  <el-input v-model="publicForm.quality" :placeholder="publicPlaceholder('quality')" />
                </el-form-item>
                <el-form-item :label="publicLabel('responseFormat')">
                  <el-input v-model="publicForm.responseFormat" :placeholder="publicPlaceholder('responseFormat')" />
                </el-form-item>
                <el-form-item :label="publicLabel('count')">
                  <el-input-number v-model="publicForm.count" :min="1" :max="6" />
                </el-form-item>
                <el-form-item :label="publicLabel('watermark')">
                  <el-switch v-model="publicForm.watermark" />
                </el-form-item>
                <el-form-item :label="publicLabel('connectTimeoutMs')">
                  <el-input-number v-model="publicForm.connectTimeoutMs" :min="1000" :step="1000" />
                </el-form-item>
                <el-form-item :label="publicLabel('readTimeoutMs')">
                  <el-input-number v-model="publicForm.readTimeoutMs" :min="10000" :step="5000" />
                </el-form-item>
                <el-form-item :label="publicLabel('pollIntervalMs')">
                  <el-input-number v-model="publicForm.pollIntervalMs" :min="500" :step="500" />
                </el-form-item>
                <el-form-item :label="publicLabel('maxPollAttempts')">
                  <el-input-number v-model="publicForm.maxPollAttempts" :min="1" :step="20" />
                </el-form-item>
              </div>
              <el-form-item :label="publicLabel('authHeader')">
                <el-input v-model="publicForm.authHeader" :placeholder="publicPlaceholder('authHeader')" />
              </el-form-item>
              <el-form-item :label="publicLabel('extraParamsJson')">
                <el-input
                  v-model="publicForm.extraParamsJson"
                  type="textarea"
                  :rows="5"
                  :placeholder="publicPlaceholder('extraParamsJson')"
                />
              </el-form-item>
              <el-form-item label="变更备注">
                <el-input v-model="publicReason" placeholder="可选" />
              </el-form-item>
              <div class="form-actions">
                <el-button
                  type="primary"
                  :loading="publicSubmitting"
                  @click="savePublicConfig"
                >
                  保存接口参数
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="密钥" name="secret">
            <section class="secret-state">
              <div class="detail-grid">
                <div class="detail-block">
                  <span>密钥状态</span>
                  <strong>{{ currentProvider.secretConfigured ? '已配置' : '未配置' }}</strong>
                </div>
                <div class="detail-block">
                  <span>最近更新人</span>
                  <strong>{{ currentProvider.secretUpdatedByName || '--' }}</strong>
                </div>
                <div class="detail-block">
                  <span>最近更新时间</span>
                  <strong>{{ formatDateTime(currentProvider.secretUpdatedAt) }}</strong>
                </div>
                <div class="detail-block detail-block--wide">
                  <span>脱敏值</span>
                  <strong>{{ formatSecretMask(currentProvider.secretMask) }}</strong>
                </div>
                <div class="detail-block detail-block--wide">
                  <span>必填密钥</span>
                  <strong>{{ requiredSecretText }}</strong>
                </div>
              </div>
            </section>

            <el-form class="config-form" label-width="140px">
              <el-form-item v-for="field in secretFields" :key="field" :label="secretLabel(field)">
                <el-input
                  v-model="secretForm[field]"
                  type="password"
                  show-password
                  autocomplete="off"
                  :placeholder="currentProvider.secretMask?.[field] || '留空表示不修改'"
                />
              </el-form-item>
              <el-form-item label="变更备注">
                <el-input v-model="secretReason" placeholder="可选" />
              </el-form-item>
              <div class="form-actions">
                <el-button
                  type="primary"
                  :loading="secretSubmitting"
                  @click="saveSecret"
                >
                  保存密钥
                </el-button>
                <el-button :loading="secretSubmitting" @click="revealSecret">
                  查看密钥
                </el-button>
                <el-button
                  type="danger"
                  :loading="secretSubmitting"
                  @click="clearSecret"
                >
                  清空密钥
                </el-button>
              </div>
            </el-form>

            <section v-if="Object.keys(revealedSecrets).length" class="revealed-box">
              <div class="card-head">
                <div>
                  <h3>已回显密钥</h3>
                  <p>仅保存在当前页面内存，切换 provider 或刷新页面后清空。</p>
                </div>
                <el-button @click="revealedSecrets = {}">清空显示</el-button>
              </div>
              <div class="detail-grid">
                <div v-for="(value, key) in revealedSecrets" :key="key" class="detail-block detail-block--wide">
                  <span>{{ secretLabel(String(key)) }}</span>
                  <strong>{{ value }}</strong>
                </div>
              </div>
            </section>
          </el-tab-pane>

          <el-tab-pane label="测试" name="test">
            <el-form class="config-form" label-width="140px">
              <el-form-item label="参考人像图片 URL（可选）">
                <el-input
                  v-model="testForm.sourceImageUrl"
                  placeholder="可选：仅测试参考图/身份保持时填写公网 HTTPS 图片地址"
                />
              </el-form-item>
              <el-form-item label="Prompt">
                <el-input v-model="testForm.prompt" type="textarea" :rows="4" />
              </el-form-item>
              <el-form-item label="Negative Prompt">
                <el-input v-model="testForm.negativePrompt" type="textarea" :rows="3" />
              </el-form-item>
              <div class="form-grid">
                <el-form-item label="Template">
                  <el-select v-model="testForm.templateSceneCode">
                    <el-option label="classic" value="classic" />
                    <el-option label="costume" value="costume" />
                    <el-option label="urban" value="urban" />
                    <el-option label="commercial" value="commercial" />
                    <el-option label="artistic" value="artistic" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Style">
                  <el-input v-model="testForm.styleCode" />
                </el-form-item>
              </div>
              <div class="form-actions">
                <el-button
                  type="primary"
                  :loading="testSubmitting"
                  @click="testProvider"
                >
                  测试生成
                </el-button>
              </div>
            </el-form>

            <el-alert
              v-if="testResult"
              class="test-result"
              :type="testResult.status === 'success' ? 'success' : 'error'"
              :title="testResult.message || testResult.status"
              :closable="false"
              show-icon
            />
            <img v-if="testResult?.imageUrl" class="test-image" :src="testResult.imageUrl" alt="provider test result" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </section>

    <el-dialog
      v-model="providerDialogVisible"
      class="provider-dialog"
      :title="providerDialogMode === 'create' ? '新增 AI 生图厂商' : '编辑厂商信息'"
      width="920px"
      top="3vh"
      fullscreen
      destroy-on-close
    >
      <el-alert
        class="provider-dialog-tip"
        type="info"
        title="这里填写厂商接入信息：厂商类型、接口地址、模型、密钥。已存在同厂商时会更新这家厂商的配置。"
        :closable="false"
        show-icon
      />
      <el-form class="config-form provider-dialog-form" label-width="140px">
        <div class="form-grid">
          <el-form-item label="厂商类型 *">
            <el-select
              v-model="providerForm.providerCode"
              :disabled="providerDialogMode === 'edit'"
              placeholder="选择厂商"
              @change="applyProviderPreset"
            >
              <el-option
                v-for="option in providerOptions"
                :key="option.code"
                :label="option.label"
                :value="option.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="后台显示名称 *">
            <el-input v-model="providerForm.displayName" placeholder="如 腾讯混元生图" />
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="providerForm.enabled" />
          </el-form-item>
          <el-form-item label="排序优先级">
            <el-input-number v-model="providerForm.priority" :min="1" :max="999" />
          </el-form-item>
        </div>

        <el-divider content-position="left">接口与模型</el-divider>
        <el-form-item :label="publicLabel('endpoint', providerForm.providerCode)">
          <el-input v-model="providerForm.publicConfig.endpoint" :placeholder="publicPlaceholder('endpoint', providerForm.providerCode)" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item :label="publicLabel('region', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.region" :placeholder="publicPlaceholder('region', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('model', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.model" :placeholder="publicPlaceholder('model', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('modelVersion', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.modelVersion" :placeholder="publicPlaceholder('modelVersion', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('size', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.size" :placeholder="publicPlaceholder('size', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('resolution', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.resolution" :placeholder="publicPlaceholder('resolution', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('responseFormat', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.responseFormat" :placeholder="publicPlaceholder('responseFormat', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('quality', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.quality" :placeholder="publicPlaceholder('quality', providerForm.providerCode)" />
          </el-form-item>
          <el-form-item :label="publicLabel('count', providerForm.providerCode)">
            <el-input-number v-model="providerForm.publicConfig.count" :min="1" :max="6" />
          </el-form-item>
          <el-form-item :label="publicLabel('watermark', providerForm.providerCode)">
            <el-switch v-model="providerForm.publicConfig.watermark" />
          </el-form-item>
          <el-form-item :label="publicLabel('authHeader', providerForm.providerCode)">
            <el-input v-model="providerForm.publicConfig.authHeader" :placeholder="publicPlaceholder('authHeader', providerForm.providerCode)" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item :label="publicLabel('connectTimeoutMs', providerForm.providerCode)">
            <el-input-number v-model="providerForm.publicConfig.connectTimeoutMs" :min="1000" :step="1000" />
          </el-form-item>
          <el-form-item :label="publicLabel('readTimeoutMs', providerForm.providerCode)">
            <el-input-number v-model="providerForm.publicConfig.readTimeoutMs" :min="10000" :step="5000" />
          </el-form-item>
          <el-form-item :label="publicLabel('pollIntervalMs', providerForm.providerCode)">
            <el-input-number v-model="providerForm.publicConfig.pollIntervalMs" :min="500" :step="500" />
          </el-form-item>
          <el-form-item :label="publicLabel('maxPollAttempts', providerForm.providerCode)">
            <el-input-number v-model="providerForm.publicConfig.maxPollAttempts" :min="1" :step="20" />
          </el-form-item>
        </div>
        <el-form-item :label="publicLabel('extraParamsJson', providerForm.providerCode)">
          <el-input
            v-model="providerForm.publicConfig.extraParamsJson"
            type="textarea"
            :rows="4"
            :placeholder="publicPlaceholder('extraParamsJson', providerForm.providerCode)"
          />
        </el-form-item>

        <el-divider content-position="left">密钥</el-divider>
        <el-form-item
          v-for="field in providerDialogSecretFields"
          :key="field"
          :label="secretLabel(field)"
        >
          <el-input
            v-model="providerSecretForm[field]"
            type="password"
            show-password
            autocomplete="off"
            :placeholder="providerSecretPlaceholder(field)"
          />
        </el-form-item>
        <el-form-item label="变更备注">
          <el-input v-model="providerForm.reason" placeholder="可选" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="form-actions">
          <el-button @click="providerDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="providerSubmitting" @click="saveProviderInfo">
            保存厂商信息
          </el-button>
        </div>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  activateAdminAiImageProvider,
  clearAdminAiImageProviderSecret,
  disableAdminAiImageProvider,
  enableAdminAiImageProvider,
  fetchAdminAiImageProviders,
  revealAdminAiImageProviderSecret,
  saveAdminAiImageProvider,
  saveAdminAiImageProviderPublicConfig,
  saveAdminAiImageProviderSecret,
  testAdminAiImageProvider,
} from '@/api/ai'
import PageContainer from '@/components/business/PageContainer.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { formatDateTime } from '@/utils/format'
import type {
  AdminAiImageProvider,
  AdminAiImageProviderTestResult,
  AiImageProviderPublicConfig,
} from '@/types/ai'

type ProviderDialogMode = 'create' | 'edit'

interface ProviderOption {
  code: string
  label: string
  priority: number
  publicConfig: AiImageProviderPublicConfig
  secretFields: string[]
  requiredPublicFields: string[]
}

const providerOptions: ProviderOption[] = [
  {
    code: 'volc-seedream',
    label: '火山豆包 Seedream',
    priority: 20,
    secretFields: ['apiKey'],
    requiredPublicFields: ['endpoint', 'model'],
    publicConfig: {
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      region: 'cn-beijing',
      model: 'doubao-seedream-4.0',
      size: '2160x3840',
      responseFormat: 'url',
      count: 1,
      watermark: true,
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 240,
    },
  },
  {
    code: 'aliyun-qwen-image',
    label: '阿里云百炼 Qwen Image',
    priority: 30,
    secretFields: ['apiKey'],
    requiredPublicFields: ['endpoint', 'model'],
    publicConfig: {
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      region: 'cn-beijing',
      model: 'qwen-image-edit',
      size: '1024*1536',
      responseFormat: 'url',
      count: 1,
      watermark: true,
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 240,
    },
  },
  {
    code: 'aliyun-wanxiang',
    label: '阿里云通义万相',
    priority: 40,
    secretFields: ['apiKey'],
    requiredPublicFields: ['endpoint', 'model'],
    publicConfig: {
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      region: 'cn-beijing',
      model: 'wan2.7-image-pro',
      size: '1024*1536',
      responseFormat: 'url',
      count: 1,
      watermark: true,
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 240,
    },
  },
  {
    code: 'tencent-hunyuan',
    label: '腾讯混元生图',
    priority: 50,
    secretFields: ['secretId', 'secretKey'],
    requiredPublicFields: ['endpoint', 'region', 'model'],
    publicConfig: {
      endpoint: 'https://aiart.tencentcloudapi.com',
      region: 'ap-guangzhou',
      model: 'hunyuan-image-3.0',
      modelVersion: '2022-12-29',
      resolution: '720:1280',
      size: '720:1280',
      count: 1,
      watermark: true,
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 240,
    },
  },
  {
    code: 'baidu-qianfan',
    label: '百度千帆图像生成',
    priority: 60,
    secretFields: ['apiKey'],
    requiredPublicFields: ['endpoint', 'model'],
    publicConfig: {
      endpoint: 'https://qianfan.baidubce.com/v2/images/generations',
      region: 'cn',
      model: 'irag-1.0',
      size: '1024x1536',
      count: 1,
      watermark: true,
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 240,
    },
  },
  {
    code: 'http',
    label: '通用 HTTP 厂商',
    priority: 90,
    secretFields: ['authToken'],
    requiredPublicFields: ['endpoint', 'model'],
    publicConfig: {
      endpoint: '',
      model: 'profile-card-image',
      authHeader: 'Authorization',
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 240,
    },
  },
  {
    code: 'kplyyk',
    label: '开拍默认生图',
    priority: 10,
    secretFields: ['authToken'],
    requiredPublicFields: ['endpoint', 'model'],
    publicConfig: {
      endpoint: 'http://kplyyk.com/v0/management/image-generation/test',
      model: 'gpt-image-2',
      size: '2160x3840',
      quality: 'high',
      count: 1,
      authHeader: 'Authorization',
      connectTimeoutMs: 10000,
      readTimeoutMs: 120000,
      pollIntervalMs: 1500,
      maxPollAttempts: 400,
    },
  },
]

const providers = ref<AdminAiImageProvider[]>([])
const selectedCode = ref('')
const loading = ref(false)
const loadError = ref('')
const activeTab = ref('public')
const publicSubmitting = ref(false)
const secretSubmitting = ref(false)
const statusSubmitting = ref(false)
const testSubmitting = ref(false)
const providerDialogVisible = ref(false)
const providerDialogMode = ref<ProviderDialogMode>('create')
const providerSubmitting = ref(false)
const publicReason = ref('')
const secretReason = ref('')
const revealedSecrets = ref<Record<string, string>>({})
const testResult = ref<AdminAiImageProviderTestResult | null>(null)

const publicForm = reactive<AiImageProviderPublicConfig>({})
const secretForm = reactive<Record<string, string>>({})
const providerSecretForm = reactive<Record<string, string>>({})
const providerForm = reactive<{
  providerCode: string
  displayName: string
  enabled: boolean
  priority: number
  reason: string
  publicConfig: AiImageProviderPublicConfig
}>({
  providerCode: '',
  displayName: '',
  enabled: true,
  priority: 100,
  reason: '',
  publicConfig: {},
})
const testForm = reactive({
  sourceImageUrl: '',
  prompt: '生成一张 9:16 演员资料卡背景图，不要出现文字、二维码、水印和明显 UI 组件。',
  negativePrompt: 'readable text, phone number, QR code, watermark, logo, distorted face',
  templateSceneCode: 'classic',
  styleCode: 'classic',
})

const currentProvider = computed(() => providers.value.find((item) => item.providerCode === selectedCode.value) || null)
const secretFields = computed(() => resolveSecretFields(currentProvider.value))
const providerDialogSecretFields = computed(() => secretFieldsForCode(providerForm.providerCode))
const requiredSecretText = computed(() => secretFields.value.map(secretLabel).join(' / ') || '--')
const activationMissingText = computed(() => {
  const provider = currentProvider.value
  if (!provider) {
    return ''
  }
  const publicFields = (provider.missingPublicFields || []).map((field) => publicLabel(field))
  const secretFields = (provider.missingSecretFields || []).map(secretLabel)
  return ['公开参数：' + (publicFields.join('、') || '已完整'), '密钥：' + (secretFields.join('、') || '已完整')].join('；')
})

async function loadProviders() {
  loading.value = true
  loadError.value = ''
  try {
    providers.value = await fetchAdminAiImageProviders()
    if (!selectedCode.value && providers.value.length) {
      selectProvider(providers.value.find((item) => item.active)?.providerCode || providers.value[0].providerCode)
    } else if (selectedCode.value) {
      selectProvider(selectedCode.value)
    }
  } catch (error) {
    providers.value = []
    selectedCode.value = ''
    const message = error instanceof Error ? error.message : ''
    loadError.value = message
      ? `AI 生图配置接口暂不可用：${message}`
      : 'AI 生图配置接口暂不可用，请确认后台已发布 provider 配置接口和初始化数据。'
  } finally {
    loading.value = false
  }
}

function openCreateProviderDialog() {
  providerDialogMode.value = 'create'
  const defaultCode =
    providers.value.find((item) => !item.secretConfigured)?.providerCode ||
    providerOptions[0]?.code ||
    'volc-seedream'
  resetProviderDialog(defaultCode)
  providerDialogVisible.value = true
}

function openEditProviderDialog() {
  const provider = currentProvider.value
  if (!provider) {
    return
  }
  providerDialogMode.value = 'edit'
  resetProviderDialog(provider.providerCode, provider)
  providerDialogVisible.value = true
}

function resetProviderDialog(providerCode: string, provider?: AdminAiImageProvider) {
  const option = findProviderOption(providerCode)
  providerForm.providerCode = providerCode
  providerForm.displayName = provider?.displayName || option?.label || providerCode
  providerForm.enabled = provider?.enabled ?? true
  providerForm.priority = provider?.priority || option?.priority || 100
  providerForm.reason = ''
  setPublicConfig(providerForm.publicConfig, {
    ...(option?.publicConfig || {}),
    ...(provider?.publicConfig || {}),
  })
  resetProviderSecretForm(providerCode)
}

function applyProviderPreset(providerCode: string) {
  const provider = providers.value.find((item) => item.providerCode === providerCode)
  resetProviderDialog(providerCode, provider)
}

async function saveProviderInfo() {
  if (!providerForm.providerCode) {
    ElMessage.warning('请选择厂商类型')
    return
  }
  if (!providerForm.displayName.trim()) {
    ElMessage.warning('请填写后台显示名称')
    return
  }
  providerSubmitting.value = true
  try {
    const secrets = Object.fromEntries(Object.entries(providerSecretForm).filter(([, value]) => value?.trim()))
    const updated = providers.value.some((item) => item.providerCode === providerForm.providerCode)
      ? await saveExistingProviderInfo(secrets)
      : await saveAdminAiImageProvider({
          providerCode: providerForm.providerCode,
          displayName: providerForm.displayName.trim(),
          enabled: providerForm.enabled,
          priority: providerForm.priority || 100,
          publicConfig: { ...providerForm.publicConfig },
          secrets,
          reason: providerForm.reason,
        })
    replaceProvider(updated)
    providerDialogVisible.value = false
    ElMessage.success('厂商信息已保存')
  } finally {
    providerSubmitting.value = false
  }
}

async function saveExistingProviderInfo(secrets: Record<string, string>) {
  const providerCode = providerForm.providerCode
  let updated = await saveAdminAiImageProviderPublicConfig(providerCode, {
    publicConfig: { ...providerForm.publicConfig },
    reason: providerForm.reason,
  })
  if (Object.keys(secrets).length) {
    updated = await saveAdminAiImageProviderSecret(providerCode, {
      secrets,
      reason: providerForm.reason,
    })
  }
  if (providerForm.enabled !== updated.enabled) {
    updated = providerForm.enabled
      ? await enableAdminAiImageProvider(providerCode, { reason: providerForm.reason })
      : await disableAdminAiImageProvider(providerCode, { reason: providerForm.reason })
  }
  return updated
}

function selectProvider(providerCode: string) {
  const provider = providers.value.find((item) => item.providerCode === providerCode)
  if (!provider) {
    return
  }
  selectedCode.value = providerCode
  revealedSecrets.value = {}
  testResult.value = null
  setPublicConfig(publicForm, provider.publicConfig || {})
  Object.keys(secretForm).forEach((key) => delete secretForm[key])
  resolveSecretFields(provider).forEach((field) => {
    secretForm[field] = ''
  })
}

async function savePublicConfig() {
  if (!currentProvider.value) {
    return
  }
  publicSubmitting.value = true
  try {
    const updated = await saveAdminAiImageProviderPublicConfig(currentProvider.value.providerCode, {
      publicConfig: { ...publicForm },
      reason: publicReason.value,
    })
    replaceProvider(updated)
    publicReason.value = ''
    ElMessage.success('公开参数已保存')
  } finally {
    publicSubmitting.value = false
  }
}

async function saveSecret() {
  if (!currentProvider.value) {
    return
  }
  const secrets = Object.fromEntries(Object.entries(secretForm).filter(([, value]) => value?.trim()))
  if (!Object.keys(secrets).length) {
    ElMessage.warning('请至少填写一个密钥字段')
    return
  }
  secretSubmitting.value = true
  try {
    const updated = await saveAdminAiImageProviderSecret(currentProvider.value.providerCode, {
      secrets,
      reason: secretReason.value,
    })
    replaceProvider(updated)
    Object.keys(secretForm).forEach((key) => {
      secretForm[key] = ''
    })
    secretReason.value = ''
    revealedSecrets.value = {}
    ElMessage.success('密钥已保存')
  } finally {
    secretSubmitting.value = false
  }
}

async function revealSecret() {
  const provider = currentProvider.value
  if (!provider) {
    return
  }
  const confirmText = await promptProviderCode(provider.providerCode, '查看密钥需要二次确认')
  if (!confirmText) {
    return
  }
  secretSubmitting.value = true
  try {
    const result = await revealAdminAiImageProviderSecret(provider.providerCode, {
      confirmText,
      reason: 'admin reveal secret',
    })
    revealedSecrets.value = result.secrets || {}
    ElMessage.success('密钥已回显')
  } finally {
    secretSubmitting.value = false
  }
}

async function clearSecret() {
  const provider = currentProvider.value
  if (!provider) {
    return
  }
  const confirmText = await promptProviderCode(provider.providerCode, '清空密钥后如该 provider 为主模型会自动取消主模型状态')
  if (!confirmText) {
    return
  }
  secretSubmitting.value = true
  try {
    const updated = await clearAdminAiImageProviderSecret(provider.providerCode, {
      confirmText,
      reason: 'admin clear secret',
    })
    replaceProvider(updated)
    revealedSecrets.value = {}
    ElMessage.success('密钥已清空')
  } finally {
    secretSubmitting.value = false
  }
}

async function toggleEnabled() {
  const provider = currentProvider.value
  if (!provider) {
    return
  }
  const confirmed = await confirmAction(provider.enabled ? '确定停用该 provider？' : '确定启用该 provider？', '确认操作')
  if (!confirmed) {
    return
  }
  statusSubmitting.value = true
  try {
    const updated = provider.enabled
      ? await disableAdminAiImageProvider(provider.providerCode, { reason: 'admin disable provider' })
      : await enableAdminAiImageProvider(provider.providerCode, { reason: 'admin enable provider' })
    replaceProvider(updated)
    ElMessage.success(provider.enabled ? 'provider 已停用' : 'provider 已启用')
  } finally {
    statusSubmitting.value = false
  }
}

async function activateProvider() {
  const provider = currentProvider.value
  if (!provider) {
    return
  }
  const confirmed = await confirmAction('下一次 AI 资料卡生成会使用该 provider。', '设为当前主模型')
  if (!confirmed) {
    return
  }
  statusSubmitting.value = true
  try {
    await activateAdminAiImageProvider(provider.providerCode, { reason: 'admin activate provider' })
    await loadProviders()
    ElMessage.success('主模型已切换')
  } finally {
    statusSubmitting.value = false
  }
}

async function testProvider() {
  const provider = currentProvider.value
  if (!provider) {
    return
  }
  testSubmitting.value = true
  try {
    const result = await testAdminAiImageProvider(provider.providerCode, {
      sourceImageUrl: testForm.sourceImageUrl.trim() || undefined,
      prompt: testForm.prompt.trim() || undefined,
      negativePrompt: testForm.negativePrompt.trim() || undefined,
      templateSceneCode: testForm.templateSceneCode.trim() || undefined,
      styleCode: testForm.styleCode.trim() || undefined,
    })
    await loadProviders()
    testResult.value = result
  } finally {
    testSubmitting.value = false
  }
}

function replaceProvider(updated: AdminAiImageProvider) {
  const index = providers.value.findIndex((item) => item.providerCode === updated.providerCode)
  if (index >= 0) {
    providers.value[index] = updated
  } else {
    providers.value.push(updated)
  }
  providers.value.sort((left, right) => (left.priority || 100) - (right.priority || 100))
  selectProvider(updated.providerCode)
}

function setPublicConfig(target: AiImageProviderPublicConfig, source: AiImageProviderPublicConfig) {
  Object.keys(target).forEach((key) => delete target[key as keyof AiImageProviderPublicConfig])
  Object.assign(target, source)
}

function resetProviderSecretForm(providerCode: string) {
  Object.keys(providerSecretForm).forEach((key) => delete providerSecretForm[key])
  secretFieldsForCode(providerCode).forEach((field) => {
    providerSecretForm[field] = ''
  })
}

function findProviderOption(providerCode: string) {
  return providerOptions.find((item) => item.code === providerCode)
}

async function promptProviderCode(providerCode: string, message: string) {
  try {
    const result = await ElMessageBox.prompt(message, '二次确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPlaceholder: providerCode,
      inputValidator: (value) => value === providerCode || `请输入 ${providerCode}`,
    })
    return result.value
  } catch {
    return ''
  }
}

async function confirmAction(message: string, title: string) {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
    return true
  } catch {
    return false
  }
}

function resolveSecretFields(provider?: AdminAiImageProvider | null) {
  if (!provider) {
    return []
  }
  return Array.from(new Set([...(provider.requiredSecretFields || []), ...secretFieldsForCode(provider.providerCode)]))
}

function secretFieldsForCode(providerCode: string) {
  const option = findProviderOption(providerCode)
  if (option) {
    return option.secretFields
  }
  const defaults: Record<string, string[]> = {
    kplyyk: ['authToken'],
    http: ['authToken'],
    openai: ['apiKey'],
    'volc-seedream': ['apiKey'],
    'aliyun-qwen-image': ['apiKey'],
    'aliyun-wanxiang': ['apiKey'],
    'tencent-hunyuan': ['secretId', 'secretKey'],
    'baidu-qianfan': ['apiKey'],
  }
  return defaults[providerCode] || []
}

function requiredPublicFieldsForCode(providerCode: string) {
  const option = findProviderOption(providerCode)
  if (option) {
    return option.requiredPublicFields
  }
  const defaults: Record<string, string[]> = {
    'tencent-hunyuan': ['endpoint', 'region', 'model'],
    kplyyk: ['endpoint', 'model'],
    http: ['endpoint', 'model'],
    openai: ['endpoint', 'model'],
    'volc-seedream': ['endpoint', 'model'],
    'aliyun-qwen-image': ['endpoint', 'model'],
    'aliyun-wanxiang': ['endpoint', 'model'],
    'baidu-qianfan': ['endpoint', 'model'],
  }
  return defaults[providerCode] || ['endpoint', 'model']
}

function publicLabel(field: string, providerCode?: string) {
  const labels: Record<string, string> = {
    endpoint: 'API 地址',
    region: '地域',
    model: '模型 ID',
    modelVersion: '接口版本',
    size: '尺寸',
    resolution: '分辨率',
    quality: '质量',
    responseFormat: '返回格式',
    count: '生成张数',
    watermark: '水印',
    connectTimeoutMs: '连接超时',
    readTimeoutMs: '读取超时',
    pollIntervalMs: '轮询间隔',
    maxPollAttempts: '最大轮询',
    authHeader: '鉴权 Header',
    extraParamsJson: '扩展参数 JSON',
  }
  const requiredFields = providerCode
    ? requiredPublicFieldsForCode(providerCode)
    : currentProvider.value?.requiredPublicFields || []
  const required = requiredFields.includes(field) ? ' *' : ''
  return (labels[field] || field) + required
}

function publicPlaceholder(field: string, providerCode = currentProvider.value?.providerCode || '') {
  const presets: Record<string, Partial<Record<string, string>>> = {
    kplyyk: {
      endpoint: 'http://kplyyk.com/v0/management/image-generation/test',
      model: 'gpt-image-2',
      size: '2160x3840',
      authHeader: 'Authorization',
    },
    'volc-seedream': {
      endpoint: '火山方舟/豆包图片生成 API 地址',
      region: 'cn-beijing',
      model: 'doubao-seedream-4.0',
      size: '2160x3840',
      responseFormat: 'url',
    },
    'aliyun-qwen-image': {
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      region: 'cn-beijing',
      model: 'qwen-image-edit',
      size: '1024*1536',
      responseFormat: 'url',
    },
    'aliyun-wanxiang': {
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      region: 'cn-beijing',
      model: 'wan2.7-image-pro',
      size: '1024*1536',
      responseFormat: 'url',
    },
    'tencent-hunyuan': {
      endpoint: 'https://aiart.tencentcloudapi.com',
      region: 'ap-guangzhou',
      model: 'hunyuan-image-3.0',
      modelVersion: '2022-12-29',
      resolution: '720:1280',
      size: '720:1280',
    },
    'baidu-qianfan': {
      endpoint: 'https://qianfan.baidubce.com/v2/images/generations',
      region: 'cn',
      model: 'irag-1.0',
      size: '1024x1536',
    },
    http: {
      endpoint: '自定义 HTTPS 生图接口',
      model: 'profile-card-image',
      authHeader: 'Authorization',
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/images/edits',
      model: 'gpt-image-1.5',
      size: '1024x1536',
      quality: 'high',
      responseFormat: 'png',
    },
  }
  const generic: Record<string, string> = {
    endpoint: '厂商 API 地址',
    region: '如 cn-beijing / ap-guangzhou',
    model: '模型 ID',
    modelVersion: '接口或模型版本',
    size: '2160x3840 / 1024*1536',
    resolution: '720:1280',
    quality: 'high',
    responseFormat: 'url / b64_json / png',
    authHeader: 'Authorization',
    extraParamsJson: '{"steps": 30}',
  }
  return presets[providerCode]?.[field] || generic[field] || ''
}

function secretLabel(field: string) {
  const labels: Record<string, string> = {
    apiKey: 'API Key',
    authToken: 'Auth Token',
    secretId: 'SecretId',
    secretKey: 'SecretKey',
    bearerToken: 'Bearer Token',
  }
  return labels[field] || field
}

function providerSecretPlaceholder(field: string) {
  const provider = providers.value.find((item) => item.providerCode === providerForm.providerCode)
  return provider?.secretMask?.[field] || '填写后保存到后台加密密钥配置'
}

function formatSecretMask(mask?: Record<string, string> | null) {
  if (!mask || !Object.keys(mask).length) {
    return '--'
  }
  return Object.entries(mask)
    .map(([key, value]) => `${secretLabel(key)} ${value}`)
    .join(' / ')
}

onMounted(loadProviders)
</script>

<style scoped lang="scss">
.provider-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: 360px minmax(0, 1fr);
}

.surface-card {
  border: 1px solid var(--kp-border);
  background: var(--kp-surface);
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;

  h3,
  p {
    margin: 0;
  }

  p {
    margin-top: 6px;
    color: var(--kp-text-secondary);
    line-height: 1.5;
  }
}

.header-actions,
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.provider-list :deep(.el-card__body) {
  display: grid;
  gap: 10px;
}

.provider-load-error {
  margin-bottom: 4px;
}

.provider-dialog-tip {
  margin-bottom: 16px;
}

.provider-dialog,
:deep(.provider-dialog.el-dialog),
:deep(.provider-dialog.el-dialog .el-dialog__header),
:deep(.provider-dialog.el-dialog .el-dialog__body),
:deep(.provider-dialog.el-dialog .el-dialog__footer) {
  background: #fffaf4;
}

:global(.provider-dialog.el-dialog),
:global(.provider-dialog.el-dialog .el-dialog__header),
:global(.provider-dialog.el-dialog .el-dialog__body),
:global(.provider-dialog.el-dialog .el-dialog__footer) {
  background: #fffaf4 !important;
}

.provider-dialog :deep(.el-dialog) {
  display: flex;
  flex-direction: column;
  max-height: 94vh;
}

.provider-dialog :deep(.el-dialog__body) {
  max-height: calc(94vh - 138px);
  overflow: auto;
}

.provider-dialog-form {
  max-width: none;
}

.provider-dialog :deep(.el-select) {
  width: 100%;
}

.provider-item {
  display: grid;
  gap: 10px;
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(47, 36, 27, 0.08);
  border-radius: 8px;
  background: rgba(47, 36, 27, 0.03);
  text-align: left;
  cursor: pointer;
}

.provider-item--active {
  border-color: rgba(47, 125, 87, 0.35);
  background: rgba(47, 125, 87, 0.08);
}

.provider-item__main {
  display: grid;
  gap: 4px;

  span {
    color: var(--kp-text-secondary);
    font-size: 12px;
    word-break: break-all;
  }
}

.provider-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.provider-item__tags :deep(.status-tag) {
  min-height: 24px;
  padding: 0 10px;
  font-size: 11px;
}

.config-form {
  max-width: 980px;
}

.form-grid {
  display: grid;
  gap: 0 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.secret-state,
.revealed-box,
.provider-warning,
.test-result {
  margin-bottom: 16px;
}

.detail-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-block {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: rgba(47, 36, 27, 0.04);

  span {
    color: var(--kp-text-secondary);
    font-size: 12px;
  }

  strong {
    min-width: 0;
    font-size: 13px;
    word-break: break-all;
  }
}

.detail-block--wide {
  grid-column: 1 / -1;
}

.revealed-box {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(47, 125, 87, 0.22);
  border-radius: 8px;
  background: rgba(47, 125, 87, 0.06);
}

.test-image {
  display: block;
  max-width: 360px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--kp-border);
}

@media (max-width: 1100px) {
  .provider-layout,
  .form-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
