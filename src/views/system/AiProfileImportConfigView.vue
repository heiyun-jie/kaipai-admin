<template>
  <PageContainer>
    <template #actions>
      <el-button :loading="loading" @click="load">刷新</el-button>
      <el-button v-if="canUpdate" type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
    </template>

    <el-card class="config-card" shadow="never" v-loading="loading">
      <div class="status-row">
        <div>
          <h2>DeepSeek 资料导入</h2>
          <p>{{ config.available ? '可用' : config.enabled ? '待通过连接测试' : '未启用' }}</p>
        </div>
        <div class="status-actions">
          <el-tag :type="config.available ? 'success' : 'info'" effect="plain">
            {{ config.available ? '服务可用' : '服务关闭' }}
          </el-tag>
          <el-switch
            v-if="canUpdate"
            :model-value="config.enabled"
            :loading="toggling"
            active-text="启用"
            inactive-text="停用"
            @change="toggleEnabled"
          />
        </div>
      </div>

      <el-form label-position="top" class="config-form">
        <el-form-item label="接口地址">
          <el-input v-model="form.endpoint" :disabled="!canUpdate" />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.modelName" :disabled="!canUpdate" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="连接超时（毫秒）">
            <el-input-number v-model="form.connectTimeoutMs" :disabled="!canUpdate" :min="1000" :max="30000" controls-position="right" />
          </el-form-item>
          <el-form-item label="读取超时（毫秒）">
            <el-input-number v-model="form.readTimeoutMs" :disabled="!canUpdate" :min="5000" :max="180000" controls-position="right" />
          </el-form-item>
          <el-form-item label="最大输入字符">
            <el-input-number v-model="form.maxInputChars" :disabled="!canUpdate" :min="1000" :max="50000" controls-position="right" />
          </el-form-item>
          <el-form-item label="最大输出 Token">
            <el-input-number v-model="form.maxOutputTokens" :disabled="!canUpdate" :min="1000" :max="16000" controls-position="right" />
          </el-form-item>
          <el-form-item label="单用户每日次数">
            <el-input-number v-model="form.perUserDailyLimit" :disabled="!canUpdate" :min="1" :max="100" controls-position="right" />
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <div class="secondary-grid">
      <el-card class="config-card" shadow="never">
        <div class="section-heading">
          <div><h3>访问密钥</h3><p>{{ config.secretMask || '未配置' }}</p></div>
        </div>
        <el-input v-model="secret" type="password" show-password autocomplete="new-password" placeholder="输入新的 API Key" :disabled="!canSecret" />
        <el-button class="section-command" :disabled="!secret || !canSecret" :loading="savingSecret" @click="saveSecret">更新密钥</el-button>
      </el-card>

      <el-card class="config-card" shadow="never">
        <div class="section-heading">
          <div><h3>连接状态</h3><p>{{ testStatusLabel }}</p></div>
          <el-tag :type="config.lastTestStatus === 'success' ? 'success' : config.lastTestStatus === 'failed' ? 'danger' : 'info'" effect="plain">
            {{ config.lastTestStatus || '未测试' }}
          </el-tag>
        </div>
        <div class="test-meta">{{ config.lastTestAt || '暂无测试记录' }}</div>
        <el-button class="section-command" :disabled="!canTest" :loading="testing" @click="testConnection">测试连接</el-button>
      </el-card>
    </div>

    <el-card v-if="canAudit" class="config-card" shadow="never">
      <div class="section-heading"><div><h3>配置审计</h3><p>最近 50 条</p></div></div>
      <el-table :data="audits" empty-text="暂无审计记录">
        <el-table-column prop="actionCode" label="动作" min-width="170" />
        <el-table-column prop="resultStatus" label="结果" width="110" />
        <el-table-column prop="operatorName" label="操作人" width="140" />
        <el-table-column prop="message" label="消息" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createTime" label="时间" width="180" />
      </el-table>
    </el-card>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageContainer from '@/components/business/PageContainer.vue'
