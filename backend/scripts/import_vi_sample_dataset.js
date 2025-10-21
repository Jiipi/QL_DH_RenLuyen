/**
 * import_vi_sample_dataset.js
 * ---------------------------------------------------------------------------
 * Purpose: Allow importing the very large Vietnamese sample SQL dataset the user
 * provided (with human–readable / accented status strings) into the current
 * Postgres database (inside Docker) while automatically NORMALIZING all enum
 * values to the Prisma / DB enum literals defined in schema.prisma.
 *
 * HOW TO USE (from project root, container running `backend-dev` or using local Node):
 * 1. Copy the full raw SQL you sent (unchanged) into file:
 *       backend/prisma/raw_vi_dataset.sql
 *    (Create the file if it does not exist.)
 * 2. Run (on host):
 *       powershell:
 *         node backend/scripts/import_vi_sample_dataset.js
 *    or exec inside the backend-dev container:
 *         docker exec -it dacn_backend_dev node backend/scripts/import_vi_sample_dataset.js
 *
 * OPTIONAL (wipe existing data first): Set WIPE=1 environment variable:
 *       WIPE=1 node backend/scripts/import_vi_sample_dataset.js
 *  (This will TRUNCATE related tables CASCADE before import.)
 *
 * The script:
 *  - Reads raw SQL
 *  - Removes obvious duplicate trailing blocks that existed in the supplied text
 *  - Normalizes all accented / Vietnamese enum strings to canonical enum tokens
 *  - Executes each statement sequentially via Prisma.$executeRawUnsafe
 *  - Skips empty & purely comment statements
 *  - Prints a compact progress log & summary
 *
 * SAFETY:
 *  - By default it will STOP on the first error to avoid partial inconsistent load.
 *  - You can allow best‑effort continue with ALLOW_PARTIAL=1 env var.
 *
 * LIMITATIONS:
 *  - Assumes statements end with ';'.
 *  - Does not try to convert inside JSON bodies or textual descriptions;
 *    Only exact, fully quoted enum phrases get replaced.
 *  - Views / Functions / Indexes in the raw file will also be executed.
 *
 * If you prefer a permanent Prisma seed instead, you can later convert the
 * dataset into structured JS create() calls; this script focuses on quick import.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// File containing the raw user‑provided SQL (must be created manually by user).
const RAW_FILE = path.join(__dirname, '..', 'prisma', 'raw_vi_dataset.sql');

// Exact single-quoted replacements (order matters: longer / more specific first)
// Only matches when the WHOLE token is the phrase (e.g. 'hoạt động').
const ENUM_REPLACEMENTS = [
  // trang_thai (nguoi_dung)
  ["'hoạt động'", "'hoat_dong'"],
  ["'không hoạt động'", "'khong_hoat_dong'"],
  ["'khoá'", "'khoa'"],
  // hoat_dong.trang_thai
  ["'kết thúc'", "'ket_thuc'"],
  ["'đã duyệt'", "'da_duyet'"],
  ["'chờ duyệt'", "'cho_duyet'"],
  ["'từ chối'", "'tu_choi'"],
  ["'đã huỷ'", "'da_huy'"],
  // dang_ky_hoat_dong.trang_thai_dk
  ["'đã tham gia'", "'da_tham_gia'"],
  // diem_danh.phuong_thuc
  ["'truyền thống'", "'truyen_thong'"],
  // diem_danh.trang_thai_tham_gia
  ["'có mặt'", "'co_mat'"],
  ["'về sớm'", "'ve_som'"],
  ["'muộn'", "'muon'"],
  // thong_bao.muc_do_uu_tien
  ["'trung bình'", "'trung_binh'"],
  ["'khẩn cấp'", "'khan_cap'"],
  ["'thấp'", "'thap'"],
  // thong_bao.trang_thai_gui
  ["'đã gửi'", "'da_gui'"],
  ["'chờ gửi'", "'cho_gui'"],
  ["'thất bại'", "'that_bai'"],
  // thong_bao.phuong_thuc_gui
  ["'trong hệ thống'", "'trong_he_thong'"],
  // hoc_ky
  ["'học kỳ 1'", "'hoc_ky_1'"],
  ["'học kỳ 2'", "'hoc_ky_2'"],
  // gioi_tinh
  ["'nữ'", "'nu'"],
];

// Utility: clean duplicate large trailing fragments (the raw text contained repeats)
function stripDuplicateBlocks(sql) {
  // Heuristic: if a line starts again with "-- 8. DỮ LIỆU BẢNG DANG_KY_HOAT_DONG" after we've already passed it once, cut off the rest before second repeat.
  const markers = [
    '-- 8. DỮ LIỆU BẢNG DANG_KY_HOAT_DONG',
    '-- 8. Dữ liệu bảng dang_ky_hoat_dong',
    '*/-- 8. Dữ liệu bảng dang_ky_hoat_dong'
  ];
  let earliestSecond = -1;
  for (const marker of markers) {
    const firstIdx = sql.indexOf(marker);
    if (firstIdx === -1) continue;
    const secondIdx = sql.indexOf(marker, firstIdx + marker.length);
    if (secondIdx !== -1) {
      if (earliestSecond === -1 || secondIdx < earliestSecond) {
        earliestSecond = secondIdx;
      }
    }
  }
  if (earliestSecond !== -1) {
    return sql.substring(0, earliestSecond);
  }
  return sql;
}

