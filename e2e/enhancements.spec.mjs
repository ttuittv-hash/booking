// 2026-09-03 팀 고도화 요청 — dev 화면 1:1 검증. 설정을 바꾸는 검사는 끝나면 원상복구한다.
//   node e2e/enhancements.spec.mjs            (E2E_USER/E2E_PASSWORD, E2E_ADMIN/E2E_ADMIN_PASSWORD 기본값 사용)
import { chromium } from "@playwright/test";
const P = process.env.E2E_BASE || "https://partner.dev.seoularena.net";
const BO = process.env.E2E_BO || "https://bo.dev.seoularena.net";
const USER = process.env.E2E_USER || "testuser", PW = process.env.E2E_PASSWORD || "Test1234!";
const ADMIN = process.env.E2E_ADMIN || "admin", APW = process.env.E2E_ADMIN_PASSWORD || "Dkfpsk123!";
const out = []; const say = (id, label, ok, detail = "") => { out.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${label}${detail ? "  — " + detail : ""}`); };

const b = await chromium.launch();
async function login(base, u, p, urlRe) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const pg = await ctx.newPage();
  await pg.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  const i = pg.locator("input"); await i.nth(0).fill(u); await i.nth(1).fill(p);
  await pg.locator('button[type="submit"]').first().click();
  await pg.waitForURL(urlRe, { timeout: 30000 }); await pg.close();
  return ctx;
}
const partner = await login(P, USER, PW, (x) => !x.toString().includes("/login"));
const bo = await login(BO, ADMIN, APW, /\/admin/);
const api = bo.request; // 관리자 쿠키로 API 호출
const getC = async (page) => (await (await api.get(`${BO}/api/admin/content/${page}`)).json()).content;
const putC = async (page, content) => (await api.put(`${BO}/api/admin/content/${page}`, { data: { content } })).ok();
const html = async (ctx, url) => { const pg = await ctx.newPage(); await pg.goto(url, { waitUntil: "networkidle" }); const h = await pg.content(); await pg.close(); return h; };

try {
  // 1) 홈 버튼
  const home = await html(partner, `${P}/`);
  say("1", "홈 버튼 '대관 공지' → 공고 상세 · '서울아레나 알아보기'", home.includes("대관 공지") && home.includes("/notices/notice-2027-h2-regular") && home.includes("서울아레나 알아보기"));

  // 2) 메뉴: Guide 아래 '대관 공지', 지원에 '공지사항' 없음
  // 헤더의 카테고리 링크는 드롭다운을 연 뒤에만 DOM 에 생긴다 → Guide 를 열고 긁는다. 푸터 사이트맵도 같이 본다.
  const pg2 = await partner.newPage(); await pg2.goto(`${P}/`, { waitUntil: "networkidle" });
  await pg2.getByRole("button", { name: /^Guide/ }).first().click().catch(() => {}); await pg2.waitForTimeout(400);
  const navLinks = await pg2.$$eval("header a", (as) => as.map((a) => `${a.textContent.trim()}|${new URL(a.href).pathname}`));
  const footLinks = await pg2.$$eval("footer a", (as) => as.map((a) => `${a.textContent.trim()}|${new URL(a.href).pathname}`));
  await pg2.close();
  const all = [...navLinks, ...footLinks];
  say("2", "메뉴 Guide › '대관 공지'(/notices), '공지사항' 라벨 없음 (헤더 드롭다운+푸터)", all.includes("대관 공지|/notices") && !all.some((l) => l.startsWith("공지사항|")), all.filter((l) => l.includes("/notices") || l.startsWith("공지사항")).join(" ") || "(/notices 링크 없음)");

  // 3) 일정 범주 문구·색 — bo 폼 존재 + API 로 문구 바꿔 공고 달력 범례 확인 후 복구
  const pg3 = await bo.newPage(); await pg3.goto(`${BO}/admin/content`, { waitUntil: "networkidle" });
  await pg3.getByRole("button", { name: "화면 문구" }).click(); await pg3.waitForTimeout(800);
  const legendSection = await pg3.locator("text=일정 달력 범주").count();
  const legendSelects = await pg3.locator("select").count();
  await pg3.close();
  say("3a", "bo › 화면 문구에 '일정 달력 범주' 섹션 + 색 선택 3개", legendSection > 0 && legendSelects >= 3, `select=${legendSelects}`);
  const st = await getC("screenText"); const origWS = { ...(st.wizardStrings ?? {}) };
  const marker = "확정(E2E검증)";
  await putC("screenText", { ...st, wizardStrings: { ...origWS, "schedule.legend.confirmed.label": marker } });
  const noticeUrl = `${P}/notices/notice-2027-h2-regular`;
  const pg3b = await partner.newPage(); await pg3b.goto(noticeUrl, { waitUntil: "networkidle" });
  await pg3b.getByRole("button", { name: "대관 현황 캘린더" }).first().click(); await pg3b.waitForTimeout(1200);
  const legendText = await pg3b.locator('[aria-label="대관 현황 캘린더"]').innerText().catch(() => "");
  await pg3b.close();
  await putC("screenText", { ...st, wizardStrings: origWS });
  say("3b", "범주 문구 변경이 공고 달력 범례에 반영(후 원복)", legendText.includes(marker));

  // 4) 규약 표 편집기
  const pg4 = await bo.newPage(); await pg4.goto(`${BO}/admin/content`, { waitUntil: "networkidle" });
  await pg4.getByRole("button", { name: "대관 규약" }).click(); await pg4.waitForTimeout(800);
  const ruleTables = await pg4.locator("table").count(); const ruleLabel = await pg4.locator("span:text-is('표')").count();
  await pg4.close();
  say("4", "bo › 대관 규약 본문에 표 격자 편집기(표 라벨·행 추가)", ruleTables > 0 || ruleLabel > 0, `table=${ruleTables} 표라벨=${ruleLabel}`);

  // 5) 공지 표 열너비 — 테스트 공지 생성 → 상세에서 폭 유지·강제확장 없음 → 삭제
  const body = '<table><colgroup><col style="width:120px"><col style="width:300px"></colgroup><tbody><tr><td colwidth="120">a</td><td colwidth="300">b</td></tr></tbody></table>';
  const created = await (await api.post(`${BO}/api/admin/notices`, { data: { title: "[E2E] 표 폭 검증", body, tag: "공지" } })).json();
  const nid = created?.notice?.id ?? created?.id;
  const nh = nid ? await html(partner, `${P}/notices/${nid}`) : "";
  if (nid) await api.delete(`${BO}/api/admin/notices/${nid}`);
  say("5", "공지 상세: 지정 열 폭 유지 + 표 강제확장(min-w-full) 없음", !!nid && nh.includes("width:120px") && !nh.includes("[&_table]:min-w-full"), nid ? `notice=${nid}` : "생성 실패");

  // 6) 대관료 탭 한글
  const rates = await html(partner, `${P}/rates`);
  say("6", "대관료 탭 '아레나 대관료 / 중형공연장 대관료 / 올인원 대관료', 영문 없음", ["아레나 대관료", "중형공연장 대관료", "올인원 대관료"].every((t) => rates.includes(t)) && !rates.includes("ARENA rate"));

  // 7) 할인 — bo 폼 입력 존재 + API 로 10% 넣고 카드 확인 후 복구
  const pg7 = await bo.newPage(); await pg7.goto(`${BO}/admin/content`, { waitUntil: "networkidle" });
  await pg7.getByRole("button", { name: "대관료" }).click(); await pg7.waitForTimeout(800);
  const discountField = await pg7.locator("text=할인 %").count(); await pg7.close();
  say("7a", "bo › 대관료 요금표 열에 '할인 %' 입력", discountField > 0, `필드=${discountField}`);
  const rc = await getC("rates"); const origCols = JSON.parse(JSON.stringify(rc.arena.columns));
  const cols = JSON.parse(JSON.stringify(origCols)); if (cols[0]) cols[0].discountPercent = 10;
  await putC("rates", { ...rc, arena: { ...rc.arena, columns: cols } });
  const rh = await html(partner, `${P}/rates`);
  await putC("rates", { ...rc, arena: { ...rc.arena, columns: origCols } });
  const rh2 = await html(partner, `${P}/rates`);
  // 카드 마크업: <s class="text-muted">정상가</s> <span class="font-bold text-danger">10%</span> — 이 조합으로만 판정한다.
  // React 는 {10}% 를 "10<!-- -->%" 로 내보낸다 — 주석 노드를 허용해서 판정한다.
  const struck = (h) => /<s class="text-muted">[^<]*원[^<]*<\/s>/.test(h) && /text-danger">10(<!-- -->)?%<\/span>/.test(h);
  say("7b", "할인 10% 저장 → 카드에 취소선 정상가 + '10%'(빨강) + 할인가, 원복 시 사라짐", struck(rh) && !struck(rh2), `적용시=${struck(rh)} 원복후=${struck(rh2)}`);

  // 8) 1월 이어붙이기 — bo 입력 존재 + 창 설정 후 12월 격자 셀 수/음영 수 확인 후 복구
  const pg8 = await bo.newPage(); await pg8.goto(`${BO}/admin/schedule`, { waitUntil: "networkidle" });
  const endDayField = await pg8.locator("text=마지막 달 뒤에 이어서 보여줄").count(); await pg8.close();
  say("8a", "bo › 일정 관리에 '다음 달 마지막 날' 입력", endDayField > 0);
  const win = (await (await api.get(`${BO}/api/admin/notice-calendar-window`)).json()).window;
  async function decGrid(endDay) {
    await api.put(`${BO}/api/admin/notice-calendar-window`, { data: { enabled: true, startMonth: "2026-09", endMonth: "2026-12", endDay } });
    const pg = await partner.newPage(); await pg.goto(noticeUrl, { waitUntil: "networkidle" });
    await pg.getByRole("button", { name: "대관 현황 캘린더" }).first().click(); await pg.waitForTimeout(1000);
    const dlg = pg.locator('[aria-label="대관 현황 캘린더"]');
    for (let i = 0; i < 12; i++) { if ((await dlg.innerText()).includes("2026년 12월")) break; const btns = dlg.locator("button"); await btns.nth(2).click().catch(() => {}); await pg.waitForTimeout(400); }
    const cells = await dlg.locator(".grid.grid-cols-7 > *").count();
    const muted = await dlg.locator('.grid.grid-cols-7 > *[class*="text-muted/30"]').count();
    const title = (await dlg.innerText()).match(/\d{4}년 \d{1,2}월/)?.[0] ?? "?";
    await pg.close(); return { cells, muted, title };
  }
  const withEnd = await decGrid("2027-01-12");
  const noEnd = await decGrid(null);
  await api.put(`${BO}/api/admin/notice-calendar-window`, { data: win });
  // .grid.grid-cols-7 에는 요일 헤더 행(7칸)도 잡힌다 → 날짜 셀 = cells-7. 12월(화요일 시작): 6주=42셀·음영 11(11/30 + 1/1~1/10), endDay 1/12 면 7주=49셀·음영 6(11/30 + 1/13~1/17).
  const okEnd = withEnd.title === "2026년 12월" && withEnd.cells - 7 === 49 && withEnd.muted === 6;
  const okNo = noEnd.cells - 7 === 42 && noEnd.muted === 11;
  say("8b", "12월 격자: endDay=1/12 → 7주·1/1~1/12 활성(음영 6) / 없으면 6주·음영 11", okEnd && okNo, `endDay: ${withEnd.title} 날짜셀=${withEnd.cells - 7} 음영=${withEnd.muted} · 없음: 날짜셀=${noEnd.cells - 7} 음영=${noEnd.muted}`);
} finally {
  await b.close();
}
console.log(`\n합계 ${out.length}건 · 통과 ${out.filter(Boolean).length} · 실패 ${out.filter((x) => !x).length}`);
process.exit(out.every(Boolean) ? 0 : 1);
