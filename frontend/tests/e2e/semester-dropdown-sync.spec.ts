import { test, expect } from '@playwright/test';
import { programmaticLogin } from './authHelper';

// Pages and URLs to validate dropdown + filtering
// Adjust paths to match your router
const PAGES = [
  // Student activities route per App.js: '/student/activities'
  { role: 'SINH_VIEN', path: '/student/activities' },
  { role: 'LOP_TRUONG', path: '/monitor/my-activities' },
  { role: 'GIANG_VIEN', path: '/teacher/activities' },
  // Admin registrations/approvals route per App.js: '/admin/approvals'
  { role: 'ADMIN', path: '/admin/approvals' }
];

// Helper: find the index of the select that contains semester options
async function findSemesterSelectIndex(page: import('@playwright/test').Page): Promise<number> {
  const idx = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];
    const hasSemester = (s: HTMLSelectElement) => Array.from(s.options || []).some(o => {
      const v = (o.value || '').toString();
      const l = (o.label || (o as any).text || '').toString();
      return v.includes('hoc_ky_') || /HK[12]\s*-\s*\d{4}/i.test(l);
    });
    return selects.findIndex(s => hasSemester(s));
  });
  return idx ?? -1;
}

// Helper: wait until semester options loaded (>= 1 matching option) and return locator
async function getSemesterControl(page: import('@playwright/test').Page): Promise<{ kind: 'native'; locator: ReturnType<typeof page.locator> } | { kind: 'combobox'; locator: ReturnType<typeof page.locator> } > {
  await page.waitForTimeout(300); // allow UI render
  const start = Date.now();
  while (Date.now() - start < 10000) {
    // Try native select first
    const idx = await findSemesterSelectIndex(page);
    if (idx >= 0) {
      const sel = page.locator('select').nth(idx);
      await sel.waitFor({ state: 'visible', timeout: 2000 });
      return { kind: 'native', locator: sel };
    }
    // Then try generic combobox pattern (React-Select or headless UI)
    const combo = page.locator('[role="combobox"], [aria-haspopup=listbox]');
    if (await combo.count()) {
      const first = combo.first();
      // Heuristic: placeholder or value contains HK or hoc_ky
      const text = (await first.getAttribute('aria-label')) || (await first.textContent()) || '';
      if (/HK\s*[12]|hoc_\s*ky|học\s*kỳ/i.test(text)) {
        await first.waitFor({ state: 'visible', timeout: 2000 });
        return { kind: 'combobox', locator: first };
      }
    }
    await page.waitForTimeout(200);
  }
  throw new Error('Semester select not found');
}

// Helper: pick first semester option from the provided select locator
async function pickFirstSemester(page: import('@playwright/test').Page, control: { kind: 'native' | 'combobox'; locator: ReturnType<typeof page.locator> }) {
  if (control.kind === 'native') {
    // Wait until options are present
    await control.locator.evaluate((el: HTMLSelectElement) => !!el && el.options && el.options.length > 0);
    const values = await control.locator.evaluate((el: HTMLSelectElement) => Array.from(el.options || []).map(o => ({ value: o.value, label: (o.label || (o as any).text || '').toString(), selected: (o as any).selected })) as { value: string; label: string; selected?: boolean }[]);
    const nonSelected = values.filter(v => !v.selected);
    const candidate = nonSelected.find((v: { value: string }) => v.value && v.value.includes('hoc_ky_')) || nonSelected[0] || values[0];
    if (!candidate) throw new Error('No semester option found');
    await control.locator.selectOption(candidate.value);
    return candidate.value;
  }
  // combobox: open and click first option that looks like a semester (HKx - YYYY)
  await control.locator.click();
  const option = page.locator('[role="option"], [role="listbox"] [data-value], [role="listbox"] [id], ul[role="listbox"] li').filter({ hasText: /HK\s*[12]\s*-\s*\d{4}|hoc_ky_\d-\d{4}/i }).first();
  await option.waitFor({ state: 'visible', timeout: 3000 });
  const text = (await option.textContent())?.trim() || 'HK';
  await option.click({ trial: true }).catch(() => {});
  await option.click();
  // Try to derive a standard value if possible from text, else return text
  const m = text.match(/HK\s*([12]).*?(\d{4})/i);
  if (m) {
    return `hoc_ky_${m[1]}-${m[2]}`;
  }
  return text;
}

function parseSemesterValue(val: string): { hk?: string; year?: string } {
  const m = val.match(/hoc_ky_(1|2)-(\d{4})/i);
  if (m) return { hk: m[1], year: m[2] };
  const m2 = val.match(/HK\s*([12]).*?(\d{4})/i);
  if (m2) return { hk: m2[1], year: m2[2] };
  return {};
}

// Validate that selecting dropdown triggers fetching with semester param present
test.describe('Semester dropdown sync across pages', () => {
  for (const cfg of PAGES) {
    test(`Dropdown loads from backend and filters (${cfg.role} @ ${cfg.path})`, async ({ page }) => {
    await programmaticLogin(page, cfg.role);
    await page.goto(cfg.path);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

      // 1) Locate the semester dropdown dynamically and confirm options are present
  const control = await getSemesterControl(page);

      // 2) Intercept relevant API calls and assert semester param is present on change
      type Captured = { url: string; method: string; post?: string };
      const captured: Captured[] = [];
      const apiEnv = process.env.E2E_API_URL;
      const isApi = (u: string) => apiEnv ? u.startsWith(apiEnv) : /\/api\//.test(u);
      page.on('request', (req) => {
        const url = req.url();
        if (!isApi(url)) return;
        captured.push({ url, method: req.method(), post: req.postData() || undefined });
      });

      const selected = await pickFirstSemester(page, control);
      const { hk, year } = parseSemesterValue(selected);

      // wait for at least one relevant API response after selection
      await page.waitForResponse(resp => {
        const u = resp.url();
        if (!isApi(u)) return false;
        return /activities|teacher|admin|class/i.test(u);
      }, { timeout: 7000 }).catch(() => {});

      // Allow a short buffer for request event to flush
      await page.waitForTimeout(200);

      const lines: string[] = [];
      const matched = captured.some(r => {
        const u = r.url;
        const body = r.post || '';
        lines.push(`${r.method} ${u}${body ? `\nBODY: ${body}` : ''}`);
        // URL query checks
        const urlHasSemester = u.includes('semester=') && (u.includes(encodeURIComponent(selected)) || u.includes(selected));
        const urlHasHKYear = hk && year ? (u.includes(`hoc_ky=${hk}`) && u.includes(`nam_hoc=${year}`)) : false;
        // Body checks (JSON or form)
        let bodyHas = false;
        try {
          if (body && body.trim().startsWith('{')) {
            const json = JSON.parse(body);
            bodyHas = (json.semester && typeof json.semester === 'string' && json.semester.includes(hk ? `_${hk}-` : '') && json.semester.includes(year || '')) ||
                      ((json.hoc_ky?.toString() === hk) && (json.nam_hoc?.toString() === year));
          } else if (body) {
            bodyHas = (hk && year) ? (body.includes(`hoc_ky=${hk}`) && body.includes(`nam_hoc=${year}`)) : body.includes('semester=');
          }
        } catch {}
        return urlHasSemester || urlHasHKYear || bodyHas;
      });

      expect(matched, `No request carried semester selection (${selected}) in\n${lines.join('\n\n')}`).toBeTruthy();
    });
  }
});