function applyEnumReplacements(sql) {
  let out = sql;
  for (const [from, to] of ENUM_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

function splitStatements(sql) {
  // Remove Windows newlines for consistency
  const normalized = sql.replace(/\r\n/g, '\n');
  // Preserve semicolons inside dollar-quoted bodies (very unlikely here) – simplistic approach: split by ';' then re-join if inside function.
  const rawParts = normalized.split(';');
  const stmts = [];
  let buffer = '';
  let inDollar = false;
  for (let part of rawParts) {
    const segment = part + ';';
    buffer += segment;
    // Detect dollar-quote toggles ($$)
    const dollarCount = (segment.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) {
      inDollar = !inDollar; // toggle (odd occurrences)
    }
    if (!inDollar) {
      const trimmed = buffer.trim();
      if (trimmed && trimmed !== ';') stmts.push(trimmed.replace(/;+$/,';'));
      buffer = '';
    }
  }
  return stmts;
}

async function maybeWipe() {
  if (process.env.WIPE === '1') {
    console.log('⚠️  WIPE=1 → Truncating existing data (CASCADE)...');
    // Order: child tables first, but CASCADE should handle.
    const toTruncate = [
      'thong_bao','diem_danh','dang_ky_hoat_dong','hoat_dong','loai_thong_bao','loai_hoat_dong','sinh_vien','lop','nguoi_dung','vai_tro'
    ];
    for (const tbl of toTruncate) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tbl} CASCADE;`).catch(e=>{
        console.warn('   Skipped truncate for', tbl, e.message);
      });
    }
  }
}

function isIgnorable(stmt) {
  if (!stmt) return true;
  const s = stmt.trim();
  if (!s || s === ';') return true;
  // Do NOT skip whole statement if it starts with comments; we'll strip leading comments elsewhere.
  if (s.startsWith('/*') && s.endsWith('*/;')) return true;
  if (s.startsWith('/*') && s.endsWith('*/;')) return true;
  return false;
}

function stripLeadingComments(stmt) {
  const lines = stmt.split(/\n/);
  while (lines.length && lines[0].trim().startsWith('--')) {
    lines.shift();
  }
  return lines.join('\n').trim();
}

async function run() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error('❌ Raw SQL file not found:', RAW_FILE);
    console.error('👉 Please create it with the full dataset then re-run.');
    process.exit(1);
  }

  console.log('📥 Reading raw SQL file...');
  let raw = fs.readFileSync(RAW_FILE, 'utf8');
  console.log(`   Raw size: ${(raw.length/1024).toFixed(1)} KB`);

  raw = stripDuplicateBlocks(raw);
  raw = applyEnumReplacements(raw);

  const statements = splitStatements(raw);
  console.log(`🧩 Parsed ${statements.length} statements (including comments).`);

  await maybeWipe();

  // Ensure trigger helper function exists early (some datasets might place it later)
  const preambleFunction = `CREATE OR REPLACE FUNCTION update_modified_time()\nRETURNS TRIGGER AS $$\nBEGIN\n    NEW.ngay_cap_nhat = NOW();\n    RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;`;
  try {
    await prisma.$executeRawUnsafe(preambleFunction);
    console.log('🔧 Ensured trigger function update_modified_time() exists.');
  } catch (e) {
    console.warn('⚠️  Could not create update_modified_time() preamble:', e.message);
  }

  let executed = 0;
  const allowPartial = process.env.ALLOW_PARTIAL === '1';
  for (const stmt of statements) {
    let work = stmt;
    if (isIgnorable(work)) continue;
    work = stripLeadingComments(work);
    if (!work || work === ';') continue;
    try {
      await prisma.$executeRawUnsafe(work);
      executed++;
      if (executed % 25 === 0) {
        console.log(`   ✅ Executed ${executed} statements so far...`);
      }
    } catch (e) {
      console.error('\n❌ Error executing statement #' + (executed+1));
      console.error(e.message);
      // Print first 300 chars of failing statement to help debug.
      console.error('Statement snippet:', work.substring(0,300).replace(/\s+/g,' ').trim() + '...');
      if (!allowPartial) {
        console.error('💥 Aborting (set ALLOW_PARTIAL=1 to continue on errors).');
        process.exit(1);
      }
    }
  }

  console.log(`\n🎉 Import finished. Executed ${executed} statements.`);
  console.log('You can now open Prisma Studio (docker service prisma-studio) to inspect the data.');
}

run()
  .catch(e => {
    console.error('Unhandled failure:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
