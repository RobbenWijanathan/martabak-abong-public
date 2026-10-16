import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const base = process.env.DEMO_URL || 'http://localhost:3000';
const shots = new URL('../docs/screenshots/', import.meta.url);

test('exported demo: full visitor workflow, downloads, persistence, reset and responsive layouts', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.DEMO_BROWSER_CHANNEL ? { channel: process.env.DEMO_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const requests = [], errors = [];
  context.on('request', request => requests.push(request.url()));
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  try {
    await mkdir(shots, { recursive: true });
    await page.goto(base); await page.locator('.order-card').first().waitFor();
    assert.equal(await page.locator('.order-card').count(), 6);
    await page.screenshot({ path: fileURLToPath(new URL('orders-mobile.png', shots)), fullPage: false });
    const seed = await page.evaluate(() => JSON.parse(localStorage.getItem('martabak-abong-public:v1')));
    assert.equal(seed.menus.length, 15);
    await page.getByRole('link', { name: 'Tambah', exact: true }).click();
    await page.getByLabel('Tambahkan menu').selectOption('2');
    const first = page.locator('.draft-item').first();
    await first.getByLabel('Tambah jumlah item 1').click();
    await first.getByLabel('Wijen', { exact: true }).uncheck();
    await first.getByLabel('Campur', { exact: true }).check();
    await first.getByText('Sesuaikan racikan', { exact: false }).click();
    const sliders = first.locator('input[type=range]');
    await sliders.nth(0).focus(); await sliders.nth(0).press('End');
    await sliders.nth(1).focus(); await sliders.nth(1).press('Home');
    await sliders.nth(2).focus(); await sliders.nth(2).press('Home'); await sliders.nth(2).press('ArrowRight');
    await first.getByLabel('Pandan', { exact: true }).check(); await first.getByLabel('Kering', { exact: true }).check();
    await first.getByLabel('Catatan tambahan', { exact: false }).fill('Sample order notes');
    await page.getByLabel('Tambahkan menu').selectOption('temporary');
    const temporary = page.locator('.draft-item').nth(1);
    await temporary.getByLabel('Nama menu', { exact: true }).fill('Sample banana cheese');
    await temporary.getByLabel('Harga per martabak (Rp)', { exact: true }).fill('45000');
    await page.getByLabel('Tambahkan menu').selectOption('3');
    await page.getByLabel('Nama pelanggan', { exact: true }).fill('Test visitor');
    await page.getByRole('button', { name: 'Simpan Pesanan', exact: true }).click();
    let card = page.locator('.order-card').filter({ hasText: 'Sample banana cheese' });
    await card.waitFor(); assert.match(await card.innerText(), /140\.000/);
    const editHref = await card.getByRole('link', { name: 'Ubah', exact: true }).getAttribute('href');
    const id = new URL(editHref, base).searchParams.get('id');
    await page.reload(); await card.waitFor(); assert.match(await card.innerText(), /2CK Campur Pandan/);
    await card.getByRole('link', { name: 'Ubah', exact: true }).click();
    await page.locator('.draft-item').nth(1).getByLabel('Harga per martabak (Rp)', { exact: true }).fill('47000');
    await page.getByLabel('Tambah jumlah item 2', { exact: true }).click();
    await page.getByRole('button', { name: 'Simpan Perubahan', exact: true }).click();
    await card.waitFor(); assert.match(await card.innerText(), /189\.000/);

    await card.getByRole('link', { name: 'Struk', exact: true }).click();
    await page.locator('.receipt').waitFor(); assert.match(await page.locator('.receipt').innerText(), /1\/2 CK 1\/2 Keju/);
    assert.ok(!(await page.locator('.receipt').innerText()).includes('Test visitor'));
    for (const paper of ['58', '80']) {
      await page.getByLabel('Lebar kertas').selectOption(paper);
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Unduh PNG' }).click();
      const download = await downloaded, path = await download.path(), contents = await readFile(path);
      assert.equal(contents.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.ok(contents.length > 1000);
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.no-print').first().isVisible(), false);
    assert.equal(await page.locator('.receipt').isVisible(), true);
    await page.emulateMedia({ media: 'screen' });
    // Exercise the print button while replacing only the operating system dialog.
    await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
    await page.getByRole('button', { name: 'Cetak struk' }).click();
    await page.waitForFunction(() => window.__printed === true);
    await page.reload(); await page.locator('.receipt').waitFor();
    await page.getByRole('link', { name: 'Kembali', exact: true }).click(); await card.waitFor();
    await card.getByLabel('Selesai', { exact: true }).check();
    await page.waitForFunction(orderId => document.querySelector(`a[href="/pesanan/?id=${orderId}"]`)?.closest('article')?.classList.contains('done'), id);
    const flags = await page.locator('.order-card').evaluateAll(cards => cards.map(card => card.classList.contains('done')));
    assert.ok(flags.slice(flags.indexOf(true)).every(Boolean));
    assert.ok(Number(await card.evaluate(card => getComputedStyle(card).opacity)) < 1);
    await card.getByLabel('Dibayar', { exact: true }).check();
    await card.getByLabel('Diambil', { exact: true }).click(); await card.waitFor({ state: 'detached' });
    await page.getByRole('link', { name: 'Riwayat', exact: true }).click(); await card.waitFor();
    const csvReady = page.waitForEvent('download'); await page.getByRole('button', { name: 'Unduh CSV' }).click();
    const csvFile = await (await csvReady).path(), csv = await readFile(csvFile, 'utf8');
    assert.ok(csv.includes('Sample banana cheese')); assert.ok(!csv.includes('Test visitor'));
    await page.screenshot({ path: fileURLToPath(new URL('history-mobile.png', shots)), fullPage: false });
    await page.getByRole('button', { name: 'Bulanan', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.sales-card strong')].every(e => e.textContent !== '…'));
    await page.screenshot({ path: fileURLToPath(new URL('sales-mobile.png', shots)), fullPage: false });
    assert.match(await page.locator('.sales-card').nth(1).innerText(), /Rp/);
    await page.getByRole('button', { name: 'Harian', exact: true }).click(); await card.waitFor();
    await card.getByRole('button', { name: 'Pulihkan' }).click(); await card.waitFor({ state: 'detached' });
    await page.getByRole('link', { name: 'Pesanan', exact: true }).click(); await card.waitFor();
    assert.equal(await card.getByLabel('Dibayar', { exact: true }).isChecked(), true);
    page.once('dialog', dialog => dialog.accept()); await card.getByRole('button', { name: 'Hapus', exact: true }).click();
    await card.waitFor({ state: 'detached' }); await page.reload(); await page.locator('.order-card').first().waitFor();
    assert.equal(await card.count(), 0);

    await page.getByRole('link', { name: 'Menu', exact: true }).click();
    const menuCard = page.locator('.menu-card').first();
    await menuCard.getByRole('button', { name: 'Ubah Coklat Kacang Wijen' }).click();
    await menuCard.getByLabel('Harga (Rp)', { exact: true }).fill('26000');
    await menuCard.getByLabel('Tersedia untuk dipesan').uncheck();
    await menuCard.getByRole('button', { name: 'Simpan menu' }).click();
    await page.reload(); await menuCard.getByText('Tidak tersedia', { exact: true }).waitFor();
    assert.match(await menuCard.innerText(), /26\.000/);
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Atur Ulang Demo', exact: true }).click();
    await page.waitForURL(base + '/'); await page.locator('.order-card').first().waitFor();
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('martabak-abong-public:v1')));
    assert.deepEqual(restored.menus, seed.menus); assert.equal(restored.orders.length, seed.orders.length);
    assert.equal(restored.dailyCounters[restored.orders.at(-1).orderDay], 8);
    assert.equal(await page.locator('.order-card').count(), 6);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok(await page.locator('.app-shell').evaluate(e => e.getBoundingClientRect().width <= 480));
      if (width === 1440) await page.screenshot({ path: fileURLToPath(new URL('orders-desktop.png', shots)), fullPage: false });
    }
    const independent = await browser.newContext(), otherPage = await independent.newPage(); await otherPage.goto(base);
    await otherPage.locator('.order-card').first().waitFor(); assert.equal(await otherPage.locator('.order-card').count(), 6); await independent.close();
    assert.deepEqual(errors, []);
    const external = requests.filter(url => /^https?:/.test(url) && new URL(url).origin !== new URL(base).origin);
    assert.deepEqual(external, []);
    assert.ok(requests.every(url => !/\/(api|login)(\/|\?|$)/.test(new URL(url).pathname)));
    await writeFile(new URL('../test-results/browser-summary.json', import.meta.url), JSON.stringify({ requests: requests.length, externalRequests: 0, apiRequests: 0, pageErrors: errors, viewports: [320, 390, 1440], pngDownloads: 2, csvDownload: true, print: true }, null, 2)).catch(async () => { await mkdir(new URL('../test-results/', import.meta.url), { recursive: true }); await writeFile(new URL('../test-results/browser-summary.json', import.meta.url), JSON.stringify({ requests: requests.length, externalRequests: 0, apiRequests: 0, pageErrors: errors, viewports: [320, 390, 1440], pngDownloads: 2, csvDownload: true, print: true }, null, 2)); });
  } finally { await context.close(); await browser.close(); }
});




