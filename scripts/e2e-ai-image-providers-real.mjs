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
  process.env.E2E_SCREENSHOT_DIR || path.join(repoRoot, 'output', 'ai-image-providers-real-e2e'),
)
const account = process.env.E2E_ADMIN_ACCOUNT || 'admin'
const password = process.env.E2E_ADMIN_PASSWORD || 'admin123'
const headless = process.env.E2E_HEADLESS !== 'false'
const viewport = { width: 1440, height: 1000 }

const routeRecords = []
let temporaryTencentSecretWritten = false
let temporaryTencentSecretCleared = false

function logStep(message) {
  const line = `[real-e2e] ${new Date().toISOString()} ${message}`
  console.log(line)
  try {
    fsSync.mkdirSync(screenshotDir, { recursive: true })
    fsSync.appendFileSync(path.join(screenshotDir, 'e2e.log'), `${line}\n`, 'utf8')
  } catch {
    // Console output is enough if file logging is unavailable.
  }
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

async function cleanupTencentSecretViaHttp(reason) {
  logStep(`执行腾讯测试密钥兜底清理: ${reason}`)
  const loginResponse = await fetch(`${baseUrl}/api/admin/auth/login`, withFetchTimeout({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  }, 20000))
  const loginBody = await loginResponse.json()
  const token = loginBody?.data?.accessToken
  if (!token) {
    throw new Error(`兜底清理登录失败: HTTP ${loginResponse.status}, code ${loginBody?.code}`)
  }
  const clearResponse = await fetch(`${baseUrl}/api/admin/ai/image-providers/tencent-hunyuan/clear-secret`, withFetchTimeout({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      confirmText: 'tencent-hunyuan',
      reason,
    }),
  }, 20000))
  const clearBody = await clearResponse.json()
  if (clearResponse.status !== 200 || clearBody?.code !== 200) {
    throw new Error(`兜底清理失败: HTTP ${clearResponse.status}, code ${clearBody?.code}, message ${clearBody?.message || ''}`)
  }
  temporaryTencentSecretCleared = true
  logStep('腾讯测试密钥兜底清理完成')
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
  const suffix = lastError ? ` Last error: ${lastError.message}` : ''
  throw new Error(`Timed out waiting for ${label}.${suffix}`)
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
    // Process already exited.
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
      // Continue.
    }
  }
  throw new Error('未找到 Chrome/Edge，可通过 CHROME_PATH 指定浏览器可执行文件')
}

async function launchBrowser() {
  const chromePath = await findChromeExecutable()
  const remotePort = await findFreePort()
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kaipai-ai-provider-real-e2e-'))
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
        console.warn(`[real-e2e] 浏览器临时目录清理失败，可稍后手动删除: ${userDataDir} (${error.message})`)
      }
    },
  }
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
        console.error(`[real-e2e] Failed to handle CDP message: ${error.message}`)
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

