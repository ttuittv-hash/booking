#!/usr/bin/env node
// SQLite(app.db) → PostgreSQL 1회성 데이터 이전 스크립트.
//
// 사용법 (Render 쉘 또는 로컬):
//   DATABASE_URL=postgres://... node scripts/migrate-sqlite-to-pg.mjs [SQLite 파일 경로]
//   (경로 생략 시 $DATA_DIR/app.db, 그것도 없으면 ./data/app.db)
//
// 전제: 새 앱이 최소 1회 기동해 PostgreSQL 스키마가 이미 생성되어 있어야 한다.
// 동작:
//  - 모든 테이블을 PK 충돌 시 건너뛰기(ON CONFLICT DO NOTHING)로 복사한다.
//    → 새 DB에 시드된 운영자/테스트 계정과 이메일이 겹치면 시드 계정이 유지된다.
//  - 이관된 사용자 비밀번호는 bcrypt(평문) 방식이므로 password_scheme='v1'로 표시한다.
//    (첫 로그인 시 자동으로 새 방식 v2 = bcrypt(sha256)로 승격된다)
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";

const sqlitePath =
  process.argv[2] ||
  path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "app.db");

if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite 파일을 찾을 수 없습니다: ${sqlitePath}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 환경변수를 설정하세요.");
  process.exit(1);
}

const useSsl =
  /sslmode=require/.test(process.env.DATABASE_URL) || process.env.DATABASE_SSL === "true";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });

// FK 의존성 순서대로 나열 (companies → users → quotes → 나머지)
const TABLES = [
  { name: "companies", conflictTarget: "id" },
  { name: "users", conflictTarget: "id" },
  { name: "rate_tables", conflictTarget: "version" },
  { name: "quotes", conflictTarget: "id" },
  { name: "audit_logs", conflictTarget: "id" },
  { name: "deposits", conflictTarget: "id" },
  { name: "attachments", conflictTarget: "id" },
  { name: "notifications", conflictTarget: "id" },
  { name: "notices", conflictTarget: "id" },
  { name: "faqs", conflictTarget: "id" },
  { name: "pages", conflictTarget: "id" },
  { name: "site_content", conflictTarget: "page" },
  { name: "feature_spec_sheets", conflictTarget: "sheet_key" },
  { name: "date_blocks", conflictTarget: "date" },
  { name: "contract_signatures", conflictTarget: "id" },
  { name: "tax_invoices", conflictTarget: "id" },
  { name: "ticket_opens", conflictTarget: "id" },
  { name: "facility_meetings", conflictTarget: "id" },
  { name: "inquiries", conflictTarget: "id" },
];

function sqliteTableExists(name) {
  const row = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return !!row;
}

async function pgColumns(table) {
  const res = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
    [table],
  );
  return res.rows.map((r) => r.column_name);
}

let totalInserted = 0;
let totalSkipped = 0;

for (const { name, conflictTarget } of TABLES) {
  if (!sqliteTableExists(name)) {
    console.log(`- ${name}: SQLite에 테이블 없음, 건너뜀`);
    continue;
  }
  const rows = sqlite.prepare(`SELECT * FROM ${name}`).all();
  if (rows.length === 0) {
    console.log(`- ${name}: 0행, 건너뜀`);
    continue;
  }
  const targetCols = await pgColumns(name);
  const sourceCols = Object.keys(rows[0]);
  // 양쪽에 모두 존재하는 컬럼만 복사한다 (password_scheme은 아래에서 별도 지정)
  const cols = targetCols.filter((c) => sourceCols.includes(c) && c !== "password_scheme");
  const finalCols = name === "users" ? [...cols, "password_scheme"] : cols;
  const placeholders = finalCols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO ${name} (${finalCols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO NOTHING`;

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map((c) => row[c] ?? null);
    // 기존 SQLite 계정 비밀번호는 bcrypt(평문) — 레거시(v1)로 표시해 첫 로그인 시 승격시킨다
    if (name === "users") values.push("v1");
    const res = await pool.query(sql, values);
    inserted += res.rowCount ?? 0;
  }
  const skipped = rows.length - inserted;
  totalInserted += inserted;
  totalSkipped += skipped;
  console.log(`- ${name}: ${inserted}행 이전${skipped ? ` (${skipped}행은 이미 존재해 건너뜀)` : ""}`);
}

// users 테이블에서 email unique 충돌(시드 계정과 동일 이메일)로 건너뛴 계정이 있으면 경고
console.log(`\n완료: 총 ${totalInserted}행 이전, ${totalSkipped}행 건너뜀.`);
console.log(
  "주의: 이메일/아이디가 새 DB의 시드 계정(admin/test)과 겹치는 사용자는 건너뛰었습니다.\n" +
    "이관된 기존 사용자는 첫 로그인 때 자동으로 새 비밀번호 저장 방식(v2)으로 전환됩니다.",
);

await pool.end();
sqlite.close();
