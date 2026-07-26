import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distMode = process.argv.includes('--dist')
const distDir = path.resolve(process.env.E2E_DIST_DIR || path.join(projectRoot, 'dist'))

if (distMode && !fsSync.existsSync(path.join(distDir, 'index.html'))) {
  console.error('DIST_INDEX_MISSING')
  process.exit(2)
}

const screenshotDir = path.resolve(
  process.env.E2E_SCREENSHOT_DIR || path.join(os.tmpdir(), `kaipai-ai-profile-import-e2e-${process.pid}`),
)
const headless = process.env.E2E_HEADLESS !== 'false'
const viewport = { width: 1440, height: 1000 }
const pagePermission = 'page.system.ai-profile-import'
const supportingPagePermission = 'page.system.ai-image-providers'
const actionPermissions = {
  update: 'action.system.ai-profile-import.update',
  secret: 'action.system.ai-profile-import.secret',
  test: 'action.system.ai-profile-import.test',
  audit: 'action.system.ai-profile-import.audit',
  templateRead: 'action.system.ai-profile-import.template-read',
  templateUpdate: 'action.system.ai-profile-import.template-update',
  templateTest: 'action.system.ai-profile-import.template-test',
  templatePublish: 'action.system.ai-profile-import.template-publish',
  templateRestore: 'action.system.ai-profile-import.template-restore',
}
const testSecret = `DEEPSEEK_E2E_PLAINTEXT_SECRET_${randomUUID()}_ONLY_IN_MEMORY`
const sensitivePromptMarker = `PROMPT_BODY_DETAIL_ONLY_${randomUUID()}`
const serverPromptMarker = `SERVER_PROMPT_SNAPSHOT_${randomUUID()}`
const promptRoot = '/admin/ai/profile-import/prompt-templates'
const promptReasons = {
  publish: ['INITIAL_RELEASE', 'QUALITY_ADJUSTMENT', 'CONFIG_ALIGNMENT'],
  restore: ['QUALITY_REGRESSION', 'INCIDENT_ROLLBACK'],
  abandon: ['DRAFT_SUPERSEDED', 'DRAFT_INVALID'],
}

let baseUrl = ''
let currentSession = createSession({ profilePage: true, actions: Object.values(actionPermissions) })

function logStep(message) {
  const line = `[e2e] ${new Date().toISOString()} ${message}`
  console.log(line)
  try {
    fsSync.mkdirSync(screenshotDir, { recursive: true })
    fsSync.appendFileSync(path.join(screenshotDir, 'e2e.log'), `${line}\n`, 'utf8')
  } catch {
    // Console output remains available if the evidence directory is unavailable.
  }
}

function createSession({ profilePage, actions = [] }) {
  return {
    adminUserId: 9002,
    account: 'profile-import-e2e-admin',
    userName: '资料导入 E2E 管理员',
    roleCodes: ['profile_import_tester'],
    menuPermissions: ['menu.system'],
    pagePermissions: [supportingPagePermission, ...(profilePage ? [pagePermission] : [])],
    actionPermissions: actions,
  }
}

function nowText() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function createConfig(overrides = {}) {
  return {
    enabled: true,
    available: true,
    endpoint: 'https://api.deepseek.com/chat/completions',
    modelName: 'deepseek-chat',
    connectTimeoutMs: 3000,
    readTimeoutMs: 60000,
    maxInputChars: 20000,
    maxOutputTokens: 8000,
    perUserDailyLimit: 10,
    secretMask: 'ds-e2****MASKED',
    lastTestStatus: 'success',
    lastTestMessage: '固定 probe 已通过',
    lastTestAt: '2026-07-25 09:00:00',
    ...overrides,
  }
}

function stableHash(seed) {
  const token = Buffer.from(String(seed), 'utf8').toString('hex') || '0'
  return token.repeat(Math.ceil(64 / token.length)).slice(0, 64)
}

function versionSummary(promptVersionId, versionNo, lifecycleStatus, testStatus, overrides = {}) {
  return {
    promptVersionId,
    versionNo,
    versionLabel: versionNo === 1 ? 'bootstrap-v1' : `draft-v${versionNo}`,
    lifecycleStatus,
    contentSha256: stableHash(`content-${promptVersionId}-0`),
    testStatus,
    testedModelName: null,
    testErrorCode: null,
    testCandidateCount: 0,
    testWorkCount: 0,
    testElapsedMs: null,
    testedBy: null,
    testedAt: null,
    releasedBy: null,
    releasedAt: null,
    updateUserName: '资料导入 E2E 管理员',
    lastUpdate: '2026-07-26 10:00:00',
    version: 0,
    ...overrides,
  }
}

function versionDetail(promptVersionId, versionNo, lifecycleStatus, marker, overrides = {}) {
  return {
    ...versionSummary(promptVersionId, versionNo, lifecycleStatus, 'untested'),
    systemPromptBody: `E2E System Prompt ${marker}`,
    repairPromptBody: `E2E Repair Prompt ${marker}`,
    schemaVersion: 'profile-import-json-v1',
    contractVersion: 'profile-import-contract-v1',
    changeSummary: 'bootstrap fixture',
    ...overrides,
  }
}