async function setupBrowserPage(client) {
  const browserErrors = []
  const failedRequests = []
  const requests = new Map()

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
  client.on('Network.requestWillBeSent', (event) => {
    requests.set(event.requestId, {
      method: event.request?.method || 'GET',
      url: event.request?.url || '',
      postData: sanitizePostData(event.request?.postData || ''),
    })
  })
  client.on('Network.responseReceived', (event) => {
    const request = requests.get(event.requestId)
    const url = request?.url || event.response?.url || ''
    if (url.includes('/api/admin/auth/') || url.includes('/api/admin/ai/image-providers')) {
      const record = {
        method: request?.method || '',
        url,
        status: event.response?.status,
        postData: request?.postData || '',
      }
      routeRecords.push(record)
      logStep(`接口返回: ${record.method} ${url.replace(baseUrl, '')} -> HTTP ${record.status}`)
    }
  })
  client.on('Network.loadingFailed', (event) => {
    if (!event.canceled) {
      const request = requests.get(event.requestId)
      failedRequests.push(`${request?.method || ''} ${request?.url || event.requestId}: ${event.errorText}`)
    }
  })

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Log.enable')
  await client.send('Network.enable')
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
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

function sanitizePostData(postData) {
  if (!postData) {
    return ''
  }
  try {
    const parsed = JSON.parse(postData)
    if (Object.prototype.hasOwnProperty.call(parsed, 'password')) {
      parsed.password = '***'
    }
    if (parsed.secrets && typeof parsed.secrets === 'object') {
      parsed.secrets = Object.fromEntries(Object.keys(parsed.secrets).map((key) => [key, '***']))
    }
    return JSON.stringify(parsed)
  } catch {
    return postData.replace(/(AKID|CODEX|sk-|Bearer)[^"',\s}]*/gi, '$1***')
  }
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

async function waitForLocation(client, pathname, timeoutMs = 15000) {
  await waitFor(
    () => evaluate(client, `location.pathname === ${jsString(pathname)}`),
    `location ${pathname}`,
    timeoutMs,
  )
}

async function waitForNoVisibleDialog(client, timeoutMs = 15000) {
  await waitFor(
    () =>
      evaluate(
        client,
        `
          !Array.from(document.querySelectorAll('.el-dialog')).some((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
        `,
      ),
    'dialog close',
    timeoutMs,
  )
}

async function isProviderDialogOpen(client) {
  return evaluate(
    client,
    `
      Array.from(document.querySelectorAll('.provider-dialog')).some((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
    `,
  )
}

async function waitForCurrentProviderTitle(client, title, timeoutMs = 10000) {
  await waitFor(
    () =>
      evaluate(
        client,
        `
          (() => {
            const title = ${jsString(title)};
            const heading = document.querySelector('.config-panel h3');
            return Boolean(heading && heading.innerText.includes(title));
          })()
        `,
      ),
    `current provider title ${title}`,
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
        const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(input, value);
        } else {
          input.value = value;
        }
        if (typeof InputEvent === 'function') {
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
        } else {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
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

async function waitForFormPlaceholder(client, label, placeholderPart, containerSelector = 'body') {
  await waitFor(
    () =>
      evaluate(
        client,
        `
          (() => {
            const labelText = ${jsString(label)};
            const placeholderPart = ${jsString(placeholderPart)};
            const roots = Array.from(document.querySelectorAll(${jsString(containerSelector)}));
            const items = roots.flatMap((root) => Array.from(root.querySelectorAll('.el-form-item')));
            const item = items.find((node) => {
              const label = node.querySelector('.el-form-item__label');
              return label && label.innerText.includes(labelText);
            });
            if (!item) return false;
            const input = item.querySelector('textarea, input');
            return Boolean(input && input.getAttribute('placeholder')?.includes(placeholderPart));
          })()
        `,
      ),
    `placeholder "${placeholderPart}" for ${label}`,
    10000,
  )
}

async function selectFormOption(client, label, optionText, containerSelector = 'body') {
  const triggerPoint = await evaluate(
    client,
    `
      (() => {
        const labelText = ${jsString(label)};
        const roots = Array.from(document.querySelectorAll(${jsString(containerSelector)}));
        const items = roots.flatMap((root) => Array.from(root.querySelectorAll('.el-form-item')));
        const item = items.find((node) => {
          const label = node.querySelector('.el-form-item__label');
          return label && label.innerText.includes(labelText);
        });
        if (!item) return false;
        const select = item.querySelector('.el-select');
        const target = item.querySelector('.el-select__wrapper') || select || item.querySelector('input');
        if (!target) return false;
        target.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = target.getBoundingClientRect();
        return {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
      })()
    `,
  )
  if (!triggerPoint) {
    throw new Error(`未找到下拉表单项: ${label}`)
  }
  await dispatchMouseClick(client, triggerPoint.x, triggerPoint.y)

  await waitFor(
    () =>
      evaluate(
        client,
        `
          Array.from(document.querySelectorAll('.el-select-dropdown__item')).some((item) => {
            const rect = item.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && item.innerText.includes(${jsString(optionText)});
          })
        `,
      ),
    `select option ${optionText}`,
    10000,
  )

  const optionPoint = await evaluate(
    client,
    `
      (() => {
        const optionText = ${jsString(optionText)};
        const item = Array.from(document.querySelectorAll('.el-select-dropdown__item')).find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && node.innerText.includes(optionText);
        });
        if (!item) return false;
        item.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = item.getBoundingClientRect();
        return {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
      })()
    `,
  )
  if (!optionPoint) {
    throw new Error(`未找到下拉选项: ${optionText}`)
  }
  await dispatchMouseClick(client, optionPoint.x, optionPoint.y)
}

async function dispatchMouseClick(client, x, y) {
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
  })
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  })
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  })
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
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 160)));
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

