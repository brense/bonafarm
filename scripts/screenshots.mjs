#!/usr/bin/env node
/**
 * Takes screenshots of the app against the local emulators.
 *
 *   node scripts/screenshots.mjs --url http://localhost:5199 --out shots \
 *     --email rense@example.com --password geheim123 [--org tanthof]
 *
 * Uses the Playwright-managed Chromium already on disk (no download): pass
 * --chrome <path> or set CHROME_PATH; defaults to the newest ~/.cache/ms-playwright build.
 */
import { mkdirSync, readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]] : [])).filter((p) => p.length),
)
const URL = args.url ?? 'http://localhost:5199'
const OUT = args.out ?? 'shots'
const ORG = args.org ?? 'tanthof'
const PREFIX = args.prefix ?? ''

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  if (typeof args.chrome === 'string') return args.chrome
  const root = join(homedir(), '.cache', 'ms-playwright')
  const builds = readdirSync(root).filter((d) => d.startsWith('chromium-')).sort()
  for (const b of builds.reverse()) {
    const p = join(root, b, 'chrome-linux64', 'chrome')
    if (existsSync(p)) return p
    const q = join(root, b, 'chrome-linux', 'chrome')
    if (existsSync(q)) return q
  }
  throw new Error('No Chromium found; pass --chrome')
}

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: findChrome() })

const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }

async function shot(page, name) {
  await page.waitForTimeout(400)
  const file = join(OUT, `${PREFIX}${name}.png`)
  await page.screenshot({ path: file })
  console.log('saved', file)
}

async function signIn(page) {
  await page.getByLabel('E-mail').fill(args.email)
  await page.getByLabel('Wachtwoord').fill(args.password)
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
  await page.getByRole('navigation', { name: 'Hoofdmenu' }).waitFor({ timeout: 15000 })
}

for (const [label, ctxOpts] of [['phone', phone], ['desktop', desktop]]) {
  const context = await browser.newContext({ ...ctxOpts, locale: 'nl-NL', colorScheme: 'dark' })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()))
  await page.goto(`${URL}/?org=${ORG}`)
  await page.getByRole('button', { name: 'Inloggen', exact: true }).waitFor({ timeout: 15000 })
  await shot(page, `${label}-signin`)
  if (args.email) {
    await signIn(page)
    for (const tab of ['Voorraad', 'Levering', 'Muteren']) {
      const link = page.getByRole('navigation', { name: 'Hoofdmenu' }).getByText(tab, { exact: true })
      if ((await link.count()) === 0) continue
      await link.click()
      await page.getByRole('heading', { level: 1, name: tab }).waitFor()
      if (tab === 'Voorraad') await page.waitForSelector('[aria-label="Voorraad per voer"]', { timeout: 15000 }).catch(() => {})
      await shot(page, `${label}-${tab.toLowerCase()}`)
      if (tab === 'Voorraad') {
        const toggle = page.getByLabel('Besteladvies')
        if ((await toggle.count()) > 0) {
          await toggle.check()
          await page.locator('.MuiChip-root').first().waitFor({ timeout: 20000 })
          await page.waitForTimeout(300)
          await shot(page, `${label}-voorraad-advies`)
          await toggle.uncheck()
        }
      }
    }
    if (label === 'phone') {
      await page.getByRole('button', { name: 'Account' }).click()
      await shot(page, `${label}-account-menu`)
    }
  }
  await context.close()
}
await browser.close()