function createPromptState(options = {}) {
  const draftTestStatus = options.draftTestStatus || 'untested'
  const promptState = {
    templates: [
      {
        templateId: 11,
        templateCode: 'full_profile',
        scene: 'full_profile',
        displayName: '完整资料识别',
        activeVersionId: null,
        activeVersionNo: null,
        activeVersionLabel: null,
        activeContentSha256: null,
        draftVersionId: 101,
        draftVersionNo: 1,
        draftVersionLabel: 'bootstrap-v1',
        draftTestStatus,
        version: 0,
      },
      {
        templateId: 12,
        templateCode: 'works_only',
        scene: 'works_only',
        displayName: '仅作品识别',
        activeVersionId: null,
        activeVersionNo: null,
        activeVersionLabel: null,
        activeContentSha256: null,
        draftVersionId: 201,
        draftVersionNo: 1,
        draftVersionLabel: 'bootstrap-v1',
        draftTestStatus,
        version: 0,
      },
    ],
    versions: {
      full_profile: [versionSummary(101, 1, 'draft', draftTestStatus)],
      works_only: [versionSummary(201, 1, 'draft', draftTestStatus)],
    },
    details: {
      101: versionDetail(101, 1, 'draft', sensitivePromptMarker, { testStatus: draftTestStatus }),
      201: versionDetail(201, 1, 'draft', `${sensitivePromptMarker}_WORKS`, { testStatus: draftTestStatus }),
    },
    audits: [
      {
        promptAuditId: 1,
        templateId: 11,
        promptVersionId: 101,
        actionCode: 'bootstrap',
        fromVersionId: null,
        toVersionId: 101,
        contentSha256: stableHash('content-101-0'),
        runtimeSha256: null,
        schemaVersion: 'profile-import-json-v1',
        contractVersion: 'profile-import-contract-v1',
        fixtureCode: null,
        fixtureVersion: null,
        fixtureSha256: null,
        modelName: null,
        configVersion: null,
        testOperatorId: null,
        testedAt: null,
        operatorId: 9002,
        operatorName: '资料导入 E2E 管理员',
        reasonCode: 'DRAFT_CREATED_CURRENT',
        resultStatus: 'success',
        errorCode: null,
        message: 'PROMPT_AUDIT_VISIBLE_ONLY',
        createTime: '2026-07-26 10:00:00',
      },
      {
        promptAuditId: 2,
        templateId: 12,
        promptVersionId: 201,
        actionCode: 'bootstrap',
        fromVersionId: null,
        toVersionId: 201,
        contentSha256: stableHash('content-201-0'),
        runtimeSha256: null,
        schemaVersion: 'profile-import-json-v1',
        contractVersion: 'profile-import-contract-v1',
        fixtureCode: null,
        fixtureVersion: null,
        fixtureSha256: null,
        modelName: null,
        configVersion: null,
        testOperatorId: null,
        testedAt: null,
        operatorId: 9002,
        operatorName: '资料导入 E2E 管理员',
        reasonCode: 'DRAFT_CREATED_CURRENT',
        resultStatus: 'success',
        errorCode: null,
        message: 'PROMPT_AUDIT_WORKS_VISIBLE_ONLY',
        createTime: '2026-07-26 10:00:01',
      },
    ],
    conflictNextSave: false,
    conflictMessage: null,
    nextPromptError: null,
    testAttemptByVersion: new Map(),
    templateListFailuresRemaining: Number(options.templateListFailuresRemaining || 0),
    emptyVersionTemplateCode: options.emptyVersionTemplateCode || null,
    blockedMutation: null,
  }
  if (draftTestStatus === 'success') {
    applySuccessfulPromptTest(promptState, 'full_profile', 101)
    applySuccessfulPromptTest(promptState, 'works_only', 201)
  }
  return promptState
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function promptTemplate(promptState, templateCode) {
  return promptState.templates.find((item) => item.templateCode === templateCode) || null
}

function promptVersionRecord(promptState, promptVersionId) {
  for (const [templateCode, versions] of Object.entries(promptState.versions)) {
    const summary = versions.find((item) => item.promptVersionId === promptVersionId)
    if (summary) {
      return { templateCode, summary, detail: promptState.details[promptVersionId] }
    }
  }
  return null
}

function promptTestResult(promptState, templateCode, promptVersionId, status) {
  const record = promptVersionRecord(promptState, promptVersionId)
  const candidateCount = templateCode === 'works_only' ? 0 : 2
  return {
    promptVersionId,
    contentSha256: record.summary.contentSha256,
    runtimeSha256: stableHash(`runtime-${promptVersionId}-${record.summary.contentSha256}`),
    fixtureCode: templateCode === 'works_only' ? 'works-only-fixed' : 'full-profile-fixed',
    fixtureVersion: 'fixture-v1',
    fixtureSha256: stableHash(`fixture-${templateCode}`),
    modelName: 'deepseek-chat',
    configVersion: 17,
    status,
    candidateCount,
    workCount: 2,
    elapsedMs: 42,
    errorCode: status === 'success' ? null : 'PROFILE_IMPORT_PROMPT_FIXTURE_FAILED',
    testedBy: currentSession.adminUserId,
    testedAt: nowText(),
  }
}

function applySuccessfulPromptTest(promptState, templateCode, promptVersionId) {
  const record = promptVersionRecord(promptState, promptVersionId)
  if (!record) return null
  const result = promptTestResult(promptState, templateCode, promptVersionId, 'success')
  Object.assign(record.summary, {
    testStatus: 'success',
    testedModelName: result.modelName,
    testErrorCode: null,
    testCandidateCount: result.candidateCount,
    testWorkCount: result.workCount,
    testElapsedMs: result.elapsedMs,
    testedBy: result.testedBy,
    testedAt: result.testedAt,
  })
  Object.assign(record.detail, record.summary, {
    testedRuntimeSha256: result.runtimeSha256,
    testFixtureCode: result.fixtureCode,
    testFixtureVersion: result.fixtureVersion,
    testFixtureSha256: result.fixtureSha256,
    testedConfigVersion: result.configVersion,
  })
  const template = promptTemplate(promptState, templateCode)
  if (template?.draftVersionId === promptVersionId) template.draftTestStatus = 'success'
  return result
}

function seedActivePromptWithDraft(promptState) {
  const template = promptTemplate(promptState, 'full_profile')
  const draft = promptVersionRecord(promptState, 101)
  Object.assign(draft.summary, { versionNo: 2, versionLabel: 'draft-v2' })
  Object.assign(draft.detail, { versionNo: 2, versionLabel: 'draft-v2' })
  const released = versionSummary(100, 1, 'released', 'success', {
    versionLabel: 'released-v1',
    releasedBy: 9002,
    releasedAt: '2026-07-26 09:00:00',
  })
  promptState.versions.full_profile.push(released)
  promptState.details[100] = versionDetail(100, 1, 'released', `${sensitivePromptMarker}_RELEASED`, released)
  applySuccessfulPromptTest(promptState, 'full_profile', 100)
  Object.assign(template, {
    activeVersionId: 100,
    activeVersionNo: 1,
    activeVersionLabel: released.versionLabel,
    activeContentSha256: released.contentSha256,
    draftVersionId: 101,
    draftVersionNo: 2,
    draftVersionLabel: 'draft-v2',
    draftTestStatus: draft.summary.testStatus,
    version: 1,
  })
}

function seedPromptRestoreHistory(promptState) {
  seedActivePromptWithDraft(promptState)
  const template = promptTemplate(promptState, 'full_profile')
  const active = promptVersionRecord(promptState, 100)
  const draft = promptVersionRecord(promptState, 101)
  Object.assign(active.summary, { versionNo: 2, versionLabel: 'released-v2' })
  Object.assign(active.detail, { versionNo: 2, versionLabel: 'released-v2' })
  Object.assign(draft.summary, { versionNo: 3, versionLabel: 'draft-v3' })
  Object.assign(draft.detail, { versionNo: 3, versionLabel: 'draft-v3' })
  const history = versionSummary(99, 1, 'released', 'success', {
    versionLabel: 'released-v1',
    releasedBy: 9002,
    releasedAt: '2026-07-25 09:00:00',
  })
  promptState.versions.full_profile.push(history)
  promptState.details[99] = versionDetail(99, 1, 'released', `${sensitivePromptMarker}_HISTORY`, history)
  applySuccessfulPromptTest(promptState, 'full_profile', 99)
  Object.assign(template, {
    activeVersionNo: 2,
    activeVersionLabel: active.summary.versionLabel,
    draftVersionNo: 3,
    draftVersionLabel: draft.summary.versionLabel,
  })
}

function createBlockedMutation(method, pathname) {
  let release
  const promise = new Promise((resolve) => {
    release = resolve
  })
  return {
    method,
    pathname,
    promise,
    requestCount: 0,
    released: false,
    release() {
      if (this.released) return
      this.released = true
      release()
    },
  }
}

const state = {
  config: createConfig(),
  secretConfigured: true,
  testAttempts: 0,
  requests: [],
  unhandledRequests: [],
  sentResponsePayloads: [],
  sentResponseRecords: [],
  prompt: createPromptState(),
  audits: [
    {
      auditId: 1,
      actionCode: 'CONFIG_BASELINE',
      operatorId: 9002,
      operatorName: '资料导入 E2E 管理员',
      resultStatus: 'success',
      message: 'E2E_AUDIT_VISIBLE_ONLY',
      createTime: '2026-07-25 09:00:00',
    },
  ],
}

function resetMockState(overrides = {}) {
  state.config = createConfig(overrides.config)
  state.secretConfigured = overrides.secretConfigured ?? Boolean(state.config.secretMask)
  state.testAttempts = 0
  state.requests = []
  state.unhandledRequests = []
  state.sentResponsePayloads = []
  state.sentResponseRecords = []
  state.prompt = createPromptState(overrides.prompt)
  state.audits = [
    {
      auditId: 1,
      actionCode: 'CONFIG_BASELINE',
      operatorId: 9002,
      operatorName: '资料导入 E2E 管理员',
      resultStatus: 'success',
      message: 'E2E_AUDIT_VISIBLE_ONLY',
      createTime: '2026-07-25 09:00:00',
    },
  ]
  syncAvailability()
}

function publicConfigComplete() {
  const config = state.config
  return Boolean(
    config.endpoint?.trim()
      && config.modelName?.trim()
      && Number(config.connectTimeoutMs) > 0
      && Number(config.readTimeoutMs) > 0
      && Number(config.maxInputChars) > 0
      && Number(config.maxOutputTokens) > 0
      && Number(config.perUserDailyLimit) > 0,
  )
}

function syncAvailability() {
  state.config.available = Boolean(
    state.config.enabled
      && publicConfigComplete()
      && state.secretConfigured
      && state.config.lastTestStatus === 'success',
  )
}

function resetTestStatus() {
  state.config.enabled = false
  state.config.available = false
  state.config.lastTestStatus = null
  state.config.lastTestMessage = null
  state.config.lastTestAt = null
  state.testAttempts = 0
}

function addAudit(actionCode, resultStatus, message) {
  state.audits.unshift({
    auditId: state.audits.length + 1,
    actionCode,
    operatorId: currentSession.adminUserId,
    operatorName: currentSession.userName,
    resultStatus,
    message,
    createTime: nowText(),
  })
}

function apiOk(data) {
  return { code: 200, message: 'OK', data }
}

function apiError(message, code = 400, errorCode = null) {
  return { code, message, errorCode, data: null }
}

function hasAction(permission) {
  return currentSession.actionPermissions.includes(permission)
}

function requireAction(permission) {
  if (!hasAction(permission)) {
    throw new Error(`Mock permission violation: ${permission}`)
  }
}

function configResponse() {
  return { ...state.config }
}

function parseBody(postData) {
  if (!postData) {
    return {}
  }
  return JSON.parse(postData)
}

function assertPromptPayload(body, allowedKeys, requiredKeys = []) {
  const forbiddenKeys = new Set([
    'reason',
    'operatorId',
    'operatorName',
    'lifecycleStatus',
    'activeVersionId',
    'draftVersionId',
    'schemaVersion',
    'contractVersion',
    'contentSha256',
    'runtimeSha256',
    'testStatus',
    'testedContentSha256',
    'testedRuntimeSha256',
    'testFixtureCode',
    'testFixtureVersion',
    'testFixtureSha256',
    'testedModelName',
    'testedConfigVersion',
    'testedBy',
    'testedAt',
    'releasedBy',
    'releasedAt',
  ])
  const visit = (value, location) => {
    if (!value || typeof value !== 'object') return
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) {
        throw new Error(`Forbidden Prompt payload field at ${location}.${key}`)
      }
      visit(item, `${location}.${key}`)
    }
  }
  visit(body, '$')
  for (const key of Object.keys(body)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Unexpected Prompt payload field: ${key}`)
    }
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(body, key)) {
      throw new Error(`Missing Prompt payload field: ${key}`)
    }
  }
}

function addPromptAudit(actionCode, template, summary, reasonCode, extra = {}) {
  state.prompt.audits.unshift({
    promptAuditId: state.prompt.audits.length + 1,
    templateId: template.templateId,
    promptVersionId: summary?.promptVersionId ?? null,
    actionCode,
    fromVersionId: extra.fromVersionId ?? null,
    toVersionId: extra.toVersionId ?? summary?.promptVersionId ?? null,
    contentSha256: summary?.contentSha256 ?? null,
    runtimeSha256: extra.runtimeSha256 ?? null,
    schemaVersion: 'profile-import-json-v1',
    contractVersion: 'profile-import-contract-v1',
    fixtureCode: extra.fixtureCode ?? null,
    fixtureVersion: extra.fixtureVersion ?? null,
    fixtureSha256: extra.fixtureSha256 ?? null,
    modelName: extra.modelName ?? null,
    configVersion: extra.configVersion ?? null,
    testOperatorId: extra.testOperatorId ?? null,
    testedAt: extra.testedAt ?? null,
    operatorId: currentSession.adminUserId,
    operatorName: currentSession.userName,
    reasonCode,
    resultStatus: 'success',
    errorCode: null,
    message: `${actionCode} completed`,
    createTime: nowText(),
  })
}

function syncDraftTemplate(promptState, templateCode, summary) {
  const template = promptTemplate(promptState, templateCode)
  if (!template || template.draftVersionId !== summary.promptVersionId) return
  template.draftVersionNo = summary.versionNo
  template.draftVersionLabel = summary.versionLabel
  template.draftTestStatus = summary.testStatus
}

function applyServerConflictSnapshot(promptState, promptVersionId) {
  const record = promptVersionRecord(promptState, promptVersionId)
  if (!record) return
  const nextVersion = record.summary.version + 1
  const contentSha256 = stableHash(`server-conflict-${promptVersionId}-${nextVersion}`)
  Object.assign(record.summary, {
    versionLabel: `server-v${record.summary.versionNo}`,
    contentSha256,
    testStatus: record.summary.testStatus === 'success' ? 'stale' : record.summary.testStatus,
    version: nextVersion,
    lastUpdate: nowText(),
  })
  Object.assign(record.detail, record.summary, {
    systemPromptBody: `Server System ${serverPromptMarker}`,
    repairPromptBody: `Server Repair ${serverPromptMarker}`,
    changeSummary: `Server summary ${serverPromptMarker}`,
  })
  syncDraftTemplate(promptState, record.templateCode, record.summary)
}

function consumePromptError(operation, promptVersionId) {
  const forced = state.prompt.nextPromptError
  if (forced?.operation === operation) {
    state.prompt.nextPromptError = null
    if (forced.errorCode === 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT' && promptVersionId) {
      applyServerConflictSnapshot(state.prompt, promptVersionId)
    }
    return apiError(forced.message, forced.code, forced.errorCode)
  }
  if (operation === 'save' && state.prompt.conflictNextSave) {
    state.prompt.conflictNextSave = false
    applyServerConflictSnapshot(state.prompt, promptVersionId)
    return apiError(
      state.prompt.conflictMessage || 'Prompt 版本已变化，请重新加载后人工合并',
      46018,
      'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT',
    )
  }
  return null
}

async function waitForBlockedPromptMutation(method, pathname) {
  const blocked = state.prompt.blockedMutation
  if (!blocked || blocked.method !== method || blocked.pathname !== pathname) return
  blocked.requestCount += 1
  await blocked.promise
}

function requirePromptReason(body, kind) {
  if (!promptReasons[kind].includes(body.reasonCode)) {
    throw new Error(`Unexpected ${kind} reasonCode: ${body.reasonCode}`)
  }
}

async function handleApiRequest(url, method, postData) {
  const parsed = new URL(url)
  const pathname = parsed.pathname.replace(/^\/api/, '')
  state.requests.push({ method, pathname, postData })

  if (method === 'GET' && pathname === '/admin/auth/me') {
    return apiOk(currentSession)
  }

  if (method === 'GET' && pathname === '/admin/ai/profile-import/config') {
    return apiOk(configResponse())
  }

  if (method === 'PUT' && pathname === '/admin/ai/profile-import/config') {
    requireAction(actionPermissions.update)
    const body = parseBody(postData)
    state.config = {
      ...state.config,
      endpoint: String(body.endpoint || ''),
      modelName: String(body.modelName || ''),
      connectTimeoutMs: Number(body.connectTimeoutMs),
      readTimeoutMs: Number(body.readTimeoutMs),
      maxInputChars: Number(body.maxInputChars),
      maxOutputTokens: Number(body.maxOutputTokens),
      perUserDailyLimit: Number(body.perUserDailyLimit),
    }
    resetTestStatus()
    addAudit('PUBLIC_CONFIG_UPDATE', 'success', '公共配置已更新，连接状态已重置')
    return apiOk(configResponse())
  }

  if (method === 'PUT' && pathname === '/admin/ai/profile-import/secret') {
    requireAction(actionPermissions.secret)
    const body = parseBody(postData)
    if (body.apiKey !== testSecret) {
      throw new Error('Mock received an unexpected one-way secret value')
    }
    state.secretConfigured = true
    state.config.secretMask = 'ds-e2****MASKED'
    resetTestStatus()
    addAudit('SECRET_UPDATE', 'success', '访问密钥已更新，连接状态已重置')
    return apiOk(configResponse())
  }

  if (method === 'POST' && pathname === '/admin/ai/profile-import/test') {
    requireAction(actionPermissions.test)
    const body = parseBody(postData)
    if (Object.keys(body).length) {
      throw new Error('Connection test must use the fixed probe without user payload')
    }
    state.config.enabled = false
    state.config.available = false
    state.config.lastTestAt = nowText()
    state.testAttempts += 1
    if (state.testAttempts === 1) {
      state.config.lastTestStatus = 'failed'
      state.config.lastTestMessage = '固定 probe 未返回约束 JSON'
      addAudit('CONNECTION_TEST', 'failed', '固定 probe 连接测试失败')
    } else {
      state.config.lastTestStatus = 'success'
      state.config.lastTestMessage = '固定 probe 已通过'
      addAudit('CONNECTION_TEST', 'success', '固定 probe 连接测试成功')
    }
    return apiOk(configResponse())
  }

  if (method === 'PUT' && pathname === '/admin/ai/profile-import/enabled') {
    requireAction(actionPermissions.update)
    const nextEnabled = parsed.searchParams.get('value') === 'true'
    if (nextEnabled && (!publicConfigComplete() || !state.secretConfigured || state.config.lastTestStatus !== 'success')) {
      return apiError('配置完整、密钥已配置且固定 probe 成功后才能启用', 46003)
    }
    state.config.enabled = nextEnabled
    syncAvailability()
    addAudit(nextEnabled ? 'ENABLE' : 'DISABLE', 'success', nextEnabled ? '资料导入已启用' : '资料导入已停用')
    return apiOk(configResponse())
  }

  if (method === 'GET' && pathname === '/admin/ai/profile-import/audits') {
    requireAction(actionPermissions.audit)
    return apiOk(state.audits.map((item) => ({ ...item })))
  }

  if (method === 'GET' && pathname === `${promptRoot}/audits`) {
    requireAction(actionPermissions.audit)
    return apiOk(cloneJson(state.prompt.audits))
  }

  if (method === 'GET' && pathname === promptRoot) {
    requireAction(actionPermissions.templateRead)
    if (state.prompt.templateListFailuresRemaining > 0) {
      state.prompt.templateListFailuresRemaining -= 1
      return apiError('模板加载失败', 503, 'PROFILE_IMPORT_PROMPT_LIST_FAILED')
    }
    return apiOk(cloneJson(state.prompt.templates))
  }

  const versionListMatch = pathname.match(new RegExp(`^${promptRoot}/(full_profile|works_only)/versions$`))
  if (method === 'GET' && versionListMatch) {
    requireAction(actionPermissions.templateRead)
    const templateCode = versionListMatch[1]
    const versions = state.prompt.emptyVersionTemplateCode === templateCode
      ? []
      : state.prompt.versions[templateCode]
    return apiOk(cloneJson(versions))
  }

  const versionDetailMatch = pathname.match(new RegExp(`^${promptRoot}/versions/(\\d+)$`))
  if (method === 'GET' && versionDetailMatch) {
    requireAction(actionPermissions.templateRead)
    const promptVersionId = Number(versionDetailMatch[1])
    await waitForBlockedPromptMutation(method, pathname)
    const detail = state.prompt.details[promptVersionId]
    if (!detail) return apiError('Prompt 版本不存在', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    return apiOk(cloneJson(detail))
  }

  const createDraftMatch = pathname.match(new RegExp(`^${promptRoot}/(full_profile|works_only)/drafts$`))
  if (method === 'POST' && createDraftMatch) {
    requireAction(actionPermissions.templateUpdate)
    const templateCode = createDraftMatch[1]
    const body = parseBody(postData)
    assertPromptPayload(body, ['sourceVersionId', 'expectedTemplateVersion'], ['expectedTemplateVersion'])
    const template = promptTemplate(state.prompt, templateCode)
    if (Number(body.expectedTemplateVersion) !== template.version || template.draftVersionId != null) {
      return apiError('当前模板状态不允许新建草稿', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    }
    const sourceVersionId = body.sourceVersionId ?? template.activeVersionId
    const source = promptVersionRecord(state.prompt, Number(sourceVersionId))
    if (!source || source.templateCode !== templateCode || source.summary.lifecycleStatus !== 'released') {
      return apiError('草稿来源无效', 46019, 'PROFILE_IMPORT_PROMPT_INVALID')
    }
    const versionNo = Math.max(...state.prompt.versions[templateCode].map((item) => item.versionNo)) + 1
    const promptVersionId = Math.max(...state.prompt.versions[templateCode].map((item) => item.promptVersionId)) + 1
    const summary = versionSummary(promptVersionId, versionNo, 'draft', 'untested', {
      versionLabel: `draft-v${versionNo}`,
      contentSha256: source.summary.contentSha256,
    })
    const detail = versionDetail(promptVersionId, versionNo, 'draft', `${sensitivePromptMarker}_DRAFT_${versionNo}`, {
      ...summary,
      systemPromptBody: source.detail.systemPromptBody,
      repairPromptBody: source.detail.repairPromptBody,
      changeSummary: `draft from v${source.summary.versionNo}`,
    })
    state.prompt.versions[templateCode].unshift(summary)
    state.prompt.details[promptVersionId] = detail
    template.draftVersionId = promptVersionId
    template.draftVersionNo = versionNo
    template.draftVersionLabel = summary.versionLabel
    template.draftTestStatus = 'untested'
    template.version += 1
    addPromptAudit('draft_create', template, summary, 'DRAFT_CREATED_CURRENT')
    return apiOk(cloneJson(template))
  }

  const updateDraftMatch = pathname.match(new RegExp(`^${promptRoot}/versions/(\\d+)$`))
  if (method === 'PUT' && updateDraftMatch) {
    requireAction(actionPermissions.templateUpdate)
    const promptVersionId = Number(updateDraftMatch[1])
    const body = parseBody(postData)
    assertPromptPayload(
      body,
      ['versionLabel', 'systemPromptBody', 'repairPromptBody', 'changeSummary', 'expectedVersion'],
      ['versionLabel', 'systemPromptBody', 'repairPromptBody', 'expectedVersion'],
    )
    const forcedError = consumePromptError('save', promptVersionId)
    if (forcedError) return forcedError
    const record = promptVersionRecord(state.prompt, promptVersionId)
    if (!record || record.summary.lifecycleStatus !== 'draft') {
      return apiError('当前版本不可编辑', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    }
    if (Number(body.expectedVersion) !== record.summary.version) {
      applyServerConflictSnapshot(state.prompt, promptVersionId)
      return apiError('Prompt 版本已变化', 46018, 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT')
    }
    const nextVersion = record.summary.version + 1
    const nextTestStatus = record.summary.testStatus === 'success' ? 'stale' : record.summary.testStatus
    const contentSha256 = stableHash(`content-${promptVersionId}-${nextVersion}`)
    Object.assign(record.summary, {
      versionLabel: String(body.versionLabel),
      contentSha256,
      testStatus: nextTestStatus,
      testErrorCode: null,
      version: nextVersion,
      lastUpdate: nowText(),
    })
    Object.assign(record.detail, record.summary, {
      systemPromptBody: String(body.systemPromptBody),
      repairPromptBody: String(body.repairPromptBody),
      changeSummary: body.changeSummary == null ? null : String(body.changeSummary),
    })
    syncDraftTemplate(state.prompt, record.templateCode, record.summary)
    const template = promptTemplate(state.prompt, record.templateCode)
    addPromptAudit('draft_update', template, record.summary, 'DRAFT_UPDATED')
    return apiOk(cloneJson(record.detail))
  }

  const testVersionMatch = pathname.match(new RegExp(`^${promptRoot}/versions/(\\d+)/test$`))
  if (method === 'POST' && testVersionMatch) {
    requireAction(actionPermissions.templateTest)
    if (postData !== undefined) {
      throw new Error('Prompt test request must not contain postData')
    }
    const promptVersionId = Number(testVersionMatch[1])
    const record = promptVersionRecord(state.prompt, promptVersionId)
    if (!record) return apiError('Prompt 版本不存在', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    const attempt = (state.prompt.testAttemptByVersion.get(promptVersionId) || 0) + 1
    state.prompt.testAttemptByVersion.set(promptVersionId, attempt)
    const status = attempt === 1 ? 'failed' : 'success'
    const result = promptTestResult(state.prompt, record.templateCode, promptVersionId, status)
    if (status === 'success') {
      applySuccessfulPromptTest(state.prompt, record.templateCode, promptVersionId)
    } else {
      Object.assign(record.summary, {
        testStatus: 'failed',
        testedModelName: result.modelName,
        testErrorCode: result.errorCode,
        testCandidateCount: result.candidateCount,
        testWorkCount: result.workCount,
        testElapsedMs: result.elapsedMs,
        testedBy: result.testedBy,
        testedAt: result.testedAt,
      })
      Object.assign(record.detail, record.summary)
      syncDraftTemplate(state.prompt, record.templateCode, record.summary)
    }
    const template = promptTemplate(state.prompt, record.templateCode)
    addPromptAudit('test', template, record.summary, 'TEST_EXECUTED', {
      runtimeSha256: result.runtimeSha256,
      fixtureCode: result.fixtureCode,
      fixtureVersion: result.fixtureVersion,
      fixtureSha256: result.fixtureSha256,
      modelName: result.modelName,
      configVersion: result.configVersion,
      testOperatorId: result.testedBy,
      testedAt: result.testedAt,
    })
    return apiOk(cloneJson(result))
  }

  const publishMatch = pathname.match(new RegExp(`^${promptRoot}/versions/(\\d+)/publish$`))
  if (method === 'POST' && publishMatch) {
    requireAction(actionPermissions.templatePublish)
    const promptVersionId = Number(publishMatch[1])
    const body = parseBody(postData)
    assertPromptPayload(body, ['reasonCode', 'expectedTemplateVersion', 'expectedVersion'], [
      'reasonCode',
      'expectedTemplateVersion',
      'expectedVersion',
    ])
    requirePromptReason(body, 'publish')
    await waitForBlockedPromptMutation(method, pathname)
    const forcedError = consumePromptError('publish', promptVersionId)
    if (forcedError) return forcedError
    const record = promptVersionRecord(state.prompt, promptVersionId)
    const template = record && promptTemplate(state.prompt, record.templateCode)
    if (!record || !template || record.summary.lifecycleStatus !== 'draft' || template.draftVersionId !== promptVersionId) {
      return apiError('当前模板状态不允许发布', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    }
    if (record.summary.testStatus !== 'success') {
      const stale = record.summary.testStatus === 'stale'
      return apiError(
        stale ? '试运行绑定已失效' : '请先完成固定样例试运行',
        stale ? 46021 : 46020,
        stale ? 'PROFILE_IMPORT_PROMPT_TEST_STALE' : 'PROFILE_IMPORT_PROMPT_TEST_REQUIRED',
      )
    }
    if (Number(body.expectedTemplateVersion) !== template.version || Number(body.expectedVersion) !== record.summary.version) {
      return apiError('Prompt 版本已变化', 46018, 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT')
    }
    const fromVersionId = template.activeVersionId
    Object.assign(record.summary, {
      lifecycleStatus: 'released',
      releasedBy: currentSession.adminUserId,
      releasedAt: nowText(),
      version: record.summary.version + 1,
    })
    Object.assign(record.detail, record.summary)
    Object.assign(template, {
      activeVersionId: promptVersionId,
      activeVersionNo: record.summary.versionNo,
      activeVersionLabel: record.summary.versionLabel,
      activeContentSha256: record.summary.contentSha256,
      draftVersionId: null,
      draftVersionNo: null,
      draftVersionLabel: null,
      draftTestStatus: null,
      version: template.version + 1,
    })
    const result = promptTestResult(state.prompt, record.templateCode, promptVersionId, 'success')
    addPromptAudit('publish', template, record.summary, body.reasonCode, {
      fromVersionId,
      toVersionId: promptVersionId,
      runtimeSha256: result.runtimeSha256,
      fixtureCode: result.fixtureCode,
      fixtureVersion: result.fixtureVersion,
      fixtureSha256: result.fixtureSha256,
      modelName: result.modelName,
      configVersion: result.configVersion,
      testOperatorId: record.summary.testedBy,
      testedAt: record.summary.testedAt,
    })
    return apiOk(cloneJson(template))
  }

  const abandonMatch = pathname.match(new RegExp(`^${promptRoot}/versions/(\\d+)/abandon$`))
  if (method === 'POST' && abandonMatch) {
    requireAction(actionPermissions.templateUpdate)
    const promptVersionId = Number(abandonMatch[1])
    const body = parseBody(postData)
    assertPromptPayload(body, ['reasonCode', 'expectedTemplateVersion', 'expectedVersion'], [
      'reasonCode',
      'expectedTemplateVersion',
      'expectedVersion',
    ])
    requirePromptReason(body, 'abandon')
    const forcedError = consumePromptError('abandon', promptVersionId)
    if (forcedError) return forcedError
    const record = promptVersionRecord(state.prompt, promptVersionId)
    const template = record && promptTemplate(state.prompt, record.templateCode)
    if (!record || !template || template.activeVersionId == null || template.draftVersionId !== promptVersionId) {
      return apiError('当前模板状态不允许放弃草稿', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    }
    if (Number(body.expectedTemplateVersion) !== template.version || Number(body.expectedVersion) !== record.summary.version) {
      return apiError('Prompt 版本已变化', 46018, 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT')
    }
    Object.assign(record.summary, { lifecycleStatus: 'abandoned', version: record.summary.version + 1 })
    Object.assign(record.detail, record.summary)
    Object.assign(template, {
      draftVersionId: null,
      draftVersionNo: null,
      draftVersionLabel: null,
      draftTestStatus: null,
      version: template.version + 1,
    })
    addPromptAudit('draft_abandon', template, record.summary, body.reasonCode)
    return apiOk(cloneJson(template))
  }

  const restoreMatch = pathname.match(new RegExp(`^${promptRoot}/(full_profile|works_only)/versions/(\\d+)/restore$`))
  if (method === 'POST' && restoreMatch) {
    requireAction(actionPermissions.templateRestore)
    const templateCode = restoreMatch[1]
    const promptVersionId = Number(restoreMatch[2])
    const body = parseBody(postData)
    assertPromptPayload(body, ['reasonCode', 'expectedTemplateVersion'], ['reasonCode', 'expectedTemplateVersion'])
    requirePromptReason(body, 'restore')
    const forcedError = consumePromptError('restore', promptVersionId)
    if (forcedError) return forcedError
    const record = promptVersionRecord(state.prompt, promptVersionId)
    const template = promptTemplate(state.prompt, templateCode)
    if (!record || record.templateCode !== templateCode || record.summary.lifecycleStatus !== 'released' || template.activeVersionId === promptVersionId) {
      return apiError('当前模板状态不允许恢复', 46022, 'PROFILE_IMPORT_PROMPT_STATE_CONFLICT')
    }
    if (Number(body.expectedTemplateVersion) !== template.version) {
      return apiError('Prompt 版本已变化', 46018, 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT')
    }
    const fromVersionId = template.activeVersionId
    Object.assign(template, {
      activeVersionId: promptVersionId,
      activeVersionNo: record.summary.versionNo,
      activeVersionLabel: record.summary.versionLabel,
      activeContentSha256: record.summary.contentSha256,
      version: template.version + 1,
    })
    addPromptAudit('restore', template, record.summary, body.reasonCode, {
      fromVersionId,
      toVersionId: promptVersionId,
    })
    return apiOk(cloneJson(template))
  }

  state.unhandledRequests.push(`${method} ${pathname}`)
  return apiError(`Unhandled E2E mock API: ${method} ${pathname}`, 404)
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out connecting to Chrome DevTools')), 10000)
      this.ws.addEventListener('open', () => {
        clearTimeout(timer)
        resolve()
      })
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timer)
        reject(new Error(`Chrome DevTools websocket error: ${event.message || 'unknown'}`))
      })
    })
    this.ws.addEventListener('message', async (event) => {
      try {
        this.handleMessage(await normalizeWebSocketMessage(event.data))
      } catch (error) {
        console.error(`[e2e] Failed to handle CDP message: ${error.message}`)
      }
    })
  }

  handleMessage(raw) {
    const message = JSON.parse(raw)
    if (message.id) {
      const pending = this.pending.get(message.id)
      if (!pending) {
        return
      }
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) {
        pending.reject(new Error(`${message.error.message}: ${message.error.data || ''}`))
      } else {
        pending.resolve(message.result || {})
      }
      return
    }
    const callbacks = this.listeners.get(message.method)
    callbacks?.forEach((callback) => callback(message.params || {}))
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP command timed out: ${method}`))
      }, 15000)
      this.pending.set(id, { resolve, reject, timer })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || []
    callbacks.push(callback)
    this.listeners.set(method, callbacks)
  }

  async close() {
    if (!this.ws) {
      return
    }
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('CDP client closed'))
    }
    this.pending.clear()
    this.ws.close()
    this.ws = null
  }
}

