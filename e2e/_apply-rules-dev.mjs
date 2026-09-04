// 대관 규약 새 본문(docx 변환본)을 dev 에 반영하고 화면을 확인한다 (2026-09-04, 팀 요청 "실버전 바로 반영"의 사전 검증).
//   node e2e/_apply-rules-dev.mjs  (BODY=변환 본문 파일, DOCX=내려받기용 원본 파일)
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const BASE = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const ADMIN = process.env.E2E_ADMIN || "admin", APW = process.env.E2E_ADMIN_PASSWORD || "Dkfpsk123!";
const U = process.env.E2E_USER || "testuser", P = process.env.E2E_PASSWORD || "Test1234!";
const S = "/private/tmp/claude-501/-Users-choongworld-workspace-project-seoularena/fb5b3a4c-c8d6-423d-bb64-2ca701cb9384/scratchpad";
const BODY = fs.readFileSync(process.env.BODY || `${S}/rules-new-body.txt`, "utf8");
const DOCX = process.env.DOCX || "/Users/choongworld/workspace/project/seoularena/tmp/files/2026-09-04/서울아레나_대관규약_조항줄바꿈_원복.docx";

const b = await chromium.launch(); const ctx = await b.newContext(); const pg = await ctx.newPage();
try {
  await pg.goto(`${BO}/admin/login`);
  const i = pg.locator("input"); await i.nth(0).fill(ADMIN); await i.nth(1).fill(APW);
  await pg.locator('button[type="submit"]').first().click();
  await pg.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 });

  // 1) 내려받기용 파일 업로드
  const up = process.env.SKIP_UPLOAD ? { status: () => 0, json: async () => ({}) } : await pg.request.post(`${BO}/api/admin/content/document-upload`, {
    multipart: { file: { name: "서울아레나_대관규약.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: fs.readFileSync(DOCX) } },
  });
  const upj = await up.json().catch(() => ({}));
  console.log("upload:", up.status(), JSON.stringify(upj).slice(0, 160));
  const fileUrl = upj.url || upj.fileUrl || "";

  // 2) 현재 규약 콘텐츠 → 본문·파일만 교체해 저장
  const cur = await (await pg.request.get(`${BO}/api/admin/content/rules`)).json();
  const c = cur.content;
  console.log("before:", { title: c.title, version: c.version, effectiveDate: c.effectiveDate, bodyLen: c.body?.length, fileUrl: c.fileUrl });
  fs.writeFileSync(`${S}/rules-dev-before.json`, JSON.stringify(c));
  const next = { ...c, body: BODY, ...(fileUrl ? { fileUrl, fileName: "서울아레나_대관규약.docx" } : {}) };
  const put = await pg.request.put(`${BO}/api/admin/content/rules`, { data: { content: next } });
  const pj = await put.json().catch(() => ({}));
  console.log("save:", put.status(), { bodyLen: pj.content?.body?.length, fileUrl: pj.content?.fileUrl });
  fs.writeFileSync(`${S}/rules-dev-after.json`, JSON.stringify(pj.content ?? next));

  // 3) 화면 확인 (신청자 로그인)
  const pg2 = await (await b.newContext()).newPage();
  await pg2.goto(`${BASE}/login`); const j = pg2.locator("input"); await j.nth(0).fill(U); await j.nth(1).fill(P);
  await pg2.locator('button[type="submit"]').first().click(); await pg2.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
  await pg2.goto(`${BASE}/rules`); await pg2.waitForTimeout(1500);
  const html = await pg2.content();
  const heads = (html.match(/제\d+조 \(/g) || []).length, tables = (html.match(/<table/g) || []).length;
  const hasDownload = /내려받기|다운로드/.test(html);
  console.log(`화면: 제N조 제목 ${heads}개 · 표 ${tables}개 · 내려받기 버튼 ${hasDownload ? "있음" : "없음"} · 제1조 텍스트 ${html.includes("제1조 (목적)") ? "OK" : "없음"}`);
} finally { await b.close(); }
