/*
  Deduplicate roles by normalized name and merge permissions safely.

  What it does (dry-run by default):
  - Group roles by normalized name (accent-insensitive, uppercase)
  - For each group with more than 1 record, pick a winner:
      * Prefer the record with the MOST non-empty permissions
      * Tie-breaker: prefer canonical Vietnamese diacritics name if present
      * Final fallback: lowest id (lexicographic)
  - Merge permissions (union) into the winner
  - Reassign users to the winner for all losers in the group
  - Delete loser roles
  - Ensure final name is the canonical diacritics form for the four core roles

  Usage (from repo root):
    node backend/scripts/dedupe_roles.js               # dry-run, prints plan only
    node backend/scripts/dedupe_roles.js --apply       # apply changes
    node backend/scripts/dedupe_roles.js --apply --backup=roles-backup.json

  Notes:
  - Safe to run multiple times; idempotent once deduped.
  - Only deletes roles after reassigning all users to the winner role.
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ errorFormat: 'pretty' });
const fs = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const backupArg = args.find(a => a.startsWith('--backup='));
  const backup = backupArg ? backupArg.split('=')[1] : null;
  return { apply, backup };
}

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeName(name) {
  if (!name) return '';
  const up = String(name).trim().toUpperCase();
  const noAccent = stripDiacritics(up).replace(/\?/g, '');
  return noAccent.replace(/\s+/g, '_');
}

// Canonical display name with diacritics for the four core roles
function canonicalDisplayName(normalized) {
  switch (normalized) {
    case 'ADMIN':
      return 'ADMIN';
    case 'GIANG_VIEN':
      return 'GIẢNG_VIÊN';
    case 'LOP_TRUONG':
      return 'LỚP_TRƯỞNG';
    case 'SINH_VIEN':
      return 'SINH_VIÊN';
    default:
      return null; // unknown roles: keep current name
  }
}

function scoreRole(r) {
  const perms = Array.isArray(r.quyen_han) ? r.quyen_han.filter(Boolean) : [];
  return perms.length;
}

function preferCanonicalName(aName, bName, normalizedKey) {
  const canon = canonicalDisplayName(normalizedKey);
  if (!canon) return 0; // no preference
  const aMatch = aName === canon;
  const bMatch = bName === canon;
  if (aMatch && !bMatch) return -1; // a preferred
  if (bMatch && !aMatch) return 1;  // b preferred
  return 0;
}

function uniqueUnion(arrays) {
  const out = [];
  const seen = new Set();
  for (const arr of arrays) {
    for (const v of (Array.isArray(arr) ? arr : [])) {
      const key = String(v).trim();
      if (!key) continue;
      if (!seen.has(key)) { seen.add(key); out.push(key); }
    }
  }
  return out;
}

async function main() {
  const { apply, backup } = parseArgs();
  const roles = await prisma.vaiTro.findMany();
  if (!roles.length) {
    console.log('No roles found.');
    return;
  }

  if (backup) {
    fs.writeFileSync(backup, JSON.stringify(roles, null, 2), 'utf8');
    console.log(`Backup written: ${backup}`);
  }

  // Group by normalizedName
  const groups = new Map();
  for (const r of roles) {
    const norm = normalizeName(r.ten_vt);
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm).push(r);
  }

  let totalLosers = 0;
  let totalUsersReassigned = 0;
  const plan = [];

  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue; // no duplicates

    // Pick winner
    const sorted = [...list].sort((a, b) => {
      const sa = scoreRole(a);
      const sb = scoreRole(b);
      if (sb !== sa) return sb - sa; // higher score first
      const pref = preferCanonicalName(a.ten_vt, b.ten_vt, key);
      if (pref !== 0) return pref; // prefer canonical diacritics
      return String(a.id).localeCompare(String(b.id));
    });
    const winner = sorted[0];
    const losers = sorted.slice(1);
    totalLosers += losers.length;

    // Merge permissions
    const unionPerms = uniqueUnion(sorted.map(r => r.quyen_han));

    // Determine final name for winner
    const canonical = canonicalDisplayName(key);
    const finalName = canonical || winner.ten_vt;

    // Count users on losers
    const loserIds = losers.map(l => l.id);
    const loserUsers = await prisma.nguoiDung.count({ where: { vai_tro_id: { in: loserIds } } });

    plan.push({
      group: key,
      winner: { id: winner.id, name: winner.ten_vt },
      finalName,
      losers: losers.map(l => ({ id: l.id, name: l.ten_vt })),
      mergePermCount: unionPerms.length,
      reassignUsers: loserUsers
    });

    if (apply) {
      // 1) Update winner name and perms
      await prisma.vaiTro.update({ where: { id: winner.id }, data: { ten_vt: finalName, quyen_han: unionPerms } });

      if (loserIds.length) {
        // 2) Reassign users from losers to winner
        const reassigned = await prisma.nguoiDung.updateMany({ where: { vai_tro_id: { in: loserIds } }, data: { vai_tro_id: winner.id } });
        totalUsersReassigned += reassigned.count;

        // 3) Delete loser role rows
        const del = await prisma.vaiTro.deleteMany({ where: { id: { in: loserIds } } });
        console.log(`[${key}] Winner ${winner.ten_vt} (${winner.id}) <- merged ${loserIds.length} losers; users reassigned: ${reassigned.count}; roles deleted: ${del.count}`);
      }
    } else {
      // Dry run: just log
      console.log(`[DRY-RUN] Group ${key}: winner=${winner.ten_vt} (${winner.id}) -> finalName=${finalName}; losers=${losers.length}; mergedPerms=${unionPerms.length}; usersToReassign=${loserUsers}`);
    }
  }

  if (!apply) {
    if (!plan.length) {
      console.log('No duplicate role groups found. Nothing to do.');
    } else {
      console.log(`Found ${plan.length} duplicate group(s). Run with --apply to execute.`);
    }
  } else {
    console.log(`Deduplication complete. Groups processed: ${plan.length}; roles deleted: ${totalLosers}; users reassigned: ${totalUsersReassigned}.`);
  }
}

main().catch(e => {
  console.error('dedupe_roles failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