import { PERMISSIONS } from '@/constants/permission'
import { usePermissionStore } from '@/stores/permission'
import { fetchProfileImportAudits, fetchProfileImportConfig, saveProfileImportConfig, saveProfileImportSecret, setProfileImportEnabled, testProfileImportConnection } from '@/api/ai'
import type { ProfileImportConfig, ProfileImportConfigAudit, ProfileImportConfigPayload } from '@/types/ai'

const permissionStore = usePermissionStore()
const canUpdate = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportUpdate))
const canSecret = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportSecret))
const canTest = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportTest))
const canAudit = computed(() => permissionStore.hasAction(PERMISSIONS.action.systemAiProfileImportAudit))
const loading = ref(false), saving = ref(false), savingSecret = ref(false), testing = ref(false), toggling = ref(false)
const secret = ref('')
const audits = ref<ProfileImportConfigAudit[]>([])
const config = reactive<ProfileImportConfig>({ enabled: false, available: false })
const form = reactive<ProfileImportConfigPayload>({ endpoint: 'https://api.deepseek.com/chat/completions', modelName: 'deepseek-chat', connectTimeoutMs: 3000, readTimeoutMs: 60000, maxInputChars: 20000, maxOutputTokens: 8000, perUserDailyLimit: 10 })
const testStatusLabel = computed(() => config.lastTestMessage || (config.lastTestStatus === 'success' ? '连接成功' : config.lastTestStatus === 'failed' ? '连接失败' : '未测试'))

function applyConfig(value: ProfileImportConfig) {
  Object.assign(config, value)
  form.endpoint = value.endpoint || form.endpoint; form.modelName = value.modelName || form.modelName
  form.connectTimeoutMs = value.connectTimeoutMs || form.connectTimeoutMs; form.readTimeoutMs = value.readTimeoutMs || form.readTimeoutMs
  form.maxInputChars = value.maxInputChars || form.maxInputChars; form.maxOutputTokens = value.maxOutputTokens || form.maxOutputTokens
  form.perUserDailyLimit = value.perUserDailyLimit || form.perUserDailyLimit
}
async function load() { loading.value = true; try { applyConfig(await fetchProfileImportConfig()); audits.value = canAudit.value ? await fetchProfileImportAudits() : [] } catch { ElMessage.error('配置加载失败') } finally { loading.value = false } }
async function saveConfig() { saving.value = true; try { applyConfig(await saveProfileImportConfig({ ...form })); ElMessage.success('配置已保存') } catch { ElMessage.error('配置保存失败') } finally { saving.value = false } }
async function saveSecret() { savingSecret.value = true; try { applyConfig(await saveProfileImportSecret(secret.value)); secret.value = ''; ElMessage.success('密钥已更新') } catch { ElMessage.error('密钥更新失败') } finally { savingSecret.value = false } }
async function testConnection() { testing.value = true; try { applyConfig(await testProfileImportConnection()); ElMessage.success(config.lastTestStatus === 'success' ? '连接成功' : '连接失败') } catch { ElMessage.error('连接测试失败') } finally { testing.value = false } }
async function toggleEnabled(value: string | number | boolean) { toggling.value = true; try { applyConfig(await setProfileImportEnabled(Boolean(value))); ElMessage.success(value ? '已启用' : '已停用') } catch { ElMessage.error('状态更新失败') } finally { toggling.value = false } }
onMounted(load)
</script>

<style scoped lang="scss">
.config-card { border-radius: 8px; }
.status-row, .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
h2, h3, p { margin: 0; }
.status-row p, .section-heading p, .test-meta { margin-top: 6px; color: var(--el-text-color-secondary); font-size: 13px; }
.status-actions { display: flex; align-items: center; gap: 16px; }
.config-form { margin-top: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 16px; }
.form-grid :deep(.el-input-number) { width: 100%; }
.secondary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.section-command { margin-top: 16px; }
@media (max-width: 900px) { .form-grid, .secondary-grid { grid-template-columns: 1fr; } .status-row { align-items: flex-start; flex-direction: column; } }
</style>