async function normalizeWebSocketMessage(data) {
  if (typeof data === 'string') {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8')
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8')
  }
  if (data && typeof data.text === 'function') {
    return data.text()
  }
  return String(data)
}

function withFetchTimeout(options = {}, timeoutMs = 3000) {
  return { ...options, signal: options.signal || AbortSignal.timeout(timeoutMs) }
}

async function fetchJson(url, options) {
  const response = await fetch(url, withFetchTimeout(options))
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`)
  }
  return response.json()
}

async function isHttpReady(url) {
  try {
    const response = await fetch(url, withFetchTimeout({ method: 'GET' }, 1500))
    return response.status < 500
  } catch {
    return false
  }
}

async function waitFor(predicate, label, timeoutMs = 15000, intervalMs = 120) {
  const startedAt = Date.now()
  let lastError = null
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await predicate()
      if (result) {
        return result
      }
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`)
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
    server.on('error', reject)
  })
}

async function chooseVitePort() {
  if (!process.env.E2E_ADMIN_PORT) {
    return findFreePort()
  }
  const port = Number(process.env.E2E_ADMIN_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid E2E_ADMIN_PORT: ${process.env.E2E_ADMIN_PORT}`)
  }
  return port
}

async function startFrontendServer() {
  const port = await chooseVitePort()
  baseUrl = `http://127.0.0.1:${port}`
  logStep(`启动独占后台前端: ${baseUrl}`)
  const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const args = distMode
    ? [viteCli, 'preview', '--outDir', distDir, '--host', '127.0.0.1', '--port', String(port), '--strictPort']
    : [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort']
  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })
  const logs = []
  child.stdout.on('data', (chunk) => logs.push(String(chunk)))
  child.stderr.on('data', (chunk) => logs.push(String(chunk)))

  await waitFor(
    async () => {
      if (child.exitCode !== null) {
        throw new Error(`Vite exited early.\n${logs.join('')}`)
      }
      return isHttpReady(baseUrl)
    },
    `Vite ${distMode ? 'preview' : 'dev'} server at ${baseUrl}`,
    30000,
    300,
  )
  return child
}

