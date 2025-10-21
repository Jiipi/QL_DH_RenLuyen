import { request, Page, expect } from '@playwright/test';

interface DemoAccount { username: string; email?: string; password?: string; role?: string; roleCode?: string; }

interface LoginResult { token: string; user: any; role: string; }

const api = () => process.env.E2E_API_URL || 'http://localhost:3001/api';

export async function fetchDemoAccounts() {
  const ctx = await request.newContext();
  // Ensure baseline demo accounts exist (idempotent in dev)
  await ctx.post(`${api()}/auth/demo-ensure`).catch(()=>{});
  const res = await ctx.get(`${api()}/auth/demo-accounts`);
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  const arr = (data?.data || data || []) as DemoAccount[];
  await ctx.dispose();
  return arr;
}

function normalizeRole(r?: string) {
  return (r || '').toString().toUpperCase();
}

const ROLE_USERNAME_MAP: Record<string,string[]> = {
  'ADMIN': ['admin'],
  'GIANG_VIEN': ['gv001','gv1'],
  'LOP_TRUONG': ['lt001'],
  'SINH_VIEN': ['2021003','sv000001','sv000013']
};

const ROLE_SYNONYMS: Record<string,string[]> = {
  'ADMIN': ['ADMIN','QUAN_TRI','QUAN_TRI_VIEN','admin'] as string[],
  'GIANG_VIEN': ['GIANG_VIEN','TEACHER','GV','giang_vien','teacher'] as string[],
  'LOP_TRUONG': ['LOP_TRUONG','MONITOR','LT','lop_truong','monitor'] as string[],
  'SINH_VIEN': ['SINH_VIEN','STUDENT','SV','sinh_vien','student'] as string[]
};

export async function loginByAPI(role: string): Promise<LoginResult> {
  const accounts = await fetchDemoAccounts();
  const desired = normalizeRole(role);
  const roleSyns = new Set((ROLE_SYNONYMS[desired] || [desired]).map(s => s.toUpperCase()));
  // Prefer matching by role/roleCode first
  let target = accounts.find(a => roleSyns.has(normalizeRole(a.role)) || roleSyns.has(normalizeRole(a.roleCode)));
  if (!target) {
    const candidates = ROLE_USERNAME_MAP[desired] || [];
    target = accounts.find(a => candidates.includes(a.username));
  }
  if (!target) throw new Error(`No demo account available for role ${role}. Accounts received: ${accounts.map(a=>`${a.username}:${a.role||a.roleCode||''}`).join(', ')}`);
  if (!target.password) throw new Error(`Demo account missing password for ${target.username}`);

  const ctx = await request.newContext();
  const res = await ctx.post(`${api()}/auth/login`, {
    data: { maso: target.username, password: target.password }
  });
  if (!res.ok()) throw new Error(`Login failed for ${target.username}: ${res.status()} ${res.statusText()}`);
  const body = await res.json();
  const token = body?.data?.token || body?.token;
  const user = body?.data?.user || body?.user;
  const roleDetected = normalizeRole(user?.role || user?.roleCode);
  if (!roleSyns.has(roleDetected)) {
    console.warn(`[authHelper] Logged in as ${target.username} but role is ${roleDetected}, expected ${desired}`);
  }
  await ctx.dispose();
  return { token, user, role: roleDetected };
}

export async function injectSession(page: Page, login: LoginResult) {
  await page.goto('/login'); // ensure session manager constructs tab id
  await page.waitForLoadState('domcontentloaded');
  // Poll in page context until tab_id appears (in case app init is async)
  await page.evaluate(({ token, user, role }: { token: string; user: any; role: string }) => {
    function waitForTabId(maxMs: number) {
      const start = Date.now();
      return new Promise<string>((resolve, reject) => {
        const tick = () => {
          const t = sessionStorage.getItem('tab_id');
          if (t) return resolve(t);
          if (Date.now() - start > maxMs) return reject(new Error('tab_id not initialized'));
          setTimeout(tick, 25);
        };
        tick();
      });
    }
    return waitForTabId(1500).catch(() => {
      // Manual fallback: generate tab id if app didn't yet
      const fallback = 'pw_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('tab_id', fallback);
      return fallback;
    }).then((tabId) => {
      const keyPrefix = 'tab_session_data';
      const sessionKey = `${keyPrefix}_${tabId}`;
      const session = { tabId, token, user, role, timestamp: Date.now(), lastActivity: Date.now() };
      sessionStorage.setItem(sessionKey, JSON.stringify(session));
    });
  }, login);
  await page.goto('/');
}

export async function programmaticLogin(page: Page, role: string) {
  const login = await loginByAPI(role);
  await injectSession(page, login);
  return login;
}
