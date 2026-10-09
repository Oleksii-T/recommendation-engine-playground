const { test, expect } = require('@playwright/test')
const fs = require('node:fs/promises')
const path = require('node:path')
const KEY = 'recommendation-playground:v1'
const screenshots = path.resolve('artifacts/screenshots')
async function state(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY)
}
async function demo(page, scenario = 'slots') {
  await page.locator('#demo-scenario').selectOption(scenario)
  await page.getByRole('button', { name: 'Load demo', exact: false }).click()
  await expect(page.getByLabel('Selected player')).toHaveValue(`demo-${scenario}`)
}
async function run(page, compare = false) {
  await page
    .getByRole('button', { name: compare ? 'Run and compare' : 'Run recommendation', exact: false })
    .click()
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
}
async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page
    .locator('.toast')
    .evaluateAll((nodes) => nodes.forEach((n) => (n.style.visibility = 'hidden')))
  await page.screenshot({
    path: path.join(screenshots, name),
    fullPage: name !== '04-recommendation-explanation.png',
  })
}
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Simulations.' })).toBeVisible()
})
test('empty workspace, player CRUD, keyboard navigation and cold start', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await expect(page).toHaveURL(/\/simulations$/)
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  await screenshot(page, '01-empty-workspace.png')
  await page.getByRole('button', { name: 'Create player', exact: false }).click()
  await page.getByLabel('Player name', { exact: true }).fill('Test explorer')
  await page.getByRole('button', { name: 'Save player', exact: true }).click()
  await expect(page.getByLabel('Selected player')).toContainText('Test explorer')
  await run(page)
  await expect(page.getByText('Not enough player history yet', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByLabel('New player name').fill('Renamed explorer')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await expect(page.getByLabel('Selected player')).toContainText('Renamed explorer')
  await expect(page.getByText('Based on an older player state', { exact: true })).toBeVisible()
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByLabel('Selected player')).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No players yet' })).toBeVisible()
  expect(errors).toEqual([])
})
test('generate preview, confirm batch, correct a round, rollback and delete batch', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Create player', exact: false }).click()
  await page.getByLabel('Player name', { exact: true }).fill('Activity test')
  await page.getByRole('button', { name: 'Save player', exact: true }).click()
  const section = page.locator('.workflow-section')
  await section.getByLabel('Rounds', { exact: true }).fill('20')
  await section.getByLabel('Sessions', { exact: true }).fill('2')
  await section.getByRole('button', { name: 'Preview batch', exact: false }).click()
  await expect(page.getByRole('heading', { name: 'Batch preview', exact: true })).toBeVisible()
  await screenshot(page, '02-batch-preview.png')
  await section.getByRole('button', { name: 'Confirm & add activity', exact: false }).click()
  let data = await state(page),
    player = data.players[0]
  expect(player.bets).toHaveLength(20)
  expect(player.wins).toHaveLength(20)
  expect(player.bets.every((b) => b.amount >= 80 && b.amount <= 120)).toBeTruthy()
  await run(page)
  if (!(await section.getAttribute('open'))) await section.locator('summary').first().click()
  await section.getByRole('button', { name: 'Inspect rounds', exact: false }).click()
  await page.getByRole('button', { name: 'Edit round 1', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Bet amount', { exact: true }).fill('99')
  await dialog.getByLabel('Win amount', { exact: true }).fill('75')
  await dialog.getByLabel('Rolled back').check()
  await dialog.getByRole('button', { name: 'Save correction', exact: true }).click()
  await expect(dialog.getByText('Rolled back', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Based on an older player state', { exact: true })).toBeVisible()
  await run(page)
  data = await state(page)
  player = data.players[0]
  expect(player.bets[0].amount).toBe(99)
  expect(player.wins[0].amount).toBe(75)
  expect(player.recommendationRuns.at(-1).dailyStats.reduce((n, s) => n + s.paidRounds, 0)).toBe(19)
  page.once('dialog', (d) => d.accept())
  await section.getByRole('button', { name: /Delete batch Amber Temple/ }).click()
  data = await state(page)
  expect(data.players[0].bets).toHaveLength(0)
  expect(data.players[0].wins).toHaveLength(0)
  expect(data.players[0].recommendationRuns).toHaveLength(2)
})
test('V2 composition, taste profile, score explanation and technical trace', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await demo(page)
  await run(page)
  await expect(page.getByRole('heading', { name: 'Familiar · 2', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Discovery · 6', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore · 2', exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Player taste profile', exact: true }),
  ).toBeVisible()
  await screenshot(page, '03-personalized-results.png')
  await page.getByRole('button', { name: 'Why this game?', exact: false }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'What contributed to this score', exact: true }),
  ).toBeVisible()
  await page.getByRole('dialog').getByText('Technical calculation', { exact: true }).click()
  await expect(page.getByRole('dialog').locator('pre')).toContainText('originalScore')
  await page.getByRole('dialog').evaluate((d) => {
    d.scrollTop = 0
  })
  await screenshot(page, '04-recommendation-explanation.png')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'View all preferences', exact: false }).click()
  await expect(page.getByRole('dialog')).toContainText('Themes and features may overlap')
  await page.keyboard.press('Escape')
  await page.getByText('Calculation details', { exact: false }).first().click()
  await expect(page.locator('.calculation-panel tbody tr')).toHaveCount(12)
  await page.reload()
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  expect(errors).toEqual([])
})
test('comparison runs share fingerprint and show rank differences and metrics', async ({
  page,
}) => {
  await demo(page)
  await page.getByLabel('Compare with', { exact: true }).selectOption('v1-popularity')
  await run(page, true)
  await expect(page.getByText('Identical inputs verified', { exact: true })).toBeVisible()
  const data = await state(page),
    runs = data.players[0].recommendationRuns
  expect(runs).toHaveLength(2)
  expect(runs[0].inputFingerprint).toBe(runs[1].inputFingerprint)
  expect(runs[0].seed).toBe(runs[1].seed)
  expect(runs[0].platform).toBe(runs[1].platform)
  await page
    .locator('.toast')
    .evaluateAll((nodes) => nodes.forEach((n) => (n.style.visibility = 'hidden')))
  await page
    .locator('.comparison-panel')
    .screenshot({ path: path.join(screenshots, '05-engine-comparison.png') })
  await page.locator('.comparison-table td:nth-child(3) button').first().click()
  await expect(page.getByRole('dialog')).toContainText('V1 · Popularity Baseline')
  await page.keyboard.press('Escape')
  await page.locator('#engine-version').selectOption('v1-popularity')
  await expect(page.locator('.result-run-title')).toContainText('Popularity Baseline')
  await page.getByLabel('Compare with', { exact: true }).selectOption('v2-hybrid-2-6-2')
  await expect(page.getByText('Identical inputs verified', { exact: true })).toBeVisible()
})
test('formula validation, presets, saved configuration and defaults', async ({ page }) => {
  await demo(page)
  await page.locator('.formula-panel summary').click()
  await page.getByLabel('Category match', { exact: true }).fill('0.5')
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  await expect(
    page.getByText('Content match weights must total 1', { exact: false }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Run recommendation', exact: false })).toBeEnabled()
  await page.getByLabel('Recency half-life (days)', { exact: true }).fill('45')
  await page.getByLabel('Preset name', { exact: true }).fill('Longer memory')
  await page.getByRole('button', { name: 'Save preset', exact: true }).click()
  await run(page)
  let data = await state(page)
  expect(data.presets).toHaveLength(1)
  expect(data.players[0].recommendationRuns[0].engineConfig.halfLife).toBe(45)
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click()
  expect((await state(page)).settings.configs['v2-hybrid-2-6-2'].halfLife).toBe(30)
  await page.getByLabel('Saved presets', { exact: true }).selectOption(data.presets[0].id)
  await expect(page.getByLabel('Recency half-life (days)', { exact: true })).toHaveValue('45')
  await page.reload()
  await page.locator('.formula-panel summary').click()
  await expect(page.getByLabel('Recency half-life (days)', { exact: true })).toHaveValue('45')
})
test('export, reset, import, reload and invalid import are atomic', async ({ page }) => {
  await demo(page, 'live')
  await run(page)
  const before = await state(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON', exact: false }).click()
  const download = await downloadPromise
  const raw = await fs.readFile(await download.path(), 'utf8')
  expect(JSON.parse(raw)).toEqual(before)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No players yet' })).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'restore.json', mimeType: 'application/json', buffer: Buffer.from(raw) })
  await expect(page.getByLabel('Selected player')).toHaveValue('demo-live')
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  expect(await state(page)).toEqual(before)
  await page.reload()
  expect(await state(page)).toEqual(before)
  page.once('dialog', (d) => d.accept())
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":1,"players":[]}'),
  })
  await expect(page.getByRole('alert')).toContainText('Import failed')
  expect(await state(page)).toEqual(before)
  page.once('dialog', (d) => d.accept())
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  })
  await expect(page.getByRole('alert')).toContainText('Import failed')
  expect(await state(page)).toEqual(before)
})
test('catalogue searching, all filter types, sorting and detail metadata', async ({ page }) => {
  await page.getByRole('link', { name: 'Game catalogue', exact: false }).click()
  await expect(page).toHaveURL(/\/games$/)
  await expect(page.locator('.games-table tbody tr')).toHaveCount(32)
  await screenshot(page, '06-game-catalogue.png')
  await page.getByRole('textbox', { name: 'Search games' }).fill('amber-temple')
  await expect(page.locator('.games-table tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: /Amber Temple amber-temple/ }).click()
  await expect(page.getByRole('dialog')).toContainText('mock-1001')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
  await page.getByLabel('Providers', { exact: true }).selectOption('Evolution')
  await expect(page.locator('.games-table tbody tr')).toHaveCount(3)
  await page.getByLabel('Categories', { exact: true }).selectOption('Live Roulette')
  await expect(page.locator('.games-table tbody tr')).toHaveCount(1)
  await page.getByLabel('Status', { exact: true }).selectOption('disabled')
  await expect(page.locator('.games-table tbody tr')).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
  await page.getByLabel('Platforms', { exact: true }).selectOption('mobile')
  await page.getByLabel('Themes', { exact: true }).selectOption('Egyptian')
  await page.getByLabel('Features', { exact: true }).selectOption('Free Spins')
  await expect(page.locator('.games-table tbody tr')).toHaveCount(5)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
  await page.getByLabel('Sort games', { exact: true }).selectOption('weekly_session_count')
  await page.getByRole('button', { name: 'Sort descending', exact: true }).click()
  await expect(page.locator('.games-table tbody tr').first()).toContainText('Ancient Vault')
})
test('all built-in scenarios run and offline page makes no external requests', async ({ page }) => {
  const external = []
  page.on('request', (req) => {
    if (/^https?:/.test(req.url()) && !req.url().startsWith('http://localhost:8080'))
      external.push(req.url())
  })
  for (const id of ['cold', 'slots', 'live', 'mixed']) {
    await demo(page, id)
    await run(page)
    await expect(page.locator('.recommendation-card')).toHaveCount(10)
  }
  expect((await state(page)).players).toHaveLength(4)
  expect(external).toEqual([])
  await page.context().setOffline(true)
  await run(page)
  expect((await state(page)).players.at(-1).recommendationRuns).toHaveLength(2)
})
test('mobile and tablet layouts, navigation drawer and explanation focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await demo(page)
  await run(page)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await screenshot(page, '07-mobile-simulations.png')
  await page.getByRole('button', { name: 'Why this game?', exact: false }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close details', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('dialog').locator('summary')).toBeFocused()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.getByRole('link', { name: 'Game catalogue', exact: false }).click()
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await screenshot(page, '08-mobile-catalogue.png')
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.getByRole('link', { name: 'Simulations', exact: false }).click()
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await screenshot(page, '09-tablet-simulations.png')
})
test('corrupt local storage and quota errors show recoverable warnings', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), KEY)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Saved data could not be loaded')
  await expect(page.getByRole('button', { name: 'Export stored file', exact: true })).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('alert')).not.toBeVisible()
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await demo(page)
  await expect(page.getByRole('alert')).toContainText('Local data could not be saved')
  await run(page)
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
})

test('invalid formula drafts and an empty seed do not damage reloadable player data', async ({
  page,
}) => {
  await demo(page)
  await page.locator('.formula-panel summary').click()
  await page.getByLabel('Category match', { exact: true }).fill('0.9')
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByLabel('New player name').fill('Preserved slot player')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  expect((await state(page)).settings.configs['v2-hybrid-2-6-2'].categoryWeight).toBe(0.3)
  await page.getByLabel('Run seed', { exact: true }).fill('')
  await page.getByLabel('Run seed', { exact: true }).blur()
  await page.reload()
  await expect(page.getByRole('alert')).not.toBeVisible()
  await expect(page.getByLabel('Selected player')).toContainText('Preserved slot player')
  expect((await state(page)).players[0].bets).toHaveLength(606)
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  await page.getByLabel('Run seed', { exact: true }).fill('restored-seed')
  await run(page)
})
