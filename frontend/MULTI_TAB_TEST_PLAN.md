# Multi-Tab Session Test Plan

OWASP-style per-tab session isolation using `sessionStorage` + unique Tab ID.

## 1. Scope
Validate that each browser tab maintains an independent authenticated session for the 4 roles:
`ADMIN`, `GIANG_VIEN`, `LOP_TRUONG`, `SINH_VIEN` without cross-tab contamination on login / logout / reload, including broadcast logout safety.

## 2. Architecture Assumptions
| Concern | Implementation |
|---------|----------------|
| Session storage | `sessionStorage` key: `tab_session_data_<tabId>` |
| Tab id | Stored in `sessionStorage` key `tab_id` (reused across reload) |
| Registry (debug) | `localStorage` key `all_tabs_registry` (non-authoritative) |
| Broadcast events | `localStorage` key `tab_sync_event` (storage event) |
| Hydration source | ONLY per-tab session (no localStorage fallback) |
| Headers / profile | Read from per-tab session or fetch profile; never from shared localStorage |

## 3. Risks Out of Scope
- JWT reuse at backend for different roles (role switching with same token) – assumed backend consistent.
- Multiple windows using same physical machine profile; test still valid.
- Performance / load / concurrency with dozens of tabs (we target 4–8 tabs).

## 4. Test Categories Overview
| Group | Focus |
|-------|-------|
| A | Core multi-role login & persistence |
| B | Logout isolation & broadcast logout_all |
| C | Edge timing & race conditions |
| D | Security / leakage & tampering |
| E | Automation (Playwright) subset coverage |

---
## 5. Detailed Manual Test Cases

### A – Core Login / Isolation
| ID | Objective | Steps | Expected |
|----|-----------|-------|----------|
| A1 | Independent sessions per role | Open 4 tabs -> login Admin, Teacher, Monitor, Student | 4 distinct `tab_session_data_<id>`; headers show correct names/roles |
| A2 | Reload keeps session | F5 each tab individually | Same role, same tabId reused, hydrated from session |
| A3 | New tab unauthenticated | Open 5th tab -> go `/admin` | Redirect to `/login` |
| A4 | Duplicate tab not auto-login | Copy URL of student tab to new tab | New tab at `/login` (no session) |

### B – Logout Behavior
| ID | Objective | Steps | Expected |
|----|-----------|-------|----------|
| B1 | Single tab logout isolation | Logout Student tab | Only student tab returns `/login`; others intact |
| B2 | Re-login after logout | Logout Student -> login again | Other tabs unchanged |
| B3 | Broadcast logout all | Use TabManager (or emit event) | All tabs -> `/login`; all session keys removed |
| B4 | Other tabs stable after foreign logout | Logout Student -> reload Admin | Admin still authenticated |

### C – Edge / Race
| ID | Objective | Steps | Expected |
|----|-----------|-------|----------|
| C1 | Near-simultaneous logins | Quickly login 2 roles within 1s | No swapped roles; distinct session keys |
| C2 | Rapid logout/login cycle | Logout + immediately login again same tab | No ghost key; registry stable |
| C3 | Close tab w/out logout | Close Monitor tab, reopen new | New tab requires login |
| C4 | Manual session wipe | In Admin tab: `sessionStorage.clear();` reload | Returns to `/login`, other tabs OK |
| C5 | Fake localStorage token | `localStorage.setItem('token','x')` in new tab | Still `/login` – no hydration from localStorage |
| C6 | Heavy navigation | Rapid route changes in Admin | No 401 cascade, other tabs OK |

### D – Security / Tampering
| ID | Objective | Steps | Expected |
|----|-----------|-------|----------|
| D1 | Cross-tab read blocked | From Student tab attempt read Admin key by guessed tabId | `null` (sessionStorage domain-scoped per tab, unknown id) |
| D2 | Registry tamper | Overwrite `all_tabs_registry='{}'` | Active sessions unaffected |
| D3 | Forced logout all event | `localStorage.setItem('tab_sync_event', JSON.stringify({type:'logout_all',ts:Date.now()}))` | All tabs logout |
| D4 | Corrupt token | Alter session token manually then reload | Profile fetch 401 -> session cleared only that tab |
| D5 | Replay session JSON | Copy admin session JSON into student tab key | Either access limited by backend claims OR role appears but only with valid token (backend authoritative) |

### E – Automation Mapping (Playwright)
| Automated Spec | Manual Cases Covered |
|----------------|---------------------|
| session.spec.ts | A1, A2, B1, B4, C2 |
| logout-all.spec.ts | B3, D3 |

---
## 6. Automation Design (Playwright)
Strategy: Programmatic API login (POST `/auth/login`) then inject tab session in a fresh, loaded `/login` page. We rely on app’s hydration to adopt the injected per-tab session.

Helper outline:
1. Fetch demo accounts (GET `/auth/demo-accounts`).
2. Pick account with matching role.
3. POST `/auth/login` -> extract `token`, `user.role`.
4. Navigate to `/login` so sessionStorage manager initializes and sets `tab_id`.
5. Inject JSON at key `tab_session_data_<tabId>`.
6. Navigate to `/` and wait for role-specific route (/admin, /teacher, /monitor, /student).

Limitations:
- Broadcast test (logout-all) must use pages within same BrowserContext because storage events do not cross Playwright isolated contexts.

---
## 7. Pass / Fail Criteria
PASS if: All automated specs pass + manual B1/B3/D3 validated + 0 unexpected cross-role switches.
FAIL if: Any tab after reload shows role or name from different tab OR single logout clears others unintentionally.

---
## 8. Troubleshooting Matrix
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Header shows "User" | Profile not yet loaded or session lost | Check session key exists; re-fetch /auth/profile |
| All tabs logout on single logout | clearSession touched localStorage shared token (regression) | Inspect `clearSession()` implementation |
| New tab auto-login | Fallback to localStorage still somewhere | Grep for `localStorage.getItem('token')` and remove |
| Logout all not working | Storage event listener removed | Ensure listener in TabSessionContext present |

---
## 9. Running Automated Tests
```
cd frontend
npm install
npm install -D @playwright/test
npx playwright install chromium
npm run e2e          # headless
npm run e2e:headed   # show browser
npm run e2e:report   # open HTML report after run
```

Environment variables (optional):
```
set E2E_BASE_URL=http://localhost:3000
set E2E_API_URL=http://localhost:3001/api
```

---
## 10. Future Enhancements
- Add test for notification fetch isolation.
- Add performance timing (login + hydration < 1s).
- Add cross-browser matrix (Chromium / Firefox / WebKit).

---
## 11. Change Log
- v1.0 Initial test plan with Playwright specs skeleton.
