import { spawn } from 'node:child_process'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..')

const baseUrl = process.env.E2E_ADMIN_BASE_URL || 'http://127.0.0.1:5100'
const screenshotDir = path.resolve(
  process.env.E2E_SCREENSHOT_DIR || path.join(repoRoot, 'output', 'ai-image-providers-e2e'),
)
const headless = process.env.E2E_HEADLESS !== 'false'
const viewport = { width: 1440, height: 1000 }

function logStep(message) {
  const line = `[e2e] ${new Date().toISOString()} ${message}`
  console.log(line)
  try {
    fsSync.mkdirSync(screenshotDir, { recursive: true })
    fsSync.appendFileSync(path.join(screenshotDir, 'e2e.log'), `${line}\n`, 'utf8')
  } catch {
    // console output is still enough when log file writing is unavailable
  }
}

const session = {
  adminUserId: 9001,
  account: 'e2e-admin',
  userName: 'E2E 管理员',
  roleCodes: ['super_admin'],
  menuPermissions: ['menu.dashboard', 'menu.users', 'menu.content', 'menu.system'],
  pagePermissions: [
    'page.dashboard.index',
    'page.users.index',
    'page.content.templates',
    'page.content.share-cards',
    'page.system.ai-image-providers',
    'page.system.settings',
  ],
  actionPermissions: [
    '*',
    'action.system.ai-image-provider.update',
    'action.system.ai-image-provider.secret.update',
    'action.system.ai-image-provider.secret.view',
    'action.system.ai-image-provider.activate',
    'action.system.ai-image-provider.test',
  ],
}

function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function createProvider(overrides) {
  return {
    configId: 0,
    providerCode: '',
    displayName: '',
    enabled: true,
    active: false,
    priority: 100,
    publicConfig: {},
    secretConfigured: false,
    secretMask: {},
    secretUpdatedBy: null,
    secretUpdatedByName: null,
    secretUpdatedAt: null,
    lastTestStatus: null,
    lastTestMessage: null,
    lastTestAt: null,
    requiredSecretFields: [],
    requiredPublicFields: [],
    missingPublicFields: [],
    missingSecretFields: [],
    activationReady: false,
    createTime: '2026-05-16 09:00:00',
    lastUpdate: '2026-05-16 09:00:00',
    ...overrides,
  }
}

const state = {
  providers: [
    createProvider({
      configId: 1,
      providerCode: 'kplyyk',
      displayName: '开拍默认生图',
      active: true,
      priority: 1,
      publicConfig: {
        endpoint: 'http://kplyyk.com/v0/management/image-generation/test',
        model: 'gpt-image-2',
        size: '2160x3840',
        count: 1,
        authHeader: 'Authorization',
        connectTimeoutMs: 10000,
        readTimeoutMs: 120000,
        pollIntervalMs: 1500,
        maxPollAttempts: 400,
      },
      secretConfigured: true,
      secretMask: { authToken: 'kp****oken' },
      requiredSecretFields: ['authToken'],
      requiredPublicFields: ['endpoint', 'model', 'size'],
      activationReady: true,
    }),
    createProvider({
      configId: 2,
      providerCode: 'aliyun-qwen-image',
      displayName: '阿里云 Qwen Image',
      enabled: true,
      priority: 10,
      publicConfig: {
        endpoint: '',
        region: 'cn-beijing',
        model: '',
        size: '',
        responseFormat: 'url',
        count: 1,
        connectTimeoutMs: 10000,
        readTimeoutMs: 120000,
        pollIntervalMs: 1500,
        maxPollAttempts: 80,
      },
      requiredSecretFields: ['apiKey'],
      requiredPublicFields: ['endpoint', 'model', 'size'],
      missingPublicFields: ['endpoint', 'model', 'size'],
      missingSecretFields: ['apiKey'],
    }),
    createProvider({
      configId: 3,
      providerCode: 'tencent-hunyuan',
      displayName: '腾讯混元生图',
      enabled: true,
      priority: 20,
      publicConfig: {
        endpoint: 'https://hunyuan.tencentcloudapi.com',
        region: 'ap-guangzhou',
        model: 'hunyuan-image',
        modelVersion: '2023-09-01',
        resolution: '720:1280',
        size: '720:1280',
        count: 1,
        connectTimeoutMs: 10000,
        readTimeoutMs: 120000,
      },
      requiredSecretFields: ['secretId', 'secretKey'],
      requiredPublicFields: ['endpoint', 'region', 'model'],
      missingSecretFields: ['secretId', 'secretKey'],
    }),
    createProvider({
      configId: 4,
      providerCode: 'volc-seedream',
      displayName: '火山豆包 Seedream',
      enabled: false,
      priority: 30,
      publicConfig: {
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        region: 'cn-beijing',
        model: 'doubao-seedream-4.0',
        size: '2160x3840',
        responseFormat: 'url',
        count: 1,
      },
      requiredSecretFields: ['apiKey'],
      requiredPublicFields: ['endpoint', 'model', 'size'],
      missingSecretFields: ['apiKey'],
    }),
  ],
  secrets: {
    kplyyk: { authToken: 'kp-e2e-token' },
  },
}

