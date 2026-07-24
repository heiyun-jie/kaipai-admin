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
}
const testSecret = `DEEPSEEK_E2E_PLAINTEXT_SECRET_${randomUUID()}_ONLY_IN_MEMORY`

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

const state = {
  config: createConfig(),
  secretConfigured: true,
  testAttempts: 0,
  requests: [],
  unhandledRequests: [],
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

function apiError(message, code = 400) {
  return { code, message, data: null }
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

function handleApiRequest(url, method, postData) {
  const parsed = new URL(url)
  const pathname = parsed.pathname.replace(/^\/api/, '')
  state.requests.push({ method, pathname })

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

async function startDevServer() {
  const port = await chooseVitePort()
  baseUrl = `http://127.0.0.1:${port}`
  logStep(`启动独占后台前端: ${baseUrl}`)
  const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
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
        response = handleApiRequest(event.request.url, event.request.method, event.request.postData)
      } catch (error) {
        response = apiError(error.message, 500)
      }
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
      return Boolean(sidebar)
        && sidebar.innerText.includes('系统设置')
        && !sidebar.innerText.includes('DeepSeek 资料导入')
        && !sidebar.innerHTML.includes('/system/ai-profile-import');
    })()`,
    '正式 sidebar 必须保留系统设置且不得出现 DeepSeek route/label',
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
        auditVisible: Boolean(heading('配置审计')),
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
    const auditCalls = state.requests.filter((request) => request.pathname.endsWith('/audits')).length
    assertEqual(auditCalls, scenario.key === 'audit' ? 1 : 0, `${scenario.key} audit API exposure`)
  }
  await screenshot(client, '03-audit-only-permission.png')
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

async function main() {
  await prepareEvidenceDir()
  logStep(`E2E 证据目录: ${screenshotDir}`)
  let devServer = null
  let browser = null
  let client = null

  try {
    devServer = await startDevServer()
    browser = await launchBrowser()
    client = new CdpClient(browser.wsUrl)
    await client.connect()
    const diagnostics = await setupBrowserPage(client)

    await assertFormalEntryAndPageGuard(client)
    await assertActionPermissions(client)
    await assertLifecycle(client)
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
