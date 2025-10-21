import { test, expect, Browser } from '@playwright/test';
import { programmaticLogin } from './authHelper';

test.describe('Broadcast logout_all', () => {
  test('B3/D3: logout_all event logs out all tabs in same context', async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext();
    const page1 = await ctx.newPage();
    const page2 = await ctx.newPage();
    await programmaticLogin(page1, 'ADMIN');
    await programmaticLogin(page2, 'GIANG_VIEN');

    // Trigger broadcast from page1 (this will only auto-affect OTHER tabs via storage event)
    await page1.evaluate(() => {
      localStorage.setItem('tab_sync_event', JSON.stringify({ type: 'logout_all', ts: Date.now() }));
      // Actively clear own session (emitter does not receive storage event)
      const key = Object.keys(sessionStorage).find(k=>k.startsWith('tab_session_data_'));
      if (key) sessionStorage.removeItem(key);
    });

    // Emitter redirect
    await page1.goto('/');
    await page1.waitForURL(/login/, { timeout: 5000 });
    // Second tab should also be redirected after event
    await page2.goto('/');
    await page2.waitForURL(/login/, { timeout: 5000 });
    expect(page1.url()).toContain('/login');
    expect(page2.url()).toContain('/login');
    await ctx.close();
  });
});