async function getProvidersViaBrowser(client) {
  return evaluate(
    client,
    `
      (async () => {
        const token = localStorage.getItem('kaipai-admin-token');
        const response = await fetch('/api/admin/ai/image-providers', {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        });
        const body = await response.json();
        return { httpStatus: response.status, body };
      })()
    `,
  )
}

async function postUnsupportedProviderSmoke(client) {
  return evaluate(
    client,
    `
      (async () => {
        const token = localStorage.getItem('kaipai-admin-token');
        const response = await fetch('/api/admin/ai/image-providers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
          },
          body: JSON.stringify({
            providerCode: 'codex-e2e-unsupported',
            displayName: 'Codex E2E Unsupported',
            enabled: false,
            priority: 999,
            publicConfig: {
              endpoint: 'https://example.invalid/e2e',
              model: 'noop',
            },
            reason: 'codex route existence smoke',
          }),
        });
        const body = await response.json();
        return { httpStatus: response.status, body };
      })()
    `,
  )
}

async function showApiSmokeOverlay(client, smokeResult) {
  await evaluate(
    client,
    `
      (() => {
        const old = document.getElementById('real-e2e-api-smoke');
        if (old) old.remove();
        const panel = document.createElement('section');
        panel.id = 'real-e2e-api-smoke';
        panel.style.position = 'fixed';
        panel.style.right = '24px';
        panel.style.bottom = '24px';
        panel.style.zIndex = '99999';
        panel.style.width = '560px';
        panel.style.padding = '18px 20px';
        panel.style.border = '1px solid #1677ff';
        panel.style.borderRadius = '8px';
        panel.style.background = '#f5faff';
        panel.style.boxShadow = '0 12px 34px rgba(15, 23, 42, 0.18)';
        panel.style.color = '#0f172a';
        panel.style.font = '14px/1.7 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        panel.innerHTML = [
          '<strong style="display:block;font-size:16px;margin-bottom:6px;">真实接口存在性验证</strong>',
          '<div>GET /api/admin/ai/image-providers 已在页面加载中返回 HTTP 200。</div>',
          '<div>POST /api/admin/ai/image-providers 返回 HTTP ${String(smokeResult.httpStatus).replace(/'/g, "\\'")}，业务 code=${String(smokeResult.body?.code).replace(/'/g, "\\'")}。</div>',
          '<div>返回信息：${String(smokeResult.body?.message || '').replace(/'/g, "\\'")}</div>',
          '<div style="margin-top:6px;color:#475569;">使用不支持的 providerCode 做路由验证，不写入线上厂商配置。</div>',
        ].join('');
        document.body.appendChild(panel);
      })()
    `,
  )
}

async function visibleTestResultText(client) {
  return evaluate(
    client,
    `
      (() => {
        const result = Array.from(document.querySelectorAll('.test-result')).find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        return result ? result.innerText.trim() : '';
      })()
    `,
  )
}

async function textExists(client, text) {
  return evaluate(client, `document.body && document.body.innerText.includes(${jsString(text)})`)
}

