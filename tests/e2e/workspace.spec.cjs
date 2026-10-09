const { test, expect } = require('@playwright/test')
const fs = require('node:fs/promises')
const path = require('node:path')
const KEY = 'recommendation-playground:v1'
const screenshots = path.resolve('artifacts/screenshots')
const scenarioNames = {
  cold: 'Cold start',
  slots: 'Slot enthusiast',
  live: 'Live casino player',
  mixed: 'Mixed player',
}
async function state(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY)
}
async function tab(page, name) {
  await page.getByRole('tab', { name, exact: true }).click()
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
}
async function demo(page, scenario = 'slots') {
  await page.goto('/players')
  await page.getByRole('button', { name: 'Load demo', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: scenarioNames[scenario], exact: false })
    .click()
  await expect(
    page.getByRole('heading', { name: scenarioNames[scenario], exact: true }),
  ).toBeVisible()
}
async function create(page, name = 'Test explorer') {
  await page.getByRole('button', { name: 'Add Player', exact: false }).click()
  await page.getByRole('dialog').getByLabel('Player name').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: 'Add Player', exact: true }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
}
async function newSimulation(page) {
  await tab(page, 'Simulation')
  const button = page.getByRole('button', { name: 'New simulation', exact: false })
  if (await button.count()) await button.click()
  await expect(page.getByRole('heading', { name: 'Run configuration', exact: true })).toBeVisible()
}
async function run(page, compare = false) {
  await page
    .getByRole('button', { name: compare ? 'Run and compare' : 'Run recommendation', exact: false })
    .click()
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  await expect(page.getByRole('button', { name: 'Delete simulation', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveCount(0)
}
async function openRunInfo(page) {
  await page.getByRole('button', { name: 'Simulation run details', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Simulation run details', exact: true }),
  ).toBeVisible()
}
async function screenshot(page, name, fullPage = true) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page
    .locator('.toast')
    .evaluateAll((nodes) => nodes.forEach((n) => (n.style.visibility = 'hidden')))
  await page.screenshot({ path: path.join(screenshots, name), fullPage })
}
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Players', exact: true })).toBeVisible()
})

test('Players list, name-only creation modal, redirect, rename and deletion', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await expect(page).toHaveURL(/\/players$/)
  await expect(
    page.locator('.topbar').getByRole('heading', { name: 'Players', exact: true }),
  ).toHaveCount(1)
  await expect(page.locator('.page h1')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Players/ }).first()).toBeVisible()
  await expect(page.locator('.players-table th')).toHaveText([
    'Name',
    'Bets',
    'Wins',
    'Last simulation run',
  ])
  await expect(page.getByRole('heading', { name: 'No players yet' })).toBeVisible()
  await screenshot(page, '01-empty-workspace.png')
  await page.getByRole('button', { name: 'Add Player', exact: false }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('input')).toHaveCount(1)
  await expect(dialog.getByLabel('Player name')).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Add Player', exact: true })).toBeDisabled()
  await screenshot(page, '10-player-creation-modal.png', false)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.players-table tbody tr')).toHaveCount(0)
  await create(page)
  await expect(page).toHaveURL(/\/players\/[^/]+\/general$/)
  await expect(
    page.locator('.topbar').getByRole('heading', { name: 'Test explorer', exact: true }),
  ).toHaveCount(1)
  await expect(page.locator('.player-page h1')).toHaveCount(0)
  await expect(page.locator('.player-page').getByRole('link', { name: /Players/ })).toHaveCount(0)
  await expect(
    page.locator('.topbar').getByRole('link', { name: 'Players', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'General info' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('tablist', { name: 'Player sections' }).getByRole('tab')).toHaveCount(
    3,
  )
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByLabel('New player name').fill('Renamed explorer')
  await page.getByRole('button', { name: 'Save name', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Renamed explorer', exact: true })).toBeVisible()
  await page.getByText('Favourite games', { exact: false }).click()
  await page.getByRole('checkbox', { name: /Amber Temple/ }).check()
  expect((await state(page)).players[0].favouriteGameIds).toEqual(['g01'])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Renamed explorer', exact: true })).toBeVisible()
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Renamed explorer', exact: true })).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page).toHaveURL(/\/players$/)
  await expect(page.getByRole('heading', { name: 'No players yet' })).toBeVisible()
  expect(errors).toEqual([])
})

test('player table totals and last simulation, row navigation and keyboard tabs', async ({
  page,
}) => {
  await demo(page)
  await screenshot(page, '12-player-general.png')
  await newSimulation(page)
  await run(page)
  const document = await state(page),
    player = document.players[0],
    firstRun = player.recommendationRuns[0]
  await page.goto('/players')
  const row = page.locator('.players-table tbody tr')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('606 bets')
  await expect(row).toContainText('606 win outcomes')
  await expect(row.locator('time')).toHaveAttribute('datetime', firstRun.createdAt)
  await screenshot(page, '11-players-table.png')
  await row.getByRole('link', { name: /Slot enthusiast/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/demo-slots\/general$/)
  await page.getByRole('tab', { name: 'General info' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Bets and Wins' })).toBeFocused()
  await expect(page).toHaveURL(/\/activity$/)
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'Simulation', exact: true })).toBeFocused()
  await expect(page).toHaveURL(/\/simulation$/)
  await page.reload()
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  await page.goto('/simulations')
  await expect(page).toHaveURL(/\/players$/)
})

test('Bets and Wins generates activity, corrects a round, rolls back and deletes batches', async ({
  page,
}) => {
  await create(page, 'Activity test')
  await tab(page, 'Bets and Wins')
  const section = page.locator('.workflow-section')
  await section.getByLabel('Rounds', { exact: true }).fill('20')
  await section.getByLabel('Sessions', { exact: true }).fill('2')
  await section.getByRole('button', { name: 'Preview batch', exact: false }).click()
  await expect(page.getByRole('heading', { name: 'Batch preview' })).toBeVisible()
  await screenshot(page, '02-batch-preview.png')
  await section.getByRole('button', { name: 'Confirm & add activity', exact: false }).click()
  await expect(page.locator('.rounds-table tbody tr')).toHaveCount(20)
  let document = await state(page)
  expect(document.players[0].bets.every((b) => b.amount >= 80 && b.amount <= 120)).toBeTruthy()
  await newSimulation(page)
  await run(page)
  await tab(page, 'Bets and Wins')
  await page
    .locator('.rounds-table tbody tr')
    .first()
    .getByRole('button', { name: /Edit round/ })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Bet amount', { exact: true })).toBeFocused()
  await dialog.getByLabel('Bet amount', { exact: true }).fill('99')
  await dialog.getByLabel('Win amount', { exact: true }).fill('75')
  await dialog.getByLabel('Rolled back').check()
  await dialog.getByRole('button', { name: 'Save correction' }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.rounds-table tbody tr').first()).toContainText('Rolled back')
  await tab(page, 'Simulation')
  await openRunInfo(page)
  await expect(page.getByText('Based on an older player state', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await newSimulation(page)
  await run(page)
  document = await state(page)
  expect(
    document.players[0].recommendationRuns.at(-1).dailyStats.reduce((n, s) => n + s.paidRounds, 0),
  ).toBe(19)
  await tab(page, 'Bets and Wins')
  if (!(await section.getAttribute('open'))) await section.locator('summary').first().click()
  page.once('dialog', (d) => d.accept())
  await section.getByRole('button', { name: /Delete batch Amber Temple/ }).click()
  await expect(page.locator('.rounds-table tbody tr')).toHaveCount(0)
  document = await state(page)
  expect(document.players[0].bets).toHaveLength(0)
  expect(document.players[0].wins).toHaveLength(0)
  expect(document.players[0].recommendationRuns).toHaveLength(2)
})

test('activity table paginates and a second player has an isolated history', async ({ page }) => {
  await demo(page)
  await tab(page, 'Bets and Wins')
  const section = page.locator('.workflow-section')
  await section.locator('summary').first().click()
  const batches = page.locator('.batch-history .batch-row')
  await expect(batches).toHaveCount(12)
  await expect(batches.first()).toContainText('2026-10-07')
  await expect(batches.last()).toContainText('2026-09-10')
  const originalBatches = (await state(page)).players[0].generationBatches
  await section.getByLabel('Rounds', { exact: true }).fill('1')
  await section.getByLabel('Sessions', { exact: true }).fill('1')
  for (const date of ['2026-10-01T12:00', '2026-10-09T12:00']) {
    await section.getByLabel('Start date & time (UTC)', { exact: true }).fill(date)
    await section.getByRole('button', { name: 'Preview batch', exact: false }).click()
    await section.getByRole('button', { name: 'Confirm & add activity', exact: false }).click()
    if (date.startsWith('2026-10-01')) {
      await expect(batches.first()).toContainText('2026-10-07')
      await expect(batches.last()).toContainText('2026-09-10')
    }
  }
  await expect(batches).toHaveCount(14)
  await expect(batches.first()).toContainText('2026-10-09')
  const dates = await batches.locator('div > span').allTextContents()
  expect(dates.map((text) => text.trim().slice(0, 10))).toEqual([
    '2026-10-09',
    '2026-10-07',
    '2026-10-06',
    '2026-10-05',
    '2026-10-04',
    '2026-10-01',
    '2026-09-25',
    '2026-09-24',
    '2026-09-23',
    '2026-09-22',
    '2026-09-13',
    '2026-09-12',
    '2026-09-11',
    '2026-09-10',
  ])
  expect((await state(page)).players[0].generationBatches.slice(0, 12)).toEqual(originalBatches)
  await page
    .locator('.batch-history')
    .screenshot({ path: path.join(screenshots, '23-newest-activity-batches.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .locator('.batch-history')
    .screenshot({ path: path.join(screenshots, '24-mobile-activity-batches.png') })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.reload()
  await section.locator('summary').first().click()
  await expect(batches.first()).toContainText('2026-10-09')
  await expect(batches.last()).toContainText('2026-09-10')
  await section.locator('summary').first().click()
  await expect(page.locator('.rounds-table tbody tr')).toHaveCount(50)
  await expect(page.getByText('Page 1 of 13', { exact: true })).toBeVisible()
  const first = await page.locator('.rounds-table tbody tr').first().textContent()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  expect(await page.locator('.rounds-table tbody tr').first().textContent()).not.toBe(first)
  await screenshot(page, '13-bets-wins.png')
  await page.goto('/players')
  await create(page, 'Empty player')
  await tab(page, 'Bets and Wins')
  await expect(page.locator('.rounds-table tbody tr')).toHaveCount(0)
  await page.goto('/players')
  await page
    .locator('.players-table')
    .getByRole('link', { name: /Slot enthusiast/ })
    .click()
  await tab(page, 'Bets and Wins')
  await expect(page.getByText('Page 1 of 13')).toBeVisible()
})

test('each simulation is a saved subtab, including cold start and old-state markers', async ({
  page,
}) => {
  await demo(page)
  await newSimulation(page)
  await run(page)
  const first = (await state(page)).players[0].recommendationRuns[0],
    url = page.url()
  await expect(page.getByRole('heading', { name: 'Familiar · 2', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Discovery · 6', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore · 2', exact: true })).toBeVisible()
  await screenshot(page, '03-personalized-results.png')
  await page.getByRole('button', { name: 'Why this game?', exact: false }).first().click()
  await page.getByRole('dialog').getByText('Technical calculation', { exact: true }).click()
  await expect(page.getByRole('dialog').locator('pre')).toContainText('originalScore')
  await page.getByRole('dialog').evaluate((d) => {
    d.scrollTop = 0
  })
  await screenshot(page, '04-recommendation-explanation.png', false)
  await page.keyboard.press('Escape')
  await newSimulation(page)
  await page.getByLabel('Run seed').fill('second-run')
  await run(page)
  await expect(page.getByRole('tablist', { name: 'Simulation runs' }).getByRole('tab')).toHaveCount(
    2,
  )
  await expect(page.getByRole('tab', { name: 'Run 2 · V2', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await screenshot(page, '14-simulation-runs.png')
  await page.getByRole('tab', { name: 'Run 1 · V2', exact: true }).click()
  await expect(page).toHaveURL(url)
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Run 1 · V2', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect((await state(page)).players[0].recommendationRuns[0]).toEqual(first)
  await page.locator('#engine-version').selectOption('v1-popularity')
  await expect(page.getByRole('tab', { name: 'Run 1 · V2', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await openRunInfo(page)
  await expect(page.getByRole('dialog').locator('.result-run-title')).toContainText(
    'Personalized Hybrid',
  )
  await page.keyboard.press('Escape')
  await tab(page, 'General info')
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await page.getByLabel('New player name').fill('Updated slots')
  await page.getByRole('button', { name: 'Save name' }).click()
  await tab(page, 'Simulation')
  await openRunInfo(page)
  await expect(page.getByText('Based on an older player state', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  expect((await state(page)).players[0].recommendationRuns[0]).toEqual(first)
  await demo(page, 'cold')
  await page.locator('#engine-version').selectOption('v2-hybrid-2-6-2')
  await newSimulation(page)
  await run(page)
  await openRunInfo(page)
  await expect(page.getByText('Not enough player history yet', { exact: false })).toBeVisible()
  await page.keyboard.press('Escape')
})

test('run overview is hidden behind the results info icon and follows the selected run', async ({
  page,
}) => {
  await demo(page)
  await newSimulation(page)
  await page.getByLabel('Run seed', { exact: true }).fill('original-run')
  await run(page)
  const first = (await state(page)).players[0].recommendationRuns[0]
  const info = page.getByRole('button', { name: 'Simulation run details', exact: true })
  await expect(page.locator('.results-heading').getByRole('button')).toHaveAttribute(
    'aria-haspopup',
    'dialog',
  )
  await expect(page.locator('.result-overview')).toHaveCount(0)
  await expect(page.getByText(first.summary, { exact: true })).toHaveCount(0)
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  await info.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Simulation run details', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(first.playerName)
  await expect(dialog).toContainText('Personalized Hybrid 2+6+2')
  await expect(dialog).toContainText(`v${first.engineVersion}`)
  await expect(dialog).toContainText(first.summary)
  await expect(dialog).toContainText('Seed: original-run')
  await expect(dialog).toContainText(first.asOf.slice(0, 16).replace('T', ' '))
  await expect(dialog).toContainText(`Snapshot ${first.inputFingerprint.slice(0, 8)}`)
  await expect(dialog.getByRole('button', { name: 'Close dialog', exact: true })).toBeFocused()
  await screenshot(page, '21-simulation-run-info.png', false)
  await page.keyboard.press('Tab')
  await expect(dialog.locator('summary')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close dialog', exact: true })).toBeFocused()
  await dialog.locator('summary').click()
  await expect(dialog.locator('pre')).toHaveText(JSON.stringify(first.engineConfig, null, 2))
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(info).toBeFocused()
  await newSimulation(page)
  await page.getByLabel('Run seed', { exact: true }).fill('second-run')
  await run(page)
  await openRunInfo(page)
  await expect(dialog).toContainText('Seed: second-run')
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await page.getByRole('tab', { name: 'Run 1 · V2', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await openRunInfo(page)
  await expect(dialog).toContainText('Seed: original-run')
  await expect(dialog.locator('details')).not.toHaveAttribute('open', '')
  await screenshot(page, '22-mobile-simulation-run-info.png', false)
  await dialog.locator('summary').click()
  expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBeTruthy()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.mouse.click(2, 2)
  await expect(dialog).toHaveCount(0)
  await expect(info).toBeFocused()
  expect((await state(page)).players[0].recommendationRuns[0]).toEqual(first)
})

test('comparison creates two run subtabs and uses identical snapshots', async ({ page }) => {
  await demo(page)
  await newSimulation(page)
  await page.getByLabel('Compare with', { exact: true }).selectOption('v1-popularity')
  await run(page, true)
  const runs = (await state(page)).players[0].recommendationRuns
  expect(runs).toHaveLength(2)
  expect(runs[0].inputFingerprint).toBe(runs[1].inputFingerprint)
  await expect(page.getByText('Identical inputs verified', { exact: true })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Simulation runs' }).getByRole('tab')).toHaveCount(
    2,
  )
  await page
    .locator('.toast')
    .evaluateAll((nodes) => nodes.forEach((n) => (n.style.visibility = 'hidden')))
  await page
    .locator('.comparison-panel')
    .screenshot({ path: path.join(screenshots, '05-engine-comparison.png') })
  await page.locator('.comparison-table td:nth-child(3) button').first().click()
  await expect(page.getByRole('dialog')).toContainText('V1 · Popularity Baseline')
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Run 2 · V1', exact: true }).click()
  await openRunInfo(page)
  await expect(page.getByRole('dialog').locator('.result-run-title')).toContainText(
    'Popularity Baseline',
  )
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Run 1 · V2', exact: true }).click()
  await expect(page.getByText('Identical inputs verified', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Identical inputs verified', { exact: true })).toBeVisible()
})

test('simulation deletion cancels, removes comparisons and selects the next run or new draft', async ({
  page,
}) => {
  await demo(page)
  await newSimulation(page)
  await page.getByLabel('Compare with', { exact: true }).selectOption('v1-popularity')
  await run(page, true)
  const before = (await state(page)).players[0]
  const tabs = page.getByRole('tablist', { name: 'Simulation runs' })
  await expect(tabs.getByRole('tab')).toHaveText(['Run 2 · V1', 'Run 1 · V2'])
  await expect(page.getByRole('heading', { name: 'Simulation', exact: true })).toHaveCount(0)
  page.once('dialog', (dialog) => dialog.dismiss())
  await tabs.getByRole('button', { name: 'Delete simulation Run 1 · V2', exact: true }).click()
  await expect(tabs.getByRole('tab')).toHaveCount(2)
  expect((await state(page)).players[0].recommendationRuns).toEqual(before.recommendationRuns)
  page.once('dialog', (dialog) => dialog.accept())
  await tabs.getByRole('button', { name: 'Delete simulation Run 2 · V1', exact: true }).click()
  await expect(tabs.getByRole('tab')).toHaveText(['Run 1 · V2'])
  await expect(page).toHaveURL(/compare=none/)
  await expect(page.locator('.comparison-panel')).toHaveCount(0)
  await newSimulation(page)
  await run(page)
  await expect(tabs.getByRole('tab')).toHaveText(['Run 2 · V2', 'Run 1 · V2'])
  page.once('dialog', (dialog) => dialog.accept())
  await tabs.getByRole('button', { name: 'Delete simulation Run 2 · V2', exact: true }).click()
  await expect(tabs.getByRole('tab', { name: 'Run 1 · V2', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(tabs.getByRole('tab')).toBeFocused()
  page.once('dialog', (dialog) => dialog.accept())
  await tabs.getByRole('button', { name: 'Delete simulation Run 1 · V2', exact: true }).click()
  await expect(tabs).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Run configuration', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New simulation', exact: false })).toBeFocused()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Run configuration', exact: true })).toBeVisible()
  const after = (await state(page)).players[0]
  expect(after.recommendationRuns).toHaveLength(0)
  expect(after.bets).toEqual(before.bets)
  expect(after.wins).toEqual(before.wins)
  expect(after.favouriteGameIds).toEqual(before.favouriteGameIds)
})

test('many run subtabs stay in a scrollable row with the new button on the left', async ({
  page,
}) => {
  await demo(page, 'cold')
  for (let i = 0; i < 16; i++) {
    await newSimulation(page)
    await run(page)
  }
  const tabs = page.getByRole('tablist', { name: 'Simulation runs' })
  await expect(tabs.getByRole('tab').first()).toHaveText('Run 16 · V2')
  async function checkRow() {
    const geometry = await tabs.evaluate((bar) => {
      const items = [...bar.querySelectorAll('[role="tab"]')]
      const button = document.getElementById('new-simulation-button').getBoundingClientRect()
      return {
        overflowing: bar.scrollWidth > bar.clientWidth,
        sameRow: items.every((item) => item.offsetTop === items[0].offsetTop),
        buttonLeft: button.right <= bar.getBoundingClientRect().left,
        pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      }
    })
    expect(geometry).toEqual({ overflowing: true, sameRow: true, buttonLeft: true, pageFits: true })
    await tabs.getByRole('tab').first().focus()
    await page.keyboard.press('End')
    await expect(tabs.getByRole('tab').last()).toBeFocused()
    await expect.poll(() => tabs.evaluate((bar) => bar.scrollLeft)).toBeGreaterThan(0)
    const visible = await tabs
      .getByRole('tab')
      .last()
      .evaluate((tab) => {
        const item = tab.parentElement.getBoundingClientRect()
        const bar = tab.closest('[role="tablist"]').getBoundingClientRect()
        return item.left >= bar.left - 1 && item.right <= bar.right + 1
      })
    expect(visible).toBeTruthy()
    await page.keyboard.press('Home')
    await expect(tabs.getByRole('tab').first()).toBeFocused()
    await expect.poll(() => tabs.evaluate((bar) => bar.scrollLeft)).toBe(0)
  }
  await checkRow()
  await screenshot(page, '15-scrollable-simulation-tabs.png', false)
  await page.setViewportSize({ width: 390, height: 844 })
  await checkRow()
  await screenshot(page, '16-mobile-run-tabs.png', false)
  // Older exports have no display numbers; deleting an old run must not renumber the rest.
  await page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key))
    saved.players[0].recommendationRuns.forEach((result) => delete result.sequence)
    localStorage.setItem(key, JSON.stringify(saved))
  }, KEY)
  await page.reload()
  await expect(tabs.getByRole('tab')).toHaveCount(16)
  await expect(tabs.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true')
  page.once('dialog', (dialog) => dialog.accept())
  await tabs.getByRole('button', { name: 'Delete simulation Run 1 · V2', exact: true }).click()
  await expect(tabs.getByRole('tab')).toHaveCount(15)
  await expect(tabs.getByRole('tab').first()).toHaveText('Run 16 · V2')
  await expect(tabs.getByRole('tab').last()).toHaveText('Run 2 · V2')
  await page.reload()
  await expect(tabs.getByRole('tab').first()).toHaveText('Run 16 · V2')
  await newSimulation(page)
  await run(page)
  await expect(tabs.getByRole('tab').first()).toHaveText('Run 17 · V2')
})

test('every advanced formula value has an accessible explanation and a practical example', async ({
  page,
}) => {
  await demo(page)
  await newSimulation(page)
  await page.locator('.formula-panel summary').click()
  const before = (await state(page)).settings.configs
  await expect(page.locator('.formula-fields .formula-info-button')).toHaveCount(24)
  await screenshot(page, '17-advanced-formula-legends.png')
  async function checkEveryField() {
    const fields = page.locator('.formula-fields .formula-field')
    for (let index = 0; index < (await fields.count()); index++) {
      const field = fields.nth(index)
      const input = field.locator('input')
      const value = await input.inputValue()
      const button = field.getByRole('button')
      await button.click()
      const legend = page.getByRole('dialog')
      await expect(legend).toBeVisible()
      await expect(legend.locator('.modal-body > p').first()).not.toHaveText(
        /Adjust .* in the calculation/,
      )
      await expect(legend.locator('.formula-example p')).not.toBeEmpty()
      await expect(legend.locator('.formula-help-note')).not.toBeEmpty()
      await expect(legend.locator('.formula-help-limits dd')).toHaveCount(2)
      await page.keyboard.press('Escape')
      await expect(legend).toHaveCount(0)
      await expect(button).toBeFocused()
      await expect(input).toHaveValue(value)
    }
  }
  await checkEveryField()
  const halfLife = page.getByRole('button', {
    name: 'About History: Recency half-life (days)',
    exact: true,
  })
  await halfLife.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toContainText(
    'half strength after 30 days and quarter strength after 60 days',
  )
  await screenshot(page, '18-formula-legend.png', false)
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await expect(halfLife).toBeFocused()
  for (const name of ['Saved presets', 'Preset name']) {
    await page.getByRole('button', { name: `About ${name}`, exact: true }).click()
    await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible()
    await expect(page.getByRole('dialog').locator('.formula-example p')).not.toBeEmpty()
    await page.keyboard.press('Escape')
  }
  expect((await state(page)).settings.configs).toEqual(before)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'About History: Similarity penalty', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('0.80 − (0.15 × 0.60) = 0.71')
  expect(
    await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  ).toBeTruthy()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await screenshot(page, '19-mobile-formula-legend.png', false)
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('#engine-version').selectOption('v1-popularity')
  await expect(page.locator('.formula-panel')).toHaveAttribute('open', '')
  await expect(page.locator('.formula-fields .formula-info-button')).toHaveCount(5)
  await checkEveryField()
  await page.getByRole('button', { name: 'About Baseline: Top boost', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'both Featured and Top gets both separate boosts',
  )
  await page.keyboard.press('Escape')
  await screenshot(page, '20-baseline-formula-legends.png')
  expect((await state(page)).settings.configs).toEqual(before)
})

test('formula validation, presets and immutable run configuration', async ({ page }) => {
  await demo(page)
  await newSimulation(page)
  await page.locator('.formula-panel summary').click()
  await page.getByLabel('Category match', { exact: true }).fill('0.5')
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Restore defaults' }).click()
  await page.getByLabel('Recency half-life (days)', { exact: true }).fill('45')
  await page.getByLabel('Preset name', { exact: true }).fill('Longer memory')
  await page.getByRole('button', { name: 'Save preset' }).click()
  await run(page)
  const data = await state(page)
  expect(data.presets).toHaveLength(1)
  expect(data.players[0].recommendationRuns[0].engineConfig.halfLife).toBe(45)
  await newSimulation(page)
  await page.locator('.formula-panel summary').click()
  await page.getByRole('button', { name: 'Restore defaults' }).click()
  expect((await state(page)).settings.configs['v2-hybrid-2-6-2'].halfLife).toBe(30)
  await page.getByLabel('Saved presets', { exact: true }).selectOption(data.presets[0].id)
  await expect(page.getByLabel('Recency half-life (days)', { exact: true })).toHaveValue('45')
  await page.reload()
  await page.locator('.formula-panel summary').click()
  await expect(page.getByLabel('Recency half-life (days)', { exact: true })).toHaveValue('45')
})

test('export, reset, import and invalid import preserve players and run tabs', async ({ page }) => {
  await demo(page, 'live')
  await newSimulation(page)
  await run(page)
  const before = await state(page),
    runId = before.players[0].recommendationRuns[0].id
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON', exact: false }).click()
  const download = await downloading,
    raw = await fs.readFile(await download.path(), 'utf8')
  expect(JSON.parse(raw)).toEqual(before)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page).toHaveURL(/\/players$/)
  await expect(page.locator('.players-table tbody tr')).toHaveCount(0)
  page.once('dialog', (d) => d.accept())
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'restore.json', mimeType: 'application/json', buffer: Buffer.from(raw) })
  await expect(page.locator('.players-table tbody tr')).toHaveCount(1)
  expect(await state(page)).toEqual(before)
  await page.goto(`/players/demo-live/simulation?run=${runId}`)
  await expect(page.getByRole('tab', { name: 'Run 1 · V2', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
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
})

test('catalogue filters, sorting and details remain available from Players', async ({ page }) => {
  await page.getByRole('link', { name: 'Game catalogue', exact: false }).click()
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

test('all demo scenarios and simulation work offline with no external requests', async ({
  page,
}) => {
  const external = []
  page.on('request', (req) => {
    if (/^https?:/.test(req.url()) && !req.url().startsWith('http://localhost:8080'))
      external.push(req.url())
  })
  for (const id of ['cold', 'slots', 'live', 'mixed']) {
    await demo(page, id)
    await newSimulation(page)
    await run(page)
  }
  expect((await state(page)).players).toHaveLength(4)
  expect(external).toEqual([])
  await page.context().setOffline(true)
  await newSimulation(page)
  await run(page)
  expect((await state(page)).players.at(-1).recommendationRuns).toHaveLength(2)
})

test('mobile/tablet layouts, navigation, modal and run tab keyboard access', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await create(page, 'Mobile player')
  await page.getByRole('tab', { name: 'General info' }).focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'Simulation', exact: true })).toBeFocused()
  await run(page)
  await screenshot(page, '07-mobile-simulations.png')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.getByRole('button', { name: 'Why this game?', exact: false }).first().click()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close details' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('dialog').locator('summary')).toBeFocused()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: /Game catalogue/ }).click()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await screenshot(page, '08-mobile-catalogue.png')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: /Players/ }).click()
  await expect(page.getByRole('heading', { name: 'Players', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.setViewportSize({ width: 820, height: 1180 })
  await page
    .locator('.players-table')
    .getByRole('link', { name: /Mobile player/ })
    .click()
  await tab(page, 'Simulation')
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
  await screenshot(page, '09-tablet-simulations.png')
})

test('recoverable storage errors, unknown players and invalid draft persistence', async ({
  page,
}) => {
  await page.goto('/players/missing/general')
  await expect(page.getByRole('heading', { name: 'Player not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Players' }).click()
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), KEY)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Saved data could not be loaded')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('alert')).not.toBeVisible()
  await demo(page)
  await newSimulation(page)
  await page.locator('.formula-panel summary').click()
  await page.getByLabel('Category match', { exact: true }).fill('0.9')
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  expect((await state(page)).settings.configs['v2-hybrid-2-6-2'].categoryWeight).toBe(0.3)
  await page.getByLabel('Run seed').fill('')
  await page.getByLabel('Run seed').blur()
  await page.reload()
  await expect(page.getByRole('alert')).not.toBeVisible()
  expect((await state(page)).players[0].bets).toHaveLength(606)
  await expect(
    page.getByRole('button', { name: 'Run recommendation', exact: false }),
  ).toBeDisabled()
  await page.getByLabel('Run seed').fill('restored')
  await run(page)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await newSimulation(page)
  await page.getByLabel('Run seed').fill('quota-test')
  await page.getByLabel('Run seed').blur()
  await expect(page.getByRole('alert')).toContainText('Local data could not be saved')
  await run(page)
  await expect(page.locator('.recommendation-card')).toHaveCount(10)
})
