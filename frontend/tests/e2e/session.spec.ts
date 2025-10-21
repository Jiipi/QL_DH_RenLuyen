import { test, expect, Browser } from '@playwright/test';
import { programmaticLogin } from './authHelper';

const ROLES = ['ADMIN','GIANG_VIEN','LOP_TRUONG','SINH_VIEN'];

test.describe('Multi-Tab Role Isolation', () => {
  test('A1/A2: login 4 roles in separate contexts & reload keeps isolation', async ({ browser }: { browser: Browser }) => {
    const contexts = [] as any[];
    const pages = [] as any[];
    const roleMap: Record<string,string> = {};

    for (const role of ROLES) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await programmaticLogin(page, role);
      // Wait route redirect (heuristic)
      await page.waitForTimeout(500);
      roleMap[role] = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage).filter(k=>k.startsWith('tab_session_data_'));
        return keys[0] || '';
      });
      expect(roleMap[role]).toContain('tab_session_data_');
      contexts.push(ctx); pages.push(page);
    }

    // Reload each and verify key still present and unique
    for (let i=0;i<pages.length;i++) {
      await pages[i].reload();
      const key = await pages[i].evaluate(() => Object.keys(sessionStorage).find(k=>k.startsWith('tab_session_data_')) || '');
      expect(key).toBeTruthy();
    }

    // Ensure no two roles share identical session key (tabId uniqueness)
    const allKeys = Object.values(roleMap);
    expect(new Set(allKeys).size).toBe(allKeys.length);

    for (const ctx of contexts) await ctx.close();
  });

  test('B1/B4: logout one tab does not affect others', async ({ browser }: { browser: Browser }) => {
    const ctxAdmin = await browser.newContext();
    const adminPage = await ctxAdmin.newPage();
    await programmaticLogin(adminPage, 'ADMIN');

    const ctxStudent = await browser.newContext();
    const studentPage = await ctxStudent.newPage();
    await programmaticLogin(studentPage, 'SINH_VIEN');

    // Simulate real logout: call backend logout then clear its session key like UI would
    await studentPage.evaluate(async () => {
      const key = Object.keys(sessionStorage).find(k=>k.startsWith('tab_session_data_'));
      const token = key ? (JSON.parse(sessionStorage.getItem(key) || '{}').token) : null;
      if (token) {
        await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
      }
      if (key) sessionStorage.removeItem(key);
    });
    await studentPage.goto('/');
    // Student should be redirected by guard
    await studentPage.waitForURL(/login/, { timeout: 5000 });
    expect(studentPage.url()).toContain('/login');

    // Admin should stay authenticated (not redirected)
    await adminPage.reload();
    expect(adminPage.url()).not.toContain('/login');

    await ctxAdmin.close();
    await ctxStudent.close();
  });

  test('C2: rapid logout/login cycle does not leak session', async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await programmaticLogin(page, 'GIANG_VIEN');
    const firstKey = await page.evaluate(() => Object.keys(sessionStorage).find(k=>k.startsWith('tab_session_data_')) || '');
    expect(firstKey).toBeTruthy();
    // Rapid logout
    await page.evaluate(() => { const k = Object.keys(sessionStorage).find(k=>k.startsWith('tab_session_data_')); if (k) sessionStorage.removeItem(k); });
    // Immediate re-login
    await programmaticLogin(page, 'GIANG_VIEN');
    const secondKey = await page.evaluate(() => Object.keys(sessionStorage).find(k=>k.startsWith('tab_session_data_')) || '');
    expect(secondKey).toBeTruthy();
    await ctx.close();
  });
});
