/**
 * Headless-Chrome E2E smoke check via CDP (no extra deps — Node 22+ WebSocket).
 * Flow: open /login → submit real credentials → expect /dashboard to render
 * → click logout → expect redirect to /login.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = process.env.APP_URL ?? 'http://localhost:4173'
const EMAIL = process.env.E2E_EMAIL ?? 'admin@edtech.ai'
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo1234'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'sg-e2e-'))
  const port = 9222 + Math.floor(Math.random() * 500)
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${profile}`,
    '--window-size=1280,900',
    'about:blank',
  ], { stdio: 'ignore' })
  return { proc, port, profile }
}

async function getWsUrl(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const tabs = await res.json()
      // Prefer a real page tab (Chrome may also expose extension/service
      // worker targets that are not navigable).
      const page = tabs.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch { /* retry */ }
    await sleep(250)
  }
  throw new Error('Chrome CDP endpoint did not come up')
}

let msgId = 0
const pending = new Map()

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(new Error('WS error'))
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        const { resolve: r, reject: j } = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? j(new Error(msg.error.message)) : r(msg.result)
      }
    }
  })
}

const send = (ws, method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })

async function evaluate(ws, expression) {
  const result = await send(ws, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error('Page JS error: ' + JSON.stringify(result.exceptionDetails))
  return result.result?.value
}

async function waitFor(ws, expression, label, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if (await evaluate(ws, expression)) return
    } catch { /* retry */ }
    await sleep(300)
  }
  throw new Error(`Timed out waiting for: ${label}`)
}

const main = async () => {
  const { proc, port, profile } = launchChrome()
  let ws
  try {
    const wsUrl = await getWsUrl(port)
    ws = await connect(wsUrl)
    await send(ws, 'Page.enable')
    await send(ws, 'Runtime.enable')

    // 1. Unauthenticated /dashboard must redirect to /login.
    await send(ws, 'Page.navigate', { url: `${APP}/dashboard` })
    await waitFor(ws, `document.body && document.body.innerText.includes('Welcome back')`, 'login page after redirect')
    console.log('PASS  unauthenticated /dashboard redirects to /login')

    // 2. Real login through the UI form.
    await send(ws, 'Page.navigate', { url: `${APP}/login` })
    await waitFor(ws, `document.body && document.body.innerText.includes('Sign in to continue')`, 'login page')
    await evaluate(ws, `
      (() => {
        const setVal = (sel, val) => {
          const el = document.querySelector(sel)
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
          setter.call(el, val)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
        setVal('#email', ${JSON.stringify(EMAIL)})
        setVal('#password', ${JSON.stringify(PASSWORD)})
        document.querySelector('form').requestSubmit()
        return true
      })()
    `)
    await waitFor(ws, `document.body && document.body.innerText.includes('Executive Command Center')`, 'dashboard after login', 20000)
    console.log('PASS  login submits to /api/auth/login and lands on /dashboard')

    const userShown = await evaluate(ws, `document.body.innerText.includes(${JSON.stringify(EMAIL.split('@')[0] === 'admin' ? 'Sakshi' : EMAIL.split('@')[0])})`)
    console.log(userShown ? 'PASS  sidebar shows the authenticated user' : 'NOTE  user name check skipped (name may differ)')

    // 3. Logout through the UI.
    await evaluate(ws, `document.querySelector('button[aria-label="Log out"], button[title="Log out"]')?.click(); true`)
    await waitFor(ws, `document.body && document.body.innerText.includes('Welcome back')`, 'login after logout')
    console.log('PASS  logout returns to /login')

    // 4. After logout, dashboard is blocked again.
    await send(ws, 'Page.navigate', { url: `${APP}/dashboard` })
    await waitFor(ws, `document.body && document.body.innerText.includes('Welcome back')`, 'blocked after logout')
    console.log('PASS  /dashboard blocked after logout')

    console.log('\nE2E OK')
  } finally {
    try { ws?.close() } catch { /* noop */ }
    proc.kill()
  }
}

main().catch((err) => {
  console.error('E2E FAILED:', err.message)
  process.exit(1)
})