async function killProcessTree(pid) {
  if (!pid) {
    return
  }
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
      const timer = setTimeout(resolve, 5000)
      const done = () => {
        clearTimeout(timer)
        resolve()
      }
      killer.once('error', done)
      killer.once('close', done)
    })
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // Process already exited.
  }
}

async function findChromeExecutable() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH
  }
  const localAppData = process.env.LOCALAPPDATA || ''
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        localAppData && path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        localAppData && path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ].filter(Boolean)
    : process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']

  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // Continue to the next known installation path.
    }
  }
  throw new Error('未找到 Chrome/Edge，可通过 CHROME_PATH 指定浏览器可执行文件')
}

async function launchBrowser() {
  const chromePath = await findChromeExecutable()
  const remotePort = await findFreePort()
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kaipai-profile-import-browser-'))
  const args = [
    `--remote-debugging-port=${remotePort}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-features=Translate',
    `--window-size=${viewport.width},${viewport.height}`,
    headless ? '--headless=new' : '',
    'about:blank',
  ].filter(Boolean)
  logStep(`启动临时浏览器 profile: ${path.basename(userDataDir)}`)
  const child = spawn(chromePath, args, { stdio: 'ignore' })

  try {
    await waitFor(
      async () => {
        if (child.exitCode !== null) {
          throw new Error('Chrome/Edge exited before DevTools became available')
        }
        try {
          return await fetchJson(`http://127.0.0.1:${remotePort}/json/version`)
        } catch {
          return false
        }
      },
      'Chrome/Edge DevTools endpoint',
      15000,
      200,
    )
    const target = await fetchJson(`http://127.0.0.1:${remotePort}/json/new?${encodeURIComponent('about:blank')}`, {
      method: 'PUT',
    })
    return {
      child,
      userDataDir,
      wsUrl: target.webSocketDebuggerUrl,
      async close() {
        await killProcessTree(child.pid)
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      },
    }
  } catch (error) {
    await killProcessTree(child.pid)
    await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    throw error
  }
}

function formatConsoleArgs(args = []) {
  return args.map((arg) => String(arg.value ?? arg.description ?? arg.type ?? '')).join(' ')
}