function requiredSecretFields(provider) {
  const defaults = {
    kplyyk: ['authToken'],
    http: ['authToken'],
    openai: ['apiKey'],
    'volc-seedream': ['apiKey'],
    'aliyun-qwen-image': ['apiKey'],
    'aliyun-wanxiang': ['apiKey'],
    'tencent-hunyuan': ['secretId', 'secretKey'],
    'baidu-qianfan': ['apiKey'],
  }
  return Array.from(new Set([...(provider.requiredSecretFields || []), ...(defaults[provider.providerCode] || [])]))
}

function refreshProviderReadiness(provider) {
  provider.missingPublicFields = (provider.requiredPublicFields || []).filter((field) => {
    const value = provider.publicConfig?.[field]
    return value === undefined || value === null || String(value).trim() === ''
  })
  provider.missingSecretFields = requiredSecretFields(provider).filter((field) => !state.secrets[provider.providerCode]?.[field])
  provider.secretConfigured = provider.missingSecretFields.length === 0
  provider.activationReady = provider.missingPublicFields.length === 0 && provider.missingSecretFields.length === 0
  return provider
}

function providerByCode(providerCode) {
  const provider = state.providers.find((item) => item.providerCode === providerCode)
  if (!provider) {
    throw new Error(`Unknown provider: ${providerCode}`)
  }
  return provider
}

function apiOk(data) {
  return {
    code: 200,
    message: 'OK',
    data,
  }
}

function apiError(message, code = 400) {
  return {
    code,
    message,
    data: null,
  }
}