async function verifyTestTabRejectsProviderEndpoint(client, prefix) {
  logStep('选中腾讯混元生图 provider')
  await clickText(client, '腾讯混元生图', '.provider-item')
  await waitForCurrentProviderTitle(client, '腾讯混元生图')

  logStep('进入测试页并验证参考图 URL 文案')
  await clickText(client, '测试', '.el-tabs__item')
  await waitForText(client, '参考人像图片 URL')
  await waitForFormPlaceholder(client, '参考人像图片 URL', '可选')
  await screenshot(client, `${prefix}-test-tab-source-url-help.png`)

  logStep('使用腾讯 API 地址作为反例执行测试，确认不再出现 Host 受限请求头错误')
  await setFormValue(client, '参考人像图片 URL', 'https://hunyuan.tencentcloudapi.com')
  await setFormValue(client, 'Prompt', 'Codex E2E negative source URL check')
  await screenshot(client, `${prefix}-test-tab-filled-api-url-negative.png`)
  await clickText(client, '测试生成')
  const message = await waitFor(
    async () => {
      const text = await visibleTestResultText(client)
      return text || false
    },
    'test tab negative result',
    45000,
    500,
  )
  if (/restricted header name|["']?Host["']?/i.test(message)) {
    throw new Error(`测试页仍然暴露 Host 受限请求头错误: ${message}`)
  }
  await screenshot(client, `${prefix}-test-tab-api-url-negative-result.png`)
}

async function verifyPromptOnlyNoSourceImageUrl(client, provider, prefix) {
  if (!provider) {
    logStep('未找到未配置密钥的 provider，跳过空参考图 UI 提交验证以避免消耗真实厂商额度')
    return
  }
  logStep(`选中未配置密钥 provider 验证空参考图可提交: ${provider.displayName}`)
  await clickText(client, provider.displayName, '.provider-item')
  await waitForCurrentProviderTitle(client, provider.displayName)
  await clickText(client, '测试', '.el-tabs__item')
  await setFormValue(client, '参考人像图片 URL', '')
  await setFormValue(client, 'Prompt', 'Codex E2E prompt only check')
  await screenshot(client, `${prefix}-prompt-only-no-source-before-submit.png`)
  await clickText(client, '测试生成')
  await new Promise((resolve) => setTimeout(resolve, 1200))
  if (await textExists(client, '请填写测试图 URL')) {
    throw new Error('空参考图测试仍被前端“请填写测试图 URL”拦截')
  }
  const message = await waitFor(
    async () => {
      const text = await visibleTestResultText(client)
      return text || false
    },
    'prompt-only no source result',
    20000,
    500,
  )
  if (/请填写测试图 URL|sourceImageUrl/i.test(message)) {
    throw new Error(`空参考图测试仍返回源图必填错误: ${message}`)
  }
  await screenshot(client, `${prefix}-prompt-only-no-source-result.png`)
}

async function runFlow(client) {
  logStep('打开登录页')
  await client.send('Page.navigate', { url: `${baseUrl}/login?redirect=/system/ai-image-providers` })
  await waitForText(client, '登录到管理后台')
  await screenshot(client, '01-login-page.png')

  logStep('填写真实后台账号密码')
  await setFormValue(client, '后台账号', account)
  await setFormValue(client, '密码', password)
  await screenshot(client, '02-login-filled.png')

  logStep('提交登录并进入 AI 生图配置页')
  await clickText(client, '登 录')
  await waitForLocation(client, '/system/ai-image-providers', 20000)
  await waitForText(client, 'AI 生图厂商', 20000)
  await waitForText(client, 'AI 生图配置', 20000)
  await waitForText(client, '腾讯混元生图', 20000)
  await screenshot(client, '03-after-login-provider-page.png')

  logStep('读取真实 provider 列表并确认 Tencent 当前密钥状态')
  const providerResponse = await getProvidersViaBrowser(client)
  if (providerResponse.httpStatus !== 200 || providerResponse.body?.code !== 200) {
    throw new Error(`真实 provider GET 失败: HTTP ${providerResponse.httpStatus}, code ${providerResponse.body?.code}`)
  }
  const tencent = providerResponse.body.data.find((item) => item.providerCode === 'tencent-hunyuan')
  if (!tencent) {
    throw new Error('真实 provider 列表缺少 tencent-hunyuan')
  }
  const promptOnlySmokeProvider = providerResponse.body.data.find((item) =>
    item.providerCode !== 'tencent-hunyuan' &&
    item.providerCode !== 'kplyyk' &&
    !item.secretConfigured
  )
  logStep(`腾讯混元初始状态: secretConfigured=${Boolean(tencent.secretConfigured)}, enabled=${Boolean(tencent.enabled)}`)
  await screenshot(client, '04-provider-list-real-api-loaded.png')

  logStep('打开新增厂商弹窗并切换为腾讯混元')
  await clickText(client, '新增厂商')
  await waitForText(client, '新增 AI 生图厂商')
  await screenshot(client, '05-open-add-provider-dialog.png')
  await selectFormOption(client, '厂商类型', '腾讯混元生图', '.el-dialog')
  await waitForText(client, 'SecretId')
  await screenshot(client, '06-tencent-provider-selected.png')

  if (!tencent.secretConfigured) {
    logStep('填写腾讯混元测试配置和测试密钥')
    await setFormValue(client, '后台显示名称', '腾讯混元生图', '.el-dialog')
    await setFormValue(client, 'API 地址', 'https://hunyuan.tencentcloudapi.com', '.el-dialog')
    await setFormValue(client, '地域', 'ap-guangzhou', '.el-dialog')
    await setFormValue(client, '模型 ID', 'hunyuan-image', '.el-dialog')
    await setFormValue(client, '接口版本', '2023-09-01', '.el-dialog')
    await setFormValue(client, '尺寸', '720:1280', '.el-dialog')
    await setFormValue(client, '分辨率', '720:1280', '.el-dialog')
    await setFormValue(client, 'SecretId', 'AKID_CODEX_E2E_DO_NOT_USE_20260516', '.el-dialog')
    await setFormValue(client, 'SecretKey', 'CODEX_E2E_SECRET_DO_NOT_USE_20260516', '.el-dialog')
    await setFormValue(client, '变更备注', 'Codex real E2E temporary Tencent secret', '.el-dialog')
    await screenshot(client, '07-tencent-provider-dialog-filled.png')

    logStep('点击保存厂商信息，验证真实保存接口')
    temporaryTencentSecretWritten = true
    await clickText(client, '保存厂商信息')
    await waitFor(
      async () => {
        const response = await getProvidersViaBrowser(client)
        const item = response.body?.data?.find((provider) => provider.providerCode === 'tencent-hunyuan')
        return Boolean(item?.secretConfigured)
      },
      'Tencent secret saved in real backend',
      15000,
      500,
    )
    await screenshot(client, '08-tencent-provider-saved.png')
    if (await isProviderDialogOpen(client)) {
      logStep('保存后弹窗仍显示，先截图保留证据，然后手动关闭继续验证后续状态')
      await clickText(client, '取消')
      await waitForNoVisibleDialog(client, 10000)
    }

    logStep('进入密钥页并验证脱敏显示')
    await clickText(client, '腾讯混元生图', '.provider-item')
    await clickText(client, '密钥', '.el-tabs__item')
    await waitForText(client, '必填密钥')
    await waitForText(client, '****0516')
    await screenshot(client, '09-tencent-secret-masked.png')

    logStep('二次确认后回显测试密钥')
    await clickText(client, '查看密钥')
    await waitForText(client, '查看密钥需要二次确认')
    await screenshot(client, '10-reveal-secret-confirm.png')
    await fillVisiblePrompt(client, 'tencent-hunyuan')
    await confirmDialog(client)
    await waitForText(client, '已回显密钥', 15000)
    await waitForText(client, 'AKID_CODEX_E2E_DO_NOT_USE_20260516', 15000)
    await screenshot(client, '11-tencent-secret-revealed.png')

    await verifyTestTabRejectsProviderEndpoint(client, '12')

    logStep('清空测试密钥，恢复腾讯混元为未配置密钥状态')
    await clickText(client, '密钥', '.el-tabs__item')
    await waitForText(client, '清空密钥')
    await clickText(client, '清空密钥')
    await waitForText(client, '清空密钥后如该 provider 为主模型会自动取消主模型状态')
    await screenshot(client, '13-clear-secret-confirm.png')
    await fillVisiblePrompt(client, 'tencent-hunyuan')
    await confirmDialog(client)
    await waitForText(client, '未配置', 15000)
    await waitFor(
      async () => {
        const response = await getProvidersViaBrowser(client)
        const item = response.body?.data?.find((provider) => provider.providerCode === 'tencent-hunyuan')
        return item && !item.secretConfigured
      },
      'Tencent secret cleared in real backend',
      15000,
      500,
    )
    temporaryTencentSecretCleared = true
    await screenshot(client, '14-tencent-secret-cleared.png')
  } else {
    logStep('腾讯混元已有真实密钥，跳过写入/回显/清空，避免破坏线上配置')
    await screenshot(client, '07-tencent-existing-secret-skip-write.png')
    await clickText(client, '取消')
    await waitForNoVisibleDialog(client, 10000)
    await verifyTestTabRejectsProviderEndpoint(client, '08')
    await verifyPromptOnlyNoSourceImageUrl(client, promptOnlySmokeProvider, '09')
  }

  logStep('验证 POST /admin/ai/image-providers 路由存在且不是 404')
  const smokeResult = await postUnsupportedProviderSmoke(client)
  if (smokeResult.httpStatus === 404) {
    throw new Error('POST /api/admin/ai/image-providers 仍然返回 404')
  }
  if (!String(smokeResult.body?.message || '').includes('不支持的 AI 生图 provider')) {
    throw new Error(`POST route smoke 返回异常: ${JSON.stringify(smokeResult)}`)
  }
  await showApiSmokeOverlay(client, smokeResult)
  await screenshot(client, '15-post-route-exists-smoke.png')

  const finalProviderResponse = await getProvidersViaBrowser(client)
  const finalTencent = finalProviderResponse.body?.data?.find((item) => item.providerCode === 'tencent-hunyuan')
  if (!tencent.secretConfigured && finalTencent?.secretConfigured) {
    throw new Error('测试结束后腾讯混元仍显示已配置密钥，清理失败')
  }
  if (!tencent.secretConfigured) {
    temporaryTencentSecretCleared = true
  }
}

async function prepareScreenshotDir() {
  await fs.mkdir(screenshotDir, { recursive: true })
  const entries = await fs.readdir(screenshotDir, { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && (entry.name.endsWith('.png') || entry.name.endsWith('.json') || entry.name === 'e2e.log'))
      .map((entry) => fs.rm(path.join(screenshotDir, entry.name), { force: true })),
  )
}

async function writeRouteSummary() {
  await fs.writeFile(
    path.join(screenshotDir, 'network-summary.json'),
    JSON.stringify(
      {
        baseUrl,
        generatedAt: new Date().toISOString(),
        routeRecords,
      },
      null,
      2,
    ),
    'utf8',
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

    await writeRouteSummary()
    console.log(`AI image provider real E2E passed. Screenshots: ${screenshotDir}`)
  } finally {
    if (temporaryTencentSecretWritten && !temporaryTencentSecretCleared) {
      await cleanupTencentSecretViaHttp('Codex E2E fallback cleanup after script interruption').catch((error) => {
        console.error(`[real-e2e] 腾讯测试密钥兜底清理失败: ${error.message}`)
      })
    }
    await writeRouteSummary().catch(() => undefined)
    await client.close()
    await browser.close()
    await stopDevServer(devServer)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