async function setupBrowserPage(client) {
  const diagnostics = {
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    assetUrls: [],
    pendingMocks: new Set(),
  }

  client.on('Runtime.exceptionThrown', (event) => {
    const detail = event.exceptionDetails
    diagnostics.pageErrors.push(detail?.exception?.description || detail?.text || 'Runtime exception')
  })
  client.on('Runtime.consoleAPICalled', (event) => {
    const message = formatConsoleArgs(event.args)
    if (event.type === 'error' || event.type === 'assert') {
      diagnostics.consoleErrors.push(message)
    } else if (event.type === 'warning') {
      diagnostics.consoleWarnings.push(message)
    }
  })
  client.on('Log.entryAdded', (event) => {
    const entry = event.entry || {}
    if (entry.level === 'error' && !String(entry.text || '').includes('Failed to load resource')) {
      diagnostics.consoleErrors.push(String(entry.text || 'Browser log error'))
    } else if (entry.level === 'warning') {
      diagnostics.consoleWarnings.push(String(entry.text || 'Browser log warning'))
    }
  })
  client.on('Network.loadingFailed', (event) => {
    if (!event.canceled) {
      diagnostics.failedRequests.push(`${event.requestId}: ${event.errorText}`)
    }
  })
  client.on('Network.responseReceived', (event) => {
    if (event.type === 'Script' || event.type === 'Stylesheet') {
      diagnostics.assetUrls.push(String(event.response?.url || ''))
    }
    if (Number(event.response?.status) >= 400) {
      diagnostics.httpErrors.push(`${event.response.status} ${event.response.url}`)
    }
  })
  client.on('Fetch.requestPaused', (event) => {
    const task = (async () => {
      if (new URL(event.request.url).pathname === '/favicon.ico') {
        await client.send('Fetch.fulfillRequest', {
          requestId: event.requestId,
          responseCode: 204,
          responsePhrase: 'No Content',
          responseHeaders: [{ name: 'Cache-Control', value: 'no-store' }],
        })
        return
      }
      let response
      try {
        response = await handleApiRequest(event.request.url, event.request.method, event.request.postData)
      } catch (error) {
        response = apiError(error.message, 500)
      }
      const responseJson = JSON.stringify(response)
      const responsePayload = JSON.parse(responseJson)
      const responsePathname = new URL(event.request.url).pathname.replace(/^\/api/, '')
      state.sentResponsePayloads.push(responsePayload)
      state.sentResponseRecords.push({
        method: event.request.method,
        pathname: responsePathname,
        payload: responsePayload,
      })
      await client.send('Fetch.fulfillRequest', {
        requestId: event.requestId,
        responseCode: 200,
        responsePhrase: 'OK',
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json; charset=utf-8' },
          { name: 'Cache-Control', value: 'no-store' },
        ],
        body: Buffer.from(responseJson, 'utf8').toString('base64'),
      })
    })()
    diagnostics.pendingMocks.add(task)
    task.finally(() => diagnostics.pendingMocks.delete(task))
  })

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Log.enable')
  await client.send('Network.enable')
  await client.send('Fetch.enable', {
    patterns: [
      { urlPattern: `${baseUrl}/api/*`, requestStage: 'Request' },
      { urlPattern: `${baseUrl}/favicon.ico`, requestStage: 'Request' },
    ],
  })
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      if (!localStorage.getItem('__kaipai-profile-import-e2e-managed')) {
        localStorage.setItem('__kaipai-profile-import-e2e-managed', 'true');
        localStorage.setItem('kaipai-admin-token', 'profile-import-e2e-token');
        localStorage.setItem('kaipai-admin-session', ${JSON.stringify(JSON.stringify(currentSession))});
      }
    `,
  })
  return diagnostics
}

async function evaluate(client, expression, awaitPromise = true) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluate failed')
  }
  return result.result?.value
}

function jsString(value) {
  return JSON.stringify(value)
}

async function setBrowserSession(client, session) {
  currentSession = session
  await evaluate(
    client,
    `
      localStorage.setItem('kaipai-admin-token', 'profile-import-e2e-token');
      localStorage.setItem('kaipai-admin-session', ${JSON.stringify(JSON.stringify(session))});
    `,
  )
}

async function navigate(client, pathname) {
  await client.send('Page.navigate', { url: `${baseUrl}${pathname}` })
  await waitFor(
    () => evaluate(client, `document.readyState === 'complete' && Boolean(document.querySelector('#app'))`),
    `document ${pathname}`,
    15000,
  )
}

async function waitForText(client, value, timeoutMs = 10000) {
  await waitFor(
    () => evaluate(client, `Boolean(document.body && document.body.innerText.includes(${jsString(value)}))`),
    `text ${JSON.stringify(value)}`,
    timeoutMs,
  )
}

async function assertBrowser(client, expression, message) {
  const result = await evaluate(client, expression)
  if (!result) {
    throw new Error(message)
  }
}

async function clickText(client, text, selector = 'button') {
  const clicked = await evaluate(
    client,
    `
      (() => {
        const nodes = Array.from(document.querySelectorAll(${jsString(selector)}));
        const node = nodes.find((item) => item.innerText && item.innerText.trim().includes(${jsString(text)}));
        if (!node || node.disabled) return false;
        node.scrollIntoView({ block: 'center', inline: 'center' });
        node.click();
        return true;
      })()
    `,
  )
  if (!clicked) {
    throw new Error(`未找到可点击元素: ${text}`)
  }
}

async function waitForSelector(client, selector, timeoutMs = 10000) {
  await waitFor(
    () => evaluate(client, `Boolean(document.querySelector(${jsString(selector)}))`),
    `selector ${selector}`,
    timeoutMs,
  )
}

async function clickSelector(client, selector, label = selector) {
  const clicked = await evaluate(
    client,
    `(() => {
      const node = document.querySelector(${jsString(selector)});
      if (!node || node.disabled || node.getAttribute('aria-disabled') === 'true') return false;
      node.scrollIntoView({ block: 'center', inline: 'nearest' });
      node.click();
      return true;
    })()`,
  )
  if (!clicked) throw new Error(`未找到可点击元素: ${label}`)
}

async function clickPromptAction(client, action, scope = '.profile-import-prompt-panel') {
  await clickSelector(client, `${scope} [data-action="${action}"]`, `Prompt action ${action}`)
}

async function clickSceneTab(client, label) {
  const clicked = await evaluate(
    client,
    `(() => {
      const tab = Array.from(document.querySelectorAll('.profile-import-prompt-panel .el-tabs__item'))
        .find((node) => node.innerText.trim() === ${jsString(label)});
      if (!tab) return false;
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      tab.click();
      return true;
    })()`,
  )
  if (!clicked) throw new Error(`未找到 Prompt scene tab: ${label}`)
}

async function setPromptEditorField(client, label, value) {
  const updated = await evaluate(
    client,
    `(() => {
      const dialog = document.querySelector('.prompt-editor-dialog');
      const item = Array.from(dialog?.querySelectorAll('.el-form-item') || []).find((candidate) => {
        const labelNode = candidate.querySelector('.el-form-item__label');
        return labelNode && labelNode.innerText.includes(${jsString(label)});
      });
      const input = item?.querySelector('input, textarea');
      if (!input || input.disabled || input.readOnly) return false;
      input.focus();
      input.value = ${jsString(value)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  )
  if (!updated) throw new Error(`未找到 Prompt 编辑字段: ${label}`)
}

async function promptEditorValues(client) {
  return evaluate(
    client,
    `(() => {
      const dialog = document.querySelector('.prompt-editor-dialog');
      const valueFor = (label) => {
        const item = Array.from(dialog?.querySelectorAll('.el-form-item') || []).find((candidate) =>
          candidate.querySelector('.el-form-item__label')?.innerText.includes(label));
        return item?.querySelector('input, textarea')?.value ?? null;
      };
      return {
        versionLabel: valueFor('版本标签'),
        systemPromptBody: valueFor('System Prompt'),
        repairPromptBody: valueFor('Repair Prompt'),
        changeSummary: valueFor('变更说明'),
      };
    })()`,
  )
}

async function selectAuditReason(client, label) {
  await waitForSelector(client, '.audit-confirm-dialog .dialog-reason-select')
  await clickSelector(client, '.audit-confirm-dialog .dialog-reason-select .el-select__wrapper', 'reason select')
  await waitFor(
    () => evaluate(
      client,
      `Array.from(document.querySelectorAll('.el-select-dropdown__item')).some((node) => node.offsetParent !== null && node.innerText.trim() === ${jsString(label)})`,
    ),
    `reason option ${label}`,
  )
  await clickText(client, label, '.el-select-dropdown__item')
}

async function confirmAuditDialog(client) {
  await clickSelector(client, '.audit-confirm-dialog .el-button--primary', 'audit confirmation')
}

async function closeVisibleDialog(client, selector) {
  await clickSelector(client, `${selector} .el-dialog__headerbtn`, `close ${selector}`)
  await waitFor(
    () => evaluate(client, `!document.querySelector(${jsString(selector)})`),
    `${selector} to close`,
  )
}

function routeCalls(method, pathname) {
  return state.requests.filter((request) => request.method === method && request.pathname === pathname)
}

function promptRouteCalls() {
  return state.requests.filter(({ pathname }) => pathname.startsWith(promptRoot))
}

async function resetCapturedBusinessErrors(client) {
  if (distMode) return
  await evaluate(client, `window.__promptE2eBusinessErrors = []`)
}

async function latestCapturedBusinessError(client) {
  if (distMode) return null
  return evaluate(client, `window.__promptE2eBusinessErrors?.at(-1) || null`)
}

async function setInputByFormLabel(client, label, value) {
  const updated = await evaluate(
    client,
    `
      (() => {
        const item = Array.from(document.querySelectorAll('.el-form-item')).find((candidate) => {
          const labelNode = candidate.querySelector('.el-form-item__label');
          return labelNode && labelNode.innerText.includes(${jsString(label)});
        });
        const input = item && item.querySelector('input, textarea');
        if (!input || input.disabled) return false;
        input.focus();
        input.value = ${jsString(value)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
        return true;
      })()
    `,
  )
  if (!updated) {
    throw new Error(`未找到可编辑表单项: ${label}`)
  }
}

async function setSecretInput(client, value) {
  const updated = await evaluate(
    client,
    `
      (() => {
        const heading = Array.from(document.querySelectorAll('h3')).find((item) => item.innerText.trim() === '访问密钥');
        const card = heading && heading.closest('.el-card');
        const input = card && card.querySelector('input[type="password"]');
        if (!input || input.disabled) return false;
        input.focus();
        input.value = ${jsString(value)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  )
  if (!updated) {
    throw new Error('未找到可编辑的访问密钥输入框')
  }
}

async function waitForMessage(client, type, text) {
  await waitFor(
    () => evaluate(
      client,
      `Array.from(document.querySelectorAll('.el-message--${type}')).some((node) => node.innerText.includes(${jsString(text)}))`,
    ),
    `${type} toast ${JSON.stringify(text)}`,
    10000,
  )
}

async function waitForMessagesGone(client) {
  await waitFor(
    () => evaluate(client, `document.querySelectorAll('.el-message').length === 0`),
    'toast messages to close',
    6000,
  )
}

async function waitForNetworkIdle(client) {
  await evaluate(
    client,
    `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150))))`,
  )
}

async function runApiBusinessErrorHarness(client) {
  if (distMode) return
  logStep('验证 Prompt API 保留 typed ApiBusinessError 并抑制业务错误全局 toast')
  const backendMessage = `随机后端冲突消息_${randomUUID()}`
  state.prompt.nextPromptError = {
    operation: 'save',
    code: 46018,
    errorCode: 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT',
    message: backendMessage,
  }
  const result = await evaluate(
    client,
    `(async () => {
      const requestModule = await import('/src/utils/request.ts');
      const apiModule = await import('/src/api/ai.ts');
      window.__promptE2eBusinessErrors = [];
      if (!window.__promptE2eCaptureInstalled) {
        requestModule.default.interceptors.response.use(undefined, (error) => {
          window.__promptE2eBusinessErrors.push({
            isBusinessError: requestModule.isApiBusinessError(error),
            name: error?.name,
            code: error?.code,
            errorCode: error?.errorCode,
            message: error?.message,
          });
          return Promise.reject(error);
        });
        window.__promptE2eCaptureInstalled = true;
      }
      try {
        await apiModule.updateProfileImportPromptDraft(101, {
          versionLabel: 'typed-error-probe',
          systemPromptBody: 'typed error System body',
          repairPromptBody: 'typed error Repair body',
          changeSummary: 'typed error probe',
          expectedVersion: 0,
        });
        return { resolved: true };
      } catch (error) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)));
        return {
          resolved: false,
          isBusinessError: requestModule.isApiBusinessError(error),
          name: error?.name,
          code: error?.code,
          errorCode: error?.errorCode,
          message: error?.message,
          captured: window.__promptE2eBusinessErrors.at(-1),
          toastTexts: Array.from(document.querySelectorAll('.el-message')).map((node) => node.innerText),
        };
      }
    })()`,
  )
  assertEqual(result.resolved, false, 'typed business error probe must reject')
  assertEqual(result.isBusinessError, true, 'typed business error instanceof guard')
  assertEqual(result.name, 'ApiBusinessError', 'typed business error name')
  assertEqual(result.code, 46018, 'typed business error numeric code')
  assertEqual(result.errorCode, 'PROFILE_IMPORT_PROMPT_VERSION_CONFLICT', 'typed business error stable errorCode')
  assertEqual(result.message, backendMessage, 'typed business error backend message')
  assertEqual(result.captured?.isBusinessError, true, 'typed business error interceptor capture')
  assertEqual(result.toastTexts.some((text) => text.includes(backendMessage)), false, 'suppressed Prompt business error toast')
}

async function runAuditDialogHarnesses(client) {
  if (distMode) return
  logStep('验证 AuditConfirmDialog 固定 reason 选项与旧 textarea 调用方兼容')
  const optionSets = [
    [
      ['首次发布', 'INITIAL_RELEASE'],
      ['质量调整', 'QUALITY_ADJUSTMENT'],
      ['模型配置对齐', 'CONFIG_ALIGNMENT'],
    ],
    [
      ['质量回退', 'QUALITY_REGRESSION'],
      ['故障恢复', 'INCIDENT_ROLLBACK'],
    ],
    [
      ['已有替代草稿', 'DRAFT_SUPERSEDED'],
      ['草稿内容无效', 'DRAFT_INVALID'],
    ],
  ]
  const result = await evaluate(
    client,
    `(async () => {
      const Vue = await import('/node_modules/.vite/deps/vue.js');
      const ElementPlusModule = await import('/node_modules/.vite/deps/element-plus.js');
      const DialogModule = await import('/src/components/dialogs/AuditConfirmDialog.vue');
      const ElementPlus = ElementPlusModule.default || ElementPlusModule;
      const AuditConfirmDialog = DialogModule.default;
      const optionSets = ${JSON.stringify(optionSets)};
      const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      async function withMountedDialog(props, verify) {
        const host = document.createElement('div');
        host.dataset.e2eAuditDialogHost = 'true';
        document.body.appendChild(host);
        const previousOverlays = new Set(document.querySelectorAll('.el-overlay'));
        const previousPoppers = new Set(document.querySelectorAll('.el-select__popper'));
        const submissions = [];
        const app = Vue.createApp({
          render() {
            return Vue.h(AuditConfirmDialog, {
              ...props,
              onSubmit: (value) => submissions.push(value),
            });
          },
        });
        app.use(ElementPlus);
        try {
          app.mount(host);
          await settle();
          return await verify({ submissions, settle });
        } finally {
          app.unmount();
          host.remove();
          document.querySelectorAll('.el-overlay').forEach((node) => {
            if (!previousOverlays.has(node)) node.remove();
          });
          document.querySelectorAll('.el-select__popper').forEach((node) => {
            if (!previousPoppers.has(node)) node.remove();
          });
          await settle();
        }
      }

      const fixedResults = [];
      for (const [index, options] of optionSets.entries()) {
        fixedResults.push(await withMountedDialog({
          modelValue: true,
          title: 'E2E 固定原因 ' + index,
          requireReason: true,
          reasonOptions: options.map(([label, value]) => ({ label, value })),
        }, async ({ submissions, settle }) => {
          const dialog = document.querySelector('.audit-confirm-dialog');
          const select = dialog?.querySelector('.dialog-reason-select');
          if (!dialog || !select || select.classList.contains('is-disabled')) {
            throw new Error('fixed-option harness requires one enabled .dialog-reason-select');
          }
          if (dialog.querySelectorAll('.dialog-reason-select').length !== 1 || dialog.querySelectorAll('textarea').length !== 0) {
            throw new Error('fixed-option harness control cardinality mismatch');
          }
          const labels = [];
          for (const [label, expectedValue] of options) {
            select.querySelector('.el-select__wrapper')?.click();
            await settle();
            const items = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
              .filter((node) => node.offsetParent !== null);
            if (!labels.length) labels.push(...items.map((node) => node.innerText.trim()));
            const item = items.find((node) => node.innerText.trim() === label);
            if (!item) throw new Error('fixed-option label missing: ' + label);
            item.click();
            await settle();
            dialog.querySelector('.el-button--primary')?.click();
            await settle();
            if (submissions.at(-1) !== expectedValue) {
              throw new Error('fixed-option value mismatch for ' + label);
            }
          }
          return { labels, values: submissions.slice() };
        }));
      }

      const legacy = await withMountedDialog({
        modelValue: true,
        title: 'E2E 旧调用方',
        requireReason: true,
      }, async ({ submissions, settle }) => {
        const dialog = document.querySelector('.audit-confirm-dialog');
        const textarea = dialog?.querySelector('textarea');
        if (!dialog || !textarea || dialog.querySelectorAll('textarea').length !== 1) {
          throw new Error('legacy harness requires exactly one textarea');
        }
        if (dialog.querySelectorAll('.dialog-reason-select').length !== 0) {
          throw new Error('legacy harness must not render a fixed-option select');
        }
        textarea.value = '  旧调用备注  ';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await settle();
        dialog.querySelector('.el-button--primary')?.click();
        await settle();
        return submissions.at(-1);
      });
      return { fixedResults, legacy };
    })()`,
  )
  for (const [index, expected] of optionSets.entries()) {
    assertEqual(JSON.stringify(result.fixedResults[index].labels), JSON.stringify(expected.map(([label]) => label)), `reason option labels ${index}`)
    assertEqual(JSON.stringify(result.fixedResults[index].values), JSON.stringify(expected.map(([, value]) => value)), `reason option values ${index}`)
  }
  assertEqual(result.legacy, '旧调用备注', 'legacy AuditConfirmDialog trimmed submit')
}

async function screenshot(client, filename) {
  await waitForNetworkIdle(client)
  const metrics = await client.send('Page.getLayoutMetrics')
  const contentSize = metrics.cssContentSize || metrics.contentSize
  const result = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.max(viewport.width, Math.ceil(contentSize.width)),
      height: Math.max(viewport.height, Math.ceil(contentSize.height)),
      scale: 1,
    },
  })
  const target = path.join(screenshotDir, filename)
  await fs.writeFile(target, Buffer.from(result.data, 'base64'))
  logStep(`截图已保存: ${target}`)
}

async function assertFormalEntryAndPageGuard(client) {
  logStep('验证有页面权限时正式系统设置入口可用，DeepSeek 不进入 sidebar')
  await navigate(client, '/system/settings')
  await waitForText(client, '系统设置')
  await waitForText(client, 'DeepSeek 资料导入')
  await assertBrowser(
    client,
    `(() => {
      const sidebar = document.querySelector('.admin-sidebar');
      const entries = Array.from(document.querySelectorAll('.settings-item'))
        .filter((node) => node.innerText.includes('DeepSeek 资料导入'));
      return Boolean(sidebar)
        && sidebar.innerText.includes('系统设置')
        && !sidebar.innerText.includes('DeepSeek 资料导入')
        && !sidebar.innerHTML.includes('/system/ai-profile-import')
        && entries.length === 1
        && entries[0].innerText.includes('模型、密钥与 Prompt 版本治理');
    })()`,
    '系统设置必须只有一个 DeepSeek 入口、使用正式摘要，且 sidebar 不得出现 DeepSeek route/label',
  )
  await screenshot(client, '01-settings-entry-without-deepseek-sidebar.png')
  await clickText(client, 'DeepSeek 资料导入', '.settings-item')
  await waitForText(client, '访问密钥')
  await assertBrowser(client, `location.pathname === '/system/ai-profile-import'`, '系统设置入口未进入 DeepSeek 配置页')

  logStep('验证无页面权限时入口隐藏且直达路由被守卫重定向')
  await setBrowserSession(client, createSession({ profilePage: false }))
  await navigate(client, '/system/settings')
  await waitForText(client, 'AI 生图模型配置')
  await assertBrowser(
    client,
    `!Array.from(document.querySelectorAll('.settings-item')).some((node) => node.innerText.includes('DeepSeek 资料导入'))`,
    '无页面权限时 DeepSeek 系统设置入口仍然可见',
  )
  await navigate(client, '/system/ai-profile-import')
  await waitFor(
    () => evaluate(client, `location.pathname !== '/system/ai-profile-import'`),
    'route guard redirect',
    10000,
  )
  await assertBrowser(client, `location.pathname === '/system/settings'`, '无页面权限直达时未被路由守卫重定向到可访问页')
  await assertBrowser(client, `!document.body.innerText.includes('访问密钥')`, '无页面权限仍渲染了 DeepSeek 配置页')
  await screenshot(client, '02-page-permission-denied.png')
}

async function permissionSurface(client) {
  return evaluate(
    client,
    `(() => {
      const button = (text) => Array.from(document.querySelectorAll('button')).find((node) => node.innerText.trim().includes(text));
      const heading = (text) => Array.from(document.querySelectorAll('h3')).find((node) => node.innerText.trim() === text);
      const secretCard = heading('访问密钥')?.closest('.el-card');
      const testCard = heading('连接状态')?.closest('.el-card');
      const endpointItem = Array.from(document.querySelectorAll('.el-form-item')).find((node) => node.innerText.includes('接口地址'));
      const endpointInput = endpointItem?.querySelector('input');
      const secretInput = secretCard?.querySelector('input[type="password"]');
      const secretButton = Array.from(secretCard?.querySelectorAll('button') || []).find((node) => node.innerText.includes('更新密钥'));
      const testButton = Array.from(testCard?.querySelectorAll('button') || []).find((node) => node.innerText.includes('测试连接'));
      return {
        configEditable: Boolean(endpointInput && !endpointInput.disabled),
        saveVisible: Boolean(button('保存配置')),
        enableVisible: Boolean(document.querySelector('.status-actions .el-switch')),
        secretEditable: Boolean(secretInput && !secretInput.disabled),
        secretButtonPermissionOpen: Boolean(secretButton && !secretButton.disabled) || Boolean(secretInput && !secretInput.disabled),
        testEnabled: Boolean(testButton && !testButton.disabled),
        auditVisible: Boolean(heading('模型配置审计')),
        auditFixtureVisible: document.body.innerText.includes('E2E_AUDIT_VISIBLE_ONLY'),
      };
    })()`,
  )
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

async function assertActionPermissions(client) {
  const scenarios = [
    { key: 'update', expected: { configEditable: true, saveVisible: true, enableVisible: true } },
    { key: 'secret', expected: { secretEditable: true, secretButtonPermissionOpen: true } },
    { key: 'test', expected: { testEnabled: true } },
    { key: 'audit', expected: { auditVisible: true, auditFixtureVisible: true } },
  ]

  for (const scenario of scenarios) {
    logStep(`验证 action 权限隔离: ${scenario.key}`)
    state.requests = []
    await setBrowserSession(
      client,
      createSession({ profilePage: true, actions: [actionPermissions[scenario.key]] }),
    )
    await navigate(client, '/system/ai-profile-import')
    await waitForText(client, '访问密钥')
    const surface = await permissionSurface(client)
    for (const key of ['configEditable', 'saveVisible', 'enableVisible', 'secretEditable', 'secretButtonPermissionOpen', 'testEnabled', 'auditVisible', 'auditFixtureVisible']) {
      assertEqual(surface[key], scenario.expected[key] ?? false, `${scenario.key} permission surface ${key}`)
    }
    const auditCalls = state.requests.filter((request) => request.pathname === '/admin/ai/profile-import/audits').length
    assertEqual(auditCalls, scenario.key === 'audit' ? 1 : 0, `${scenario.key} audit API exposure`)
  }
  await screenshot(client, '03-audit-only-permission.png')
}

function rejectPromptBodyRecursively(value, location = '$') {
  if (typeof value === 'string') {
    if (value.includes(sensitivePromptMarker) || value.includes(serverPromptMarker)) {
      throw new Error(`sensitive Prompt marker in browser response at ${location}`)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectPromptBodyRecursively(item, `${location}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (key === 'systemPromptBody' || key === 'repairPromptBody') {
      throw new Error(`Prompt body field in browser response at ${location}.${key}`)
    }
    rejectPromptBodyRecursively(item, `${location}.${key}`)
  }
}