function maskSecretValue(value) {
  if (!value) {
    return ''
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}****${value.slice(-2)}`
  }
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

function generatedImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#f4f1eb"/>
          <stop offset="0.48" stop-color="#d7e8df"/>
          <stop offset="1" stop-color="#1f5a44"/>
        </linearGradient>
      </defs>
      <rect width="720" height="1280" fill="url(#bg)"/>
      <circle cx="360" cy="410" r="170" fill="#f8d8c2"/>
      <path d="M120 980c48-190 148-294 240-294s192 104 240 294v300H120z" fill="#26362f"/>
      <path d="M210 550c60 70 240 70 300 0v82c-70 80-230 80-300 0z" fill="#101916" opacity="0.9"/>
      <rect x="92" y="82" width="536" height="112" rx="24" fill="#ffffff" opacity="0.76"/>
      <rect x="112" y="108" width="360" height="26" rx="13" fill="#1f5a44" opacity="0.86"/>
      <rect x="112" y="150" width="250" height="20" rx="10" fill="#1f5a44" opacity="0.42"/>
    </svg>
  `.trim()
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function handleApiRequest(url, method, postData) {
  const parsed = new URL(url)
  const pathname = parsed.pathname.replace(/^\/api/, '')
  const body = postData ? JSON.parse(postData) : {}

  if (method === 'GET' && pathname === '/admin/auth/me') {
    return apiOk(session)
  }

  if (method === 'GET' && pathname === '/admin/ai/image-providers') {
    state.providers.forEach(refreshProviderReadiness)
    return apiOk(state.providers)
  }

  if (method === 'POST' && pathname === '/admin/ai/image-providers') {
    const providerCode = body.providerCode
    let provider = state.providers.find((item) => item.providerCode === providerCode)
    if (!provider) {
      provider = createProvider({
        configId: Math.max(...state.providers.map((item) => item.configId || 0)) + 1,
        providerCode,
      })
      state.providers.push(provider)
    }
    provider.displayName = body.displayName || provider.displayName || providerCode
    provider.enabled = Boolean(body.enabled)
    provider.priority = body.priority || provider.priority || 100
    provider.publicConfig = { ...(body.publicConfig || {}) }
    if (body.secrets && Object.keys(body.secrets).length) {
      state.secrets[providerCode] = {
        ...(state.secrets[providerCode] || {}),
        ...body.secrets,
      }
      provider.secretMask = Object.fromEntries(
        Object.entries(state.secrets[providerCode]).map(([key, value]) => [key, maskSecretValue(String(value))]),
      )
      provider.secretUpdatedBy = session.adminUserId
      provider.secretUpdatedByName = session.userName
      provider.secretUpdatedAt = nowIso()
    }
    provider.lastUpdate = nowIso()
    state.providers.sort((left, right) => (left.priority || 100) - (right.priority || 100))
    return apiOk(refreshProviderReadiness(provider))
  }

  const providerMatch = pathname.match(/^\/admin\/ai\/image-providers\/([^/]+)(?:\/([^/]+))?$/)
  if (!providerMatch) {
    return apiError(`Unhandled E2E mock API: ${method} ${pathname}`, 404)
  }

  const providerCode = decodeURIComponent(providerMatch[1])
  const action = providerMatch[2] || ''
  const provider = providerByCode(providerCode)

  if (method === 'GET' && !action) {
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'PUT' && action === 'public-config') {
    provider.publicConfig = { ...(body.publicConfig || {}) }
    provider.lastUpdate = nowIso()
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'PUT' && action === 'secret') {
    state.secrets[providerCode] = {
      ...(state.secrets[providerCode] || {}),
      ...(body.secrets || {}),
    }
    provider.secretMask = Object.fromEntries(
      Object.entries(state.secrets[providerCode]).map(([key, value]) => [key, maskSecretValue(String(value))]),
    )
    provider.secretUpdatedBy = session.adminUserId
    provider.secretUpdatedByName = session.userName
    provider.secretUpdatedAt = nowIso()
    provider.lastUpdate = nowIso()
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'POST' && action === 'reveal-secret') {
    if (body.confirmText !== providerCode) {
      return apiError(`请输入 ${providerCode}`)
    }
    return apiOk({
      providerCode,
      secrets: state.secrets[providerCode] || {},
      revealedAt: nowIso(),
    })
  }

  if (method === 'POST' && action === 'clear-secret') {
    if (body.confirmText !== providerCode) {
      return apiError(`请输入 ${providerCode}`)
    }
    state.secrets[providerCode] = {}
    provider.secretMask = {}
    provider.secretUpdatedBy = session.adminUserId
    provider.secretUpdatedByName = session.userName
    provider.secretUpdatedAt = nowIso()
    provider.active = false
    provider.lastUpdate = nowIso()
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'POST' && action === 'enable') {
    provider.enabled = true
    provider.lastUpdate = nowIso()
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'POST' && action === 'disable') {
    provider.enabled = false
    provider.active = false
    provider.lastUpdate = nowIso()
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'POST' && action === 'activate') {
    refreshProviderReadiness(provider)
    if (!provider.activationReady) {
      return apiError('provider 配置未完整，不能设为主模型')
    }
    state.providers.forEach((item) => {
      item.active = item.providerCode === providerCode
    })
    provider.enabled = true
    provider.lastUpdate = nowIso()
    return apiOk(refreshProviderReadiness(provider))
  }

  if (method === 'POST' && action === 'test') {
    provider.lastTestStatus = 'success'
    provider.lastTestMessage = 'E2E mock 生成成功'
    provider.lastTestAt = nowIso()
    return apiOk({
      providerCode,
      modelCode: provider.publicConfig?.model,
      status: 'success',
      message: 'E2E mock 生成成功',
      imageUrl: generatedImageDataUrl(),
      elapsedMs: 1280,
    })
  }

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
    if (callbacks) {
      callbacks.forEach((callback) => callback(message.params || {}))
    }
  }

  send(method, params = {}) {
    const id = this.nextId++
    const payload = JSON.stringify({ id, method, params })
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP command timed out: ${method}`))
      }, 15000)
      this.pending.set(id, { resolve, reject, timer })
      this.ws.send(payload)
    })
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || []
    callbacks.push(callback)
    this.listeners.set(method, callbacks)
  }

  async close() {
    if (this.ws) {
      this.ws.close()
    }
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
  return {
    ...options,
    signal: options.signal || AbortSignal.timeout(timeoutMs),
  }
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

async function waitFor(predicate, label, timeoutMs = 15000, intervalMs = 150) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const result = await predicate()
    if (result) {
      return result
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function ensureDevServer() {
  if (await isHttpReady(baseUrl)) {
    logStep(`复用已运行的后台前端: ${baseUrl}`)
    return null
  }

  logStep(`启动后台前端: ${baseUrl}`)
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(command, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5100', '--strictPort'], {
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
    `Vite dev server at ${baseUrl}`,
    30000,
    500,
  )

  return child
}

async function stopDevServer(child) {
  if (!child) {
    return
  }
  await killProcessTree(child.pid)
}

async function killProcessTree(pid) {
  if (!pid) {
    return
  }
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
      const timer = setTimeout(resolve, 5000)
      killer.on('exit', resolve)
      killer.on('error', resolve)
      killer.on('close', () => clearTimeout(timer))
    })
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // process already exited
  }
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

async function findChromeExecutable() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH
  }

  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        ]
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
      // continue
    }
  }
  throw new Error('未找到 Chrome/Edge，可通过 CHROME_PATH 指定浏览器可执行文件')
}

async function launchBrowser() {
  const chromePath = await findChromeExecutable()
  const remotePort = await findFreePort()
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kaipai-ai-provider-e2e-'))
  logStep(`启动浏览器: ${chromePath}`)
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
    '--window-size=1440,1000',
    headless ? '--headless=new' : '',
    'about:blank',
  ].filter(Boolean)
  const child = spawn(chromePath, args, { stdio: 'ignore' })

  await waitFor(
    async () => {
      if (child.exitCode !== null) {
        throw new Error('Chrome exited before DevTools became available')
      }
      try {
        return await fetchJson(`http://127.0.0.1:${remotePort}/json/version`)
      } catch {
        return false
      }
    },
    'Chrome DevTools endpoint',
    15000,
    200,
  )
  logStep(`Chrome DevTools 已就绪: http://127.0.0.1:${remotePort}`)

  const target = await fetchJson(`http://127.0.0.1:${remotePort}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  })
  return {
    child,
    userDataDir,
    wsUrl: target.webSocketDebuggerUrl,
    async close() {
      await killProcessTree(child.pid)
      try {
        await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      } catch (error) {
        console.warn(`[e2e] 浏览器临时目录清理失败，可稍后手动删除: ${userDataDir} (${error.message})`)
      }
    },
  }
}

async function setupBrowserPage(client) {
  const browserErrors = []
  const failedRequests = []

  client.on('Runtime.exceptionThrown', (event) => {
    const detail = event.exceptionDetails
    browserErrors.push(detail?.text || detail?.exception?.description || 'Runtime exception')
  })
  client.on('Log.entryAdded', (event) => {
    const text = event.entry?.text || ''
    if (event.entry?.level === 'error' && !text.includes('Failed to load resource')) {
      browserErrors.push(text)
    }
  })
  client.on('Network.loadingFailed', (event) => {
    if (!event.canceled) {
      failedRequests.push(`${event.requestId}: ${event.errorText}`)
    }
  })
  client.on('Fetch.requestPaused', async (event) => {
    try {
      const response = handleApiRequest(event.request.url, event.request.method, event.request.postData)
      await client.send('Fetch.fulfillRequest', {
        requestId: event.requestId,
        responseCode: 200,
        responsePhrase: 'OK',
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json; charset=utf-8' },
          { name: 'Cache-Control', value: 'no-store' },
        ],
        body: Buffer.from(JSON.stringify(response), 'utf8').toString('base64'),
      })
    } catch (error) {
      await client.send('Fetch.fulfillRequest', {
        requestId: event.requestId,
        responseCode: 500,
        responsePhrase: 'E2E Mock Error',
        responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        body: Buffer.from(JSON.stringify(apiError(error.message, 500)), 'utf8').toString('base64'),
      })
    }
  })

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Log.enable')
  await client.send('Network.enable')
  await client.send('Fetch.enable', {
    patterns: [{ urlPattern: `${baseUrl}/api/*`, requestStage: 'Request' }],
  })
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('kaipai-admin-token', 'e2e-token');
      localStorage.setItem('kaipai-admin-session', ${JSON.stringify(JSON.stringify(session))});
    `,
  })
  return { browserErrors, failedRequests }
}

async function evaluate(client, expression, awaitPromise = true) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Runtime evaluate failed')
  }
  return result.result?.value
}

function jsString(value) {
  return JSON.stringify(value)
}

async function waitForText(client, text, timeoutMs = 10000) {
  await waitFor(
    () =>
      evaluate(
        client,
        `document.body && document.body.innerText.includes(${jsString(text)})`,
      ),
    `text "${text}"`,
    timeoutMs,
  )
}

async function clickText(client, text, selector = 'button') {
  const ok = await evaluate(
    client,
    `
      (() => {
        const text = ${jsString(text)};
        const nodes = Array.from(document.querySelectorAll(${jsString(selector)}));
        const node = nodes.find((item) => item.innerText && item.innerText.trim().includes(text));
        if (!node) return false;
        node.scrollIntoView({ block: 'center', inline: 'center' });
        node.click();
        return true;
      })()
    `,
  )
  if (!ok) {
    throw new Error(`未找到可点击元素: ${text}`)
  }
}

async function setFormValue(client, label, value, containerSelector = 'body') {
  const ok = await evaluate(
    client,
    `
      (() => {
        const labelText = ${jsString(label)};
        const value = ${jsString(value)};
        const roots = Array.from(document.querySelectorAll(${jsString(containerSelector)}));
        const items = roots.flatMap((root) => Array.from(root.querySelectorAll('.el-form-item')));
        const item = items.find((node) => {
          const label = node.querySelector('.el-form-item__label');
          return label && label.innerText.includes(labelText);
        });
        if (!item) return false;
        const input = item.querySelector('textarea, input');
        if (!input) return false;
        input.scrollIntoView({ block: 'center', inline: 'center' });
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
        return true;
      })()
    `,
  )
  if (!ok) {
    throw new Error(`未找到表单项: ${label}`)
  }
}

async function fillVisiblePrompt(client, value) {
  const ok = await evaluate(
    client,
    `
      (() => {
        const input = Array.from(document.querySelectorAll('.el-message-box input')).find((item) => item.offsetParent !== null);
        if (!input) return false;
        input.focus();
        input.value = ${jsString(value)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  )
  if (!ok) {
    throw new Error('未找到二次确认输入框')
  }
}

async function confirmDialog(client) {
  const ok = await evaluate(
    client,
    `
      (() => {
        const buttons = Array.from(document.querySelectorAll('.el-message-box button'));
        const button = buttons.find((item) => item.innerText && item.innerText.trim().includes('确认'));
        if (!button) return false;
        button.click();
        return true;
      })()
    `,
  )
  if (!ok) {
    throw new Error('未找到确认按钮')
  }
}

async function waitForNetworkIdle(client) {
  await evaluate(
    client,
    `
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 120)));
      })
    `,
  )
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
  console.log(`screenshot: ${path.relative(repoRoot, target)}`)
}

async function runFlow(client) {
  logStep('打开 AI 生图厂商配置页')
  await client.send('Page.navigate', { url: `${baseUrl}/system/ai-image-providers` })
  await waitForText(client, 'AI 生图厂商')
  await waitForText(client, 'AI 生图配置')
  await waitForText(client, '阿里云 Qwen Image')
  await screenshot(client, '01-provider-list-initial.png')

  logStep('通过新增厂商弹窗填写阿里云厂商接入信息')
  await clickText(client, '新增厂商')
  await waitForText(client, '新增 AI 生图厂商')
  await waitForText(client, '厂商类型')
  await setFormValue(client, '后台显示名称', '阿里云 Qwen Image', '.el-dialog')
  await setFormValue(client, 'API 地址', 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', '.el-dialog')
  await setFormValue(client, '地域', 'cn-beijing', '.el-dialog')
  await setFormValue(client, '模型 ID', 'qwen-image-edit', '.el-dialog')
  await setFormValue(client, '尺寸', '1024*1536', '.el-dialog')
  await setFormValue(client, '返回格式', 'url', '.el-dialog')
  await setFormValue(client, '扩展参数 JSON', '{"n":1,"seed":1024}', '.el-dialog')
  await setFormValue(client, 'API Key', 'sk-e2e-aliyun-qwen-image', '.el-dialog')
  await setFormValue(client, '变更备注', 'E2E 保存厂商信息', '.el-dialog')
  await screenshot(client, '02-aliyun-provider-dialog-filled.png')

  await clickText(client, '保存厂商信息')
  await waitForText(client, '厂商信息已保存')
  await waitForText(client, '密钥已配置')
  await waitForText(client, '厂商接口')
  await screenshot(client, '03-aliyun-provider-saved.png')

  logStep('回显阿里云密钥')
  await clickText(client, '密钥', '.el-tabs__item')
  await waitForText(client, '必填密钥')
  await waitForText(client, 'sk-e****mage')
  await screenshot(client, '04-aliyun-secret-saved-masked.png')

  await clickText(client, '查看密钥')
  await waitForText(client, '查看密钥需要二次确认')
  await fillVisiblePrompt(client, 'aliyun-qwen-image')
  await confirmDialog(client)
  await waitForText(client, '已回显密钥')
  await waitForText(client, 'sk-e2e-aliyun-qwen-image')
  await screenshot(client, '05-aliyun-secret-revealed.png')

  logStep('切换阿里云为主模型')
  await clickText(client, '设为主模型')
  await waitForText(client, '下一次 AI 资料卡生成会使用该 provider。')
  await confirmDialog(client)
  await waitForText(client, '主模型已切换')
  await waitForText(client, '当前主模型')
  await screenshot(client, '06-aliyun-activated.png')

  logStep('执行生图测试表单')
  await clickText(client, '测试', '.el-tabs__item')
  await waitForText(client, '测试生成')
  await setFormValue(client, '参考人像图片 URL', 'https://static.kplyyk.com/e2e/profile-source.jpg')
  await setFormValue(client, 'Prompt', 'E2E 测试生成演员资料卡背景图')
  await setFormValue(client, 'Negative Prompt', 'text, watermark, logo')
  await setFormValue(client, 'Style', 'classic')
  await screenshot(client, '07-test-form-filled.png')

  await clickText(client, '测试生成')
  await waitForText(client, 'E2E mock 生成成功')
  await waitFor(
    () => evaluate(client, `Boolean(document.querySelector('.test-image'))`),
    'test result image',
    10000,
  )
  await screenshot(client, '08-test-result-success.png')

  logStep('清空密钥并验证回到待补状态')
  await clickText(client, '密钥', '.el-tabs__item')
  await clickText(client, '清空密钥')
  await waitForText(client, '清空密钥后如该 provider 为主模型会自动取消主模型状态')
  await fillVisiblePrompt(client, 'aliyun-qwen-image')
  await confirmDialog(client)
  await waitForText(client, '密钥已清空')
  await waitForText(client, '未配置')
  await screenshot(client, '09-secret-cleared-back-to-missing.png')

  logStep('检查腾讯混元双密钥字段')
  await clickText(client, '腾讯混元生图', '.provider-item')
  await waitForText(client, 'SecretId')
  await waitForText(client, 'SecretKey')
  await screenshot(client, '10-tencent-secret-fields.png')
}

async function prepareScreenshotDir() {
  await fs.mkdir(screenshotDir, { recursive: true })
  const entries = await fs.readdir(screenshotDir, { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && (entry.name.endsWith('.png') || entry.name === 'e2e.log'))
      .map((entry) => fs.rm(path.join(screenshotDir, entry.name), { force: true })),
  )
}

async function main() {
  await prepareScreenshotDir()
  logStep(`截图目录: ${screenshotDir}`)
  const devServer = await ensureDevServer()
  const browser = await launchBrowser()
  const client = new CdpClient(browser.wsUrl)

  try {
    await client.connect()
    const diagnostics = await setupBrowserPage(client)
    await runFlow(client)

    if (diagnostics.browserErrors.length) {
      throw new Error(`浏览器错误:\n${diagnostics.browserErrors.join('\n')}`)
    }
    if (diagnostics.failedRequests.length) {
      throw new Error(`网络请求失败:\n${diagnostics.failedRequests.join('\n')}`)
    }

    console.log(`AI image provider E2E passed. Screenshots: ${screenshotDir}`)
  } finally {
    await client.close()
    await browser.close()
    await stopDevServer(devServer)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