async function promptPermissionSurface(client) {
  return evaluate(
    client,
    `(() => {
      const panel = document.querySelector('.profile-import-prompt-panel');
      const actions = ['view', 'create', 'edit', 'test', 'publish', 'restore', 'abandon', 'save'];
      return {
        panelVisible: Boolean(panel),
        tableVisible: Boolean(panel?.querySelector('.prompt-version-table')),
        auditVisible: Boolean(document.querySelector('.prompt-template-audit-table')),
        actions: Object.fromEntries(actions.map((action) => [action, document.querySelectorAll('[data-action="' + action + '"]').length])),
      };
    })()`,
  )
}

function assertOnlyPromptActions(surface, allowed, label) {
  for (const [action, count] of Object.entries(surface.actions)) {
    const shouldExist = allowed.includes(action)
    if (shouldExist && count < 1) {
      throw new Error(`${label}: expected Prompt action ${action}`)
    }
    if (!shouldExist && count !== 0) {
      throw new Error(`${label}: forbidden Prompt action ${action} rendered ${count} time(s)`)
    }
  }
}

async function assertPromptPermissionsAndNoReadLeakage(client) {
  logStep('验证 template-read-only 只读正文动作与单次 lazy detail')
  resetMockState()
  await setBrowserSession(client, createSession({
    profilePage: true,
    actions: [actionPermissions.templateRead],
  }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.profile-import-prompt-panel')
  await waitForText(client, '完整资料识别')
  await waitForNetworkIdle(client)
  const readSurface = await promptPermissionSurface(client)
  assertEqual(readSurface.tableVisible, true, 'template-read version table')
  assertOnlyPromptActions(readSurface, ['view'], 'template-read-only surface')
  assertEqual(routeCalls('GET', `${promptRoot}/versions/101`).length, 0, 'detail prefetch before read-only view')
  state.sentResponseRecords
    .filter(({ pathname }) => pathname.startsWith(promptRoot))
    .forEach(({ payload, pathname }) => rejectPromptBodyRecursively(payload, `$readLists[${pathname}]`))
  await clickPromptAction(client, 'view')
  await waitForSelector(client, '.prompt-editor-dialog')
  await waitFor(
    () => evaluate(
      client,
      `Array.from(document.querySelectorAll('.prompt-editor-dialog textarea')).some((node) => String(node.value).includes(${jsString(sensitivePromptMarker)}))`,
    ),
    'read-only detail loads body into dialog',
  )
  assertEqual(routeCalls('GET', `${promptRoot}/versions/101`).length, 1, 'read-only view detail request cardinality')
  await assertBrowser(
    client,
    `(() => {
      const dialog = document.querySelector('.prompt-editor-dialog');
      if (!dialog) return false;
      const bodies = Array.from(dialog.querySelectorAll('textarea')).map((node) => String(node.value)).join('\\n');
      return bodies.includes(${jsString(sensitivePromptMarker)})
        && !dialog.querySelector('[data-action="save"]')
        && Array.from(dialog.querySelectorAll('input, textarea')).every((node) => node.disabled || node.readOnly);
    })()`,
    'template-read-only detail must show body read-only without save',
  )
  assertEqual(
    promptRouteCalls().filter(({ method }) => method !== 'GET').length,
    0,
    'template-read-only mutation request count',
  )
  await closeVisibleDialog(client, '.prompt-editor-dialog')

  const permissionScenarios = [
    {
      key: 'templateUpdate',
      prepare: () => seedActivePromptWithDraft(state.prompt),
      allowed: ['view', 'edit', 'abandon'],
    },
    {
      key: 'templateTest',
      prepare: () => {},
      allowed: ['view', 'test'],
    },
    {
      key: 'templatePublish',
      prompt: { draftTestStatus: 'success' },
      prepare: () => {},
      allowed: ['view', 'publish'],
    },
    {
      key: 'templateRestore',
      prepare: () => seedPromptRestoreHistory(state.prompt),
      allowed: ['view', 'restore'],
    },
  ]
  for (const scenario of permissionScenarios) {
    logStep(`验证 Prompt action 权限隔离: ${scenario.key}`)
    resetMockState({ prompt: scenario.prompt })
    scenario.prepare()
    await setBrowserSession(client, createSession({
      profilePage: true,
      actions: [actionPermissions.templateRead, actionPermissions[scenario.key]],
    }))
    await navigate(client, '/system/ai-profile-import')
    await waitForSelector(client, '.prompt-version-table')
    await waitForNetworkIdle(client)
    const surface = await promptPermissionSurface(client)
    assertOnlyPromptActions(surface, scenario.allowed, `${scenario.key} with template-read`)
  }

  logStep('验证 template-update 在无开放草稿时只暴露 create 命令')
  resetMockState()
  seedActivePromptWithDraft(state.prompt)
  const updateTemplate = promptTemplate(state.prompt, 'full_profile')
  const updateDraft = promptVersionRecord(state.prompt, updateTemplate.draftVersionId)
  updateDraft.summary.lifecycleStatus = 'abandoned'
  updateDraft.detail.lifecycleStatus = 'abandoned'
  Object.assign(updateTemplate, {
    draftVersionId: null,
    draftVersionNo: null,
    draftVersionLabel: null,
    draftTestStatus: null,
  })
  await setBrowserSession(client, createSession({
    profilePage: true,
    actions: [actionPermissions.templateRead, actionPermissions.templateUpdate],
  }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.prompt-version-table')
  assertOnlyPromptActions(await promptPermissionSurface(client), ['view', 'create'], 'template-update create surface')

  for (const key of ['templateUpdate', 'templateTest', 'templatePublish', 'templateRestore']) {
    logStep(`验证 ${key} 不隐含 template-read`)
    resetMockState()
    await setBrowserSession(client, createSession({
      profilePage: true,
      actions: [actionPermissions[key]],
    }))
    await navigate(client, '/system/ai-profile-import')
    await waitForText(client, '访问密钥')
    await waitForNetworkIdle(client)
    assertEqual(promptRouteCalls().length, 0, `${key} action-only Prompt API calls`)
    const surface = await promptPermissionSurface(client)
    assertOnlyPromptActions(surface, [], `${key} action-only surface`)
  }

  logStep('验证 audit-only 与无 template-read 的正文零暴露')
  resetMockState()
  const noReadActions = Object.values(actionPermissions).filter((permission) => permission !== actionPermissions.templateRead)
  await setBrowserSession(client, createSession({ profilePage: true, actions: noReadActions }))
  await navigate(client, '/system/ai-profile-import')
  await waitForText(client, 'PROMPT_AUDIT_VISIBLE_ONLY')
  await waitForSelector(client, '.prompt-template-audit-table')
  await waitForNetworkIdle(client)
  const promptCalls = promptRouteCalls()
  const rootListCalls = promptCalls.filter(({ method, pathname }) => method === 'GET' && pathname === promptRoot)
  const versionListCalls = promptCalls.filter(({ method, pathname }) =>
    method === 'GET' && new RegExp(`^${promptRoot}/(full_profile|works_only)/versions$`).test(pathname))
  const versionDetailCalls = promptCalls.filter(({ method, pathname }) =>
    method === 'GET' && new RegExp(`^${promptRoot}/versions/\\d+$`).test(pathname))
  assertEqual(rootListCalls.length, 0, 'template root-list requests without template-read')
  assertEqual(versionListCalls.length, 0, 'version-list requests without template-read')
  assertEqual(versionDetailCalls.length, 0, 'version-detail requests without template-read')
  assertEqual(
    JSON.stringify(promptCalls.map(({ method, pathname }) => [method, pathname])),
    JSON.stringify([['GET', `${promptRoot}/audits`]]),
    'only Prompt audit may be requested without template-read',
  )
  state.sentResponsePayloads.forEach((payload, index) =>
    rejectPromptBodyRecursively(payload, `$responses[${index}]`))
  const exposure = await evaluate(
    client,
    `(() => {
      const markers = [${jsString(sensitivePromptMarker)}, ${jsString(serverPromptMarker)}];
      const values = Array.from(document.querySelectorAll('input, textarea')).map((node) => String(node.value));
      const storage = JSON.stringify({
        local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
        session: Object.fromEntries(Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key)])),
      });
      return {
        dom: markers.some((marker) => document.documentElement.innerHTML.includes(marker) || document.body.innerText.includes(marker)),
        form: values.some((value) => markers.some((marker) => value.includes(marker))),
        storage: markers.some((marker) => storage.includes(marker)),
        auditIds: document.querySelector('.prompt-template-audit-table')?.innerText || '',
      };
    })()`,
  )
  assertEqual(exposure.dom, false, 'Prompt body in DOM without template-read')
  assertEqual(exposure.form, false, 'Prompt body in form values without template-read')
  assertEqual(exposure.storage, false, 'Prompt body in browser storage without template-read')
  assertEqual(exposure.auditIds.includes('11'), true, 'audit-only templateId visibility')
  assertEqual(exposure.auditIds.includes('101'), true, 'audit-only promptVersionId visibility')
  console.log('Prompt body no-read scan: PASS (responses/DOM/forms/storage clean)')
}

async function assertPromptRetryEmptyAndStaleDetail(client) {
  logStep('验证 Prompt 模板根列表失败可在 Panel 内重试且不刷新页面')
  resetMockState({ prompt: { templateListFailuresRemaining: 1 } })
  await setBrowserSession(client, createSession({
    profilePage: true,
    actions: Object.values(actionPermissions),
  }))
  await navigate(client, '/system/ai-profile-import')
  await waitForText(client, '模板加载失败')
  await waitForSelector(client, '.prompt-template-error .prompt-template-retry')
  assertEqual(routeCalls('GET', promptRoot).length, 1, 'initial failed template root request')
  await evaluate(client, `window.__promptRetryPageIdentity = ${jsString(randomUUID())}`)
  const pageIdentity = await evaluate(client, `window.__promptRetryPageIdentity`)
  await clickSelector(client, '.prompt-template-retry', 'Prompt template retry')
  await waitForText(client, '完整资料识别')
  await waitForSelector(client, '.prompt-version-table')
  assertEqual(routeCalls('GET', promptRoot).length, 2, 'retried template root request count')
  assertEqual(await evaluate(client, `window.__promptRetryPageIdentity`), pageIdentity, 'retry must not reload page')
  await assertBrowser(
    client,
    `(() => {
      const labels = Array.from(document.querySelectorAll('.prompt-scene-tabs .el-tabs__item')).map((node) => node.innerText.trim());
      return JSON.stringify(labels) === JSON.stringify(['完整资料', '仅作品']);
    })()`,
    'Prompt scene tabs must render exactly the two governed scenes',
  )

  logStep('验证空版本列表保留场景摘要且不触发详情或写请求')
  resetMockState({ prompt: { emptyVersionTemplateCode: 'works_only' } })
  await setBrowserSession(client, createSession({
    profilePage: true,
    actions: Object.values(actionPermissions),
  }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.prompt-version-table')
  await clickSceneTab(client, '仅作品')
  await waitFor(
    () => routeCalls('GET', `${promptRoot}/works_only/versions`).length === 1,
    'works_only empty version request',
  )
  await waitForText(client, '暂无版本')
  await assertBrowser(
    client,
    `(() => {
      const panel = document.querySelector('.profile-import-prompt-panel');
      return Boolean(panel?.innerText.includes('仅作品识别'))
        && Boolean(panel?.innerText.includes('开放草稿'))
        && Boolean(panel?.querySelector('.prompt-version-table .el-table__empty-text'));
    })()`,
    'empty works_only list must retain usable summary and explicit empty state',
  )
  assertEqual(
    state.requests.filter(({ pathname }) => /^\/admin\/ai\/profile-import\/prompt-templates\/versions\/2\d+$/.test(pathname)).length,
    0,
    'works_only empty list detail requests',
  )
  assertEqual(promptRouteCalls().filter(({ method }) => method !== 'GET').length, 0, 'empty version mutation requests')
  await clickSceneTab(client, '完整资料')
  await waitForText(client, 'bootstrap-v1')

  logStep('验证详情响应跨 scene 返回时被序列门禁丢弃')
  resetMockState()
  await setBrowserSession(client, createSession({
    profilePage: true,
    actions: [actionPermissions.templateRead],
  }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '[data-action="view"]')
  const blockedDetail = createBlockedMutation('GET', `${promptRoot}/versions/101`)
  state.prompt.blockedMutation = blockedDetail
  try {
    await clickPromptAction(client, 'view')
    await waitFor(() => blockedDetail.requestCount === 1, 'blocked Prompt detail request')
    await clickSceneTab(client, '仅作品')
    await waitFor(() => routeCalls('GET', `${promptRoot}/works_only/versions`).length === 1, 'works_only list during stale detail')
    blockedDetail.release()
    await waitFor(
      () => state.sentResponseRecords.some(({ method, pathname }) => method === 'GET' && pathname === `${promptRoot}/versions/101`),
      'released stale detail response',
    )
    await waitForNetworkIdle(client)
    await assertBrowser(
      client,
      `(() => {
        const activeTab = document.querySelector('.prompt-scene-tabs .el-tabs__item.is-active');
        return activeTab?.innerText.trim() === '仅作品'
          && !document.querySelector('.prompt-editor-dialog')
          && !document.body.innerText.includes(${jsString(sensitivePromptMarker)});
      })()`,
      'stale full_profile detail must not open after switching to works_only',
    )
  } finally {
    blockedDetail.release()
    state.prompt.blockedMutation = null
  }
}

async function assertSecretIsAbsentFromBrowser(client) {
  const exposure = await evaluate(
    client,
    `(() => {
      const secret = ${jsString(testSecret)};
      const storage = JSON.stringify({
        local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
        session: Object.fromEntries(Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key)])),
      });
      return {
        body: document.body.innerHTML.includes(secret) || document.body.innerText.includes(secret),
        formValues: Array.from(document.querySelectorAll('input, textarea')).some((node) => String(node.value).includes(secret)),
        storage: storage.includes(secret),
        passwordValue: document.querySelector('input[type="password"]')?.value || '',
      };
    })()`,
  )
  assertEqual(exposure.body, false, 'secret exposure in document.body')
  assertEqual(exposure.formValues, false, 'secret exposure in form values after save')
  assertEqual(exposure.storage, false, 'secret exposure in browser storage')
  assertEqual(exposure.passwordValue, '', 'password input cleanup')
  assertEqual(JSON.stringify(state.audits).includes(testSecret), false, 'secret exposure in serialized audit fixture')
}

async function assertLifecycle(client) {
  logStep('验证公共配置变化会清除测试结果并自动停用')
  resetMockState()
  await setBrowserSession(client, createSession({ profilePage: true, actions: Object.values(actionPermissions) }))
  await navigate(client, '/system/ai-profile-import')
  await waitForText(client, '固定 probe 已通过')
  await setInputByFormLabel(client, '接口地址', 'https://api.deepseek.com/v1/chat/completions')
  await clickText(client, '保存配置')
  await waitForMessage(client, 'success', '配置已保存')
  await waitForText(client, '未测试')
  assertEqual(state.config.enabled, false, 'public config change must disable config')
  assertEqual(state.config.lastTestStatus, null, 'public config change must reset test status')
  await assertBrowser(client, `!document.querySelector('.status-actions .el-switch')?.classList.contains('is-checked')`, '公共配置变化后启用开关仍为开启')

  logStep('验证密钥单向更新、脱敏回显与内存清理')
  await setSecretInput(client, testSecret)
  await clickText(client, '更新密钥')
  await waitForMessage(client, 'success', '密钥已更新')
  await waitForText(client, 'ds-e2****MASKED')
  assertEqual(state.config.enabled, false, 'secret change must disable config')
  assertEqual(state.config.lastTestStatus, null, 'secret change must reset test status')
  await assertSecretIsAbsentFromBrowser(client)

  logStep('验证 HTTP 200 但业务测试失败必须显示 error toast')
  await clickText(client, '测试连接')
  await waitForMessage(client, 'error', '连接失败')
  await waitForText(client, '固定 probe 未返回约束 JSON')
  assertEqual(state.config.lastTestStatus, 'failed', 'failed fixed probe status')
  assertEqual(state.config.enabled, false, 'failed fixed probe must remain disabled')
  await assertBrowser(client, `!document.querySelector('.status-actions .el-switch')?.classList.contains('is-checked')`, '失败测试后启用开关仍为开启')
  await screenshot(client, '04-http-200-business-test-failed.png')
  await waitForMessagesGone(client)

  logStep('验证 failed probe 后主动启用会被 readiness guard 拒绝')
  const rejectedEnableCallsBefore = state.requests.filter((request) => request.pathname.endsWith('/enabled')).length
  await evaluate(client, `document.querySelector('.status-actions .el-switch')?.click()`)
  await waitForMessage(client, 'error', '状态更新失败')
  await waitFor(
    () => state.requests.filter((request) => request.pathname.endsWith('/enabled')).length > rejectedEnableCallsBefore,
    'rejected enabled API request',
  )
  assertEqual(state.config.enabled, false, 'failed fixed probe must reject enable request')
  assertEqual(state.config.available, false, 'failed fixed probe must remain unavailable')
  await assertBrowser(client, `!document.querySelector('.status-actions .el-switch')?.classList.contains('is-checked')`, 'readiness guard 拒绝后开关仍为开启')
  await waitForMessagesGone(client)

  logStep('验证固定 probe 成功后才能启用')
  await clickText(client, '测试连接')
  await waitForMessage(client, 'success', '连接成功')
  await waitForText(client, '固定 probe 已通过')
  assertEqual(publicConfigComplete(), true, 'public config completeness before enable')
  assertEqual(state.secretConfigured, true, 'secret presence before enable')
  assertEqual(state.config.lastTestStatus, 'success', 'fixed probe status before enable')
  const enabledCallsBefore = state.requests.filter((request) => request.pathname.endsWith('/enabled')).length
  await evaluate(client, `document.querySelector('.status-actions .el-switch')?.click()`)
  await waitForMessage(client, 'success', '已启用')
  await waitFor(
    () => state.requests.filter((request) => request.pathname.endsWith('/enabled')).length > enabledCallsBefore,
    'enabled API request',
  )
  await waitForText(client, '服务可用')
  assertEqual(state.config.enabled, true, 'successful fixed probe permits enable')
  assertEqual(state.config.available, true, 'enabled complete config becomes available')
  await assertBrowser(client, `document.querySelector('.status-actions .el-switch')?.classList.contains('is-checked')`, '成功启用后开关未更新')
  await assertSecretIsAbsentFromBrowser(client)
  await screenshot(client, '05-successful-test-and-enabled.png')
}

async function scanEvidenceForSecret() {
  const entries = await fs.readdir(screenshotDir, { withFileTypes: true })
  const secretBytes = Buffer.from(testSecret, 'utf8')
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }
    const content = await fs.readFile(path.join(screenshotDir, entry.name))
    if (content.includes(secretBytes)) {
      throw new Error(`明文 secret 出现在 E2E 证据文件: ${entry.name}`)
    }
  }
}

async function prepareEvidenceDir() {
  await fs.mkdir(screenshotDir, { recursive: true })
  const entries = await fs.readdir(screenshotDir, { withFileTypes: true })
  await Promise.all(
    entries.filter((entry) => entry.isFile()).map((entry) => fs.rm(path.join(screenshotDir, entry.name), { force: true })),
  )
}

function assertDiagnosticsHealthy(diagnostics) {
  const groups = [
    ['console errors', diagnostics.consoleErrors],
    ['console warnings', diagnostics.consoleWarnings],
    ['page errors', diagnostics.pageErrors],
    ['failed network requests', diagnostics.failedRequests],
    ['HTTP errors', diagnostics.httpErrors],
    ['unhandled mock requests', state.unhandledRequests],
  ]
  const failures = groups.filter(([, entries]) => entries.length)
  if (failures.length) {
    throw new Error(failures.map(([label, entries]) => `${label}:\n${entries.join('\n')}`).join('\n\n'))
  }
}

async function promptActionDisabled(client, action) {
  return evaluate(
    client,
    `(() => {
      const node = document.querySelector('.profile-import-prompt-panel [data-action="${action}"]');
      if (!node) return null;
      return Boolean(node.disabled || node.classList.contains('is-disabled') || node.getAttribute('aria-disabled') === 'true');
    })()`,
  )
}

async function waitForEditorClosed(client) {
  await waitFor(
    () => evaluate(client, `!document.querySelector('.prompt-editor-dialog')`),
    'prompt editor dialog to close',
  )
}

async function assertPromptGovernanceLifecycle(client) {
  logStep('验证 Prompt 完整治理生命周期：编辑/冲突/试运行/发布/新建/放弃/恢复/审计')
  resetMockState()
  await setBrowserSession(client, createSession({ profilePage: true, actions: Object.values(actionPermissions) }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.prompt-version-table')
  await waitForNetworkIdle(client)

  logStep('bootstrap 草稿在首次发布前必须隐藏放弃动作且发布禁用')
  const bootstrapSurface = await promptPermissionSurface(client)
  assertOnlyPromptActions(bootstrapSurface, ['edit', 'test', 'publish'], 'bootstrap draft before first publish')
  assertEqual(await promptActionDisabled(client, 'publish'), true, 'bootstrap publish disabled before fixture test')

  resetMockState()
  seedActivePromptWithDraft(state.prompt)
  await setBrowserSession(client, createSession({ profilePage: true, actions: Object.values(actionPermissions) }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.prompt-version-table')
  await waitForText(client, '完整资料识别')
  await waitForNetworkIdle(client)

  logStep('编辑草稿并保存必须保留当前发布指针')
  await clickPromptAction(client, 'edit')
  await waitForSelector(client, '.prompt-editor-dialog [data-action="save"]')
  await waitFor(
    () => promptEditorValues(client).then((values) => Boolean(values.systemPromptBody?.includes(sensitivePromptMarker))),
    'editor loads draft system prompt body from detail',
  )
  await setPromptEditorField(client, '版本标签', 'draft-v2-edited')
  await setPromptEditorField(client, 'System Prompt', 'E2E lifecycle system body 1')
  await setPromptEditorField(client, 'Repair Prompt', 'E2E lifecycle repair body 1')
  await setPromptEditorField(client, '变更摘要', 'lifecycle edit 1')
  await clickSelector(client, '.prompt-editor-dialog [data-action="save"]', 'save draft')
  await waitForMessage(client, 'success', 'Prompt 草稿已保存')
  await waitForEditorClosed(client)
  await waitForText(client, 'draft-v2-edited')
  assertEqual(promptTemplate(state.prompt, 'full_profile').activeVersionId, 100, 'edit save preserves active pointer')
  await assertBrowser(
    client,
    `document.querySelector('.profile-import-prompt-panel').innerText.includes('released-v1')`,
    '编辑保存后当前版本指针必须仍为 released-v1',
  )
  await waitForMessagesGone(client)

  logStep('保存遇到版本冲突时必须保留本地编辑并展示服务端对照')
  await clickPromptAction(client, 'edit')
  await waitForSelector(client, '.prompt-editor-dialog [data-action="save"]')
  await setPromptEditorField(client, '版本标签', 'draft-v2-conflict')
  await setPromptEditorField(client, 'System Prompt', 'E2E conflict local body')
  state.prompt.conflictNextSave = true
  await clickSelector(client, '.prompt-editor-dialog [data-action="save"]', 'save draft (conflict)')
  await waitForSelector(client, '.prompt-conflict-snapshot [data-action="adopt-server-version"]')
  await assertBrowser(
    client,
    `(() => {
      const dialog = document.querySelector('.prompt-editor-dialog');
      const snapshot = dialog?.querySelector('.prompt-conflict-snapshot');
      if (!dialog || !snapshot) return false;
      const bodies = Array.from(snapshot.querySelectorAll('textarea')).map((node) => node.value).join('\\n');
      return bodies.includes(${jsString(serverPromptMarker)}) && Boolean(dialog.querySelector('.prompt-editor-error'));
    })()`,
    '冲突时编辑器必须保留打开状态并展示服务端版本对照',
  )
  const retained = await promptEditorValues(client)
  assertEqual(retained.versionLabel, 'draft-v2-conflict', 'conflict retains local versionLabel edit')
  assertEqual(retained.systemPromptBody, 'E2E conflict local body', 'conflict retains local system prompt edit')
  await clickSelector(client, '.prompt-conflict-snapshot [data-action="adopt-server-version"]', 'adopt server version')
  await clickSelector(client, '.prompt-editor-dialog [data-action="save"]', 'save draft after adopt')
  await waitForMessage(client, 'success', 'Prompt 草稿已保存')
  await waitForEditorClosed(client)
  assertEqual(promptTemplate(state.prompt, 'full_profile').activeVersionId, 100, 'conflict resolve preserves active pointer')
  await waitForMessagesGone(client)

  logStep('未通过试运行时发布必须禁用，失败试运行保留草稿')
  assertEqual(await promptActionDisabled(client, 'publish'), true, 'publish disabled before successful test')
  await clickPromptAction(client, 'test')
  await waitForText(client, 'PROFILE_IMPORT_PROMPT_FIXTURE_FAILED')
  assertEqual(await promptActionDisabled(client, 'publish'), true, 'publish stays disabled after failed test')
  await assertBrowser(
    client,
    `Boolean(document.querySelector('.profile-import-prompt-panel [data-action="edit"]'))`,
    '失败试运行后草稿必须仍可编辑',
  )

  logStep('成功试运行后发布按钮解锁并展示绑定')
  await clickPromptAction(client, 'test')
  await waitForMessage(client, 'success', '固定样例试运行通过')
  await waitFor(() => promptActionDisabled(client, 'publish').then((value) => value === false), 'publish enabled after success test')
  await assertBrowser(
    client,
    `(() => {
      const binding = document.querySelector('.prompt-test-binding');
      return Boolean(binding) && binding.innerText.includes('通过') && /[0-9a-f]{64}/i.test(binding.innerText);
    })()`,
    '成功试运行后必须展示带 runtime SHA 的绑定',
  )
  await waitForMessagesGone(client)
  await screenshot(client, '06-prompt-test-success-publish-ready.png')

  logStep('发布必须迁移当前指针并清空开放草稿')
  await clickPromptAction(client, 'publish')
  await selectAuditReason(client, '质量调整')
  await confirmAuditDialog(client)
  await waitForMessage(client, 'success', 'Prompt 版本已发布')
  await waitForText(client, '无开放草稿')
  assertEqual(promptTemplate(state.prompt, 'full_profile').activeVersionId, 101, 'publish moves active pointer to draft')
  assertEqual(promptTemplate(state.prompt, 'full_profile').draftVersionId, null, 'publish clears open draft')
  await waitForMessagesGone(client)

  logStep('从已发布版本新建草稿')
  await clickPromptAction(client, 'create')
  await waitForMessage(client, 'success', 'Prompt 草稿已创建')
  await waitForNetworkIdle(client)
  assertEqual(Number(promptTemplate(state.prompt, 'full_profile').draftVersionNo), 3, 'create seeds a fresh draft version')
  await waitForMessagesGone(client)

  logStep('有当前发布版本时放弃草稿保留发布指针')
  await clickPromptAction(client, 'abandon')
  await selectAuditReason(client, '草稿内容无效')
  await confirmAuditDialog(client)
  await waitForMessage(client, 'success', 'Prompt 草稿已放弃')
  await waitForText(client, '无开放草稿')
  assertEqual(promptTemplate(state.prompt, 'full_profile').activeVersionId, 101, 'abandon keeps active pointer')
  assertEqual(promptTemplate(state.prompt, 'full_profile').draftVersionId, null, 'abandon clears the draft pointer')
  await waitForMessagesGone(client)

  logStep('恢复历史版本必须保留开放草稿')
  await clickPromptAction(client, 'create')
  await waitForMessage(client, 'success', 'Prompt 草稿已创建')
  await waitForNetworkIdle(client)
  const draftBeforeRestore = promptTemplate(state.prompt, 'full_profile').draftVersionId
  await clickPromptAction(client, 'restore')
  await waitForSelector(client, '.audit-confirm-dialog')
  await assertBrowser(
    client,
    `document.querySelector('.audit-confirm-dialog').innerText.includes('仍保留')`,
    '恢复确认必须提示开放草稿仍保留',
  )
  await selectAuditReason(client, '质量回退')
  await confirmAuditDialog(client)
  await waitForMessage(client, 'success', '历史 Prompt 版本已恢复')
  await waitForNetworkIdle(client)
  assertEqual(promptTemplate(state.prompt, 'full_profile').activeVersionId, 100, 'restore moves active pointer to history')
  assertEqual(promptTemplate(state.prompt, 'full_profile').draftVersionId, draftBeforeRestore, 'restore keeps the open draft')
  await waitForMessagesGone(client)

  logStep('Prompt 模板审计可独立刷新且不重载模板/版本')
  const auditsBefore = routeCalls('GET', `${promptRoot}/audits`).length
  const rootBefore = routeCalls('GET', promptRoot).length
  await clickSelector(client, '.profile-import-prompt-panel [data-action="refresh-prompt-audit"]', 'prompt audit refresh')
  await waitFor(
    () => routeCalls('GET', `${promptRoot}/audits`).length === auditsBefore + 1,
    'independent prompt audit refresh request',
  )
  await waitForNetworkIdle(client)
  assertEqual(routeCalls('GET', promptRoot).length, rootBefore, 'audit refresh must not reload templates')
  await assertBrowser(
    client,
    `(() => {
      const table = document.querySelector('.prompt-template-audit-table');
      return Boolean(table) && table.innerText.includes('restore') && table.innerText.includes('QUALITY_REGRESSION');
    })()`,
    'Prompt 审计表必须反映最新治理动作与固定原因',
  )
  await screenshot(client, '07-prompt-governance-lifecycle.png')
}

async function assertPromptDoubleSubmitLock(client) {
  logStep('验证 Prompt 发布高频双击只发出单次写请求并锁定按钮')
  resetMockState({ prompt: { draftTestStatus: 'success' } })
  await setBrowserSession(client, createSession({ profilePage: true, actions: Object.values(actionPermissions) }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.prompt-version-table')
  await waitForNetworkIdle(client)

  const publishPath = `${promptRoot}/versions/101/publish`
  const blocked = createBlockedMutation('POST', publishPath)
  state.prompt.blockedMutation = blocked
  try {
    await clickPromptAction(client, 'publish')
    await selectAuditReason(client, '首次发布')
    await evaluate(
      client,
      `(() => {
        const button = document.querySelector('.audit-confirm-dialog .el-button--primary');
        if (!button) throw new Error('缺少发布确认按钮');
        button.click();
        button.click();
        return true;
      })()`,
    )
    await waitFor(() => blocked.requestCount === 1, 'single blocked publish request')
    await assertBrowser(
      client,
      `Boolean(document.querySelector('.audit-confirm-dialog .el-button--primary')?.classList.contains('is-loading'))`,
      '双击期间发布确认按钮必须进入 loading 锁定',
    )
    assertEqual(routeCalls('POST', publishPath).length, 1, 'rapid double-click issues exactly one publish request')
    blocked.release()
    await waitForMessage(client, 'success', 'Prompt 版本已发布')
    await waitForNetworkIdle(client)
    assertEqual(routeCalls('POST', publishPath).length, 1, 'no duplicate publish request after release')
    assertEqual(promptTemplate(state.prompt, 'full_profile').activeVersionId, 101, 'double-submit guard still publishes once')
  } finally {
    blocked.release()
    state.prompt.blockedMutation = null
  }
  await waitForMessagesGone(client)
}

async function assertPromptResponsiveLayout(client) {
  logStep('验证 Prompt 面板在 390px 视口下的响应式收敛与横向滚动隔离')
  resetMockState()
  seedActivePromptWithDraft(state.prompt)
  await setBrowserSession(client, createSession({ profilePage: true, actions: Object.values(actionPermissions) }))
  await navigate(client, '/system/ai-profile-import')
  await waitForSelector(client, '.prompt-version-table')
  await waitForNetworkIdle(client)
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await waitForNetworkIdle(client)
  const geometry = await evaluate(
    client,
    `(() => {
      const panel = document.querySelector('.profile-import-prompt-panel');
      const scroll = panel?.querySelector('.prompt-table-scroll');
      const grid = panel?.querySelector('.prompt-summary-grid');
      const gridColumns = grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length : 0;
      return {
        innerWidth: window.innerWidth,
        panelWidth: panel ? Math.ceil(panel.getBoundingClientRect().width) : 0,
        scrollOverflowX: scroll ? getComputedStyle(scroll).overflowX : '',
        scrollClientWidth: scroll ? scroll.clientWidth : 0,
        scrollContentWidth: scroll ? scroll.scrollWidth : 0,
        gridColumns,
      };
    })()`,
  )
  assertEqual(geometry.innerWidth, 390, '390px viewport override applied')
  assertEqual(geometry.gridColumns, 1, 'summary grid collapses to a single column at 390px')
  assertEqual(geometry.scrollOverflowX, 'auto', 'wide prompt table is wrapped in a horizontal scroll container')
  await assertBrowser(
    client,
    `${geometry.scrollContentWidth} > ${geometry.scrollClientWidth}`,
    '宽表格必须由内部滚动容器吸收横向溢出',
  )
  await assertBrowser(
    client,
    `${geometry.panelWidth} <= ${geometry.innerWidth} + 1`,
    'Prompt 面板在 390px 下不得超出视口宽度',
  )
  await screenshot(client, '08-prompt-responsive-390.png')
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await waitForNetworkIdle(client)
}

function assertAssetOrigin(diagnostics) {
  const pathnames = diagnostics.assetUrls.map((url) => {
    try {
      return new URL(url).pathname
    } catch {
      return String(url)
    }
  })
  if (distMode) {
    const bundled = pathnames.filter((pathname) => pathname.startsWith('/assets/'))
    const sourceModules = pathnames.filter(
      (pathname) => pathname.startsWith('/src/') || pathname.startsWith('/node_modules/') || pathname.includes('/.vite/'),
    )
    if (!bundled.length) {
      throw new Error('dist asset-origin: expected bundled /assets/* Script or Stylesheet responses')
    }
    if (sourceModules.length) {
      throw new Error(`dist asset-origin: unexpected source-module responses: ${sourceModules.join(', ')}`)
    }
    logStep(`asset-origin PASS: mode=dist bundled=${bundled.length} source-modules=0`)
  } else {
    logStep(`asset-origin PASS: mode=development observed=${pathnames.length} (dev server, bundling not asserted)`)
  }
}

async function main() {
  await prepareEvidenceDir()
  logStep(`E2E 证据目录: ${screenshotDir}`)
  logStep(distMode ? `mode=dist distDir=${distDir}` : 'mode=development')
  let devServer = null
  let browser = null
  let client = null

  try {
    devServer = await startFrontendServer()
    browser = await launchBrowser()
    client = new CdpClient(browser.wsUrl)
    await client.connect()
    const diagnostics = await setupBrowserPage(client)

    await assertFormalEntryAndPageGuard(client)
    await assertActionPermissions(client)
    await assertLifecycle(client)
    await assertPromptGovernanceLifecycle(client)
    await assertPromptDoubleSubmitLock(client)
    await assertPromptResponsiveLayout(client)
    await assertPromptPermissionsAndNoReadLeakage(client)
    await assertPromptRetryEmptyAndStaleDetail(client)
    if (!distMode) {
      await runAuditDialogHarnesses(client)
      resetMockState()
      await setBrowserSession(
        client,
        createSession({ profilePage: true, actions: Object.values(actionPermissions) }),
      )
      await navigate(client, '/system/ai-profile-import')
      await waitForSelector(client, '.prompt-version-table')
      await runApiBusinessErrorHarness(client)
    }
    assertAssetOrigin(diagnostics)
    await Promise.all([...diagnostics.pendingMocks])
    assertDiagnosticsHealthy(diagnostics)
    await scanEvidenceForSecret()

    console.log(`DeepSeek profile import browser E2E passed. Screenshots: ${screenshotDir}`)
    console.log('Console/page/network health: PASS (0 errors, 0 warnings, 0 failed requests)')
    console.log('Plaintext secret scan: PASS (DOM/storage/audit/evidence clean)')
  } finally {
    await client?.close()
    await browser?.close()
    await killProcessTree(devServer?.pid)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
