// [QA] 2026-09-18 에 고친 것들이 그대로 살아 있는가 — **운영에서 읽기만 한다**.
//
// 신청서를 만들지도, 고치지도, 지우지도 않는다. 화면을 열어 값을 읽을 뿐이다.
// 단언값은 전부 그날 운영 화면에서 **직접 확인한 것**이다. 확인하지 않은 것은 넣지 않는다.
//
// 대상 신청서는 환경변수로 받는다. 지정한 건이 없어지면 그 검사는 **통과가 아니라 ⛔** 다
// (없는 걸 "문제 없음" 으로 세면 회귀를 놓친다).
import { CANNOT_READ, Report, flatText, login, readTable, watchErrors } from "./_lib.mjs";

export const title = "회귀 — 2026-09-18 수정분";

export async function run(browser, cfg) {
  const rep = new Report(title);
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);

  await login(page, { base: cfg.bo, user: cfg.adminUser, pw: cfg.adminPw });

  // ── 1) 신청 목록 관객 열 — 공간별로 맞는 값을 읽는가 (1091d11)
  // 목록은 한 페이지 20건이다. 1페이지만 읽으면 중형 단독 행이 통째로 빠진다 — 첫 실행이
  // 실제로 그랬다. 빈 배열에 every() 를 걸면 "검사할 게 없으니 참" 으로 조용히 통과하므로
  // (오늘 세 번 당한 모양이다), 끝까지 훑어 모은 뒤에 판정한다.
  let headers = null;
  const rows = [];
  for (const p of [1, 2, 3, 4, 5]) {
    await page.goto(`${cfg.bo}/admin?page=${p}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const t = await readTable(page, ["공간", "패키지", "관객"]);
    if (!t) break;
    if (!headers) headers = t.headers;
    if (!t.rows || t.rows.length === 0) break;
    rows.push(...t.rows);
  }

  if (!headers || rows.length === 0) {
    rep.add("신청 목록 표 읽기", CANNOT_READ, "표 또는 행을 읽지 못했습니다");
  } else {
    rep.check(
      "관객 열 제목이 「1회당」을 밝힌다",
      headers.find((h) => h.includes("관객")) ?? CANNOT_READ,
      (h) => h.includes("1회당"),
      (h) => `「${h}」`,
    );

    const mid = rows.filter((r) => r["공간"].includes("중형"));
    rep.check(
      "중형 단독 행의 관객수가 0 이 아니다",
      mid.length === 0 ? CANNOT_READ : mid,
      (rows) => rows.every((r) => r["관객"] !== "0" && r["관객"] !== ""),
      (rows) => `${rows.length}행 — ${rows.map((r) => r["관객"]).join(", ")}`,
    );

    const sim = rows.filter((r) => r["공간"].includes("동시"));
    rep.check(
      "동시 대관 행에 중형 보조줄이 붙는다",
      sim.length === 0 ? CANNOT_READ : sim,
      (rows) => rows.every((r) => (r["관객_보조"] ?? "").includes("중형")),
      (rows) => `${rows.length}행 — ${rows.map((r) => r["관객_보조"] ?? "없음").join(" / ")}`,
    );
  }

  // ── 2) 심사표 Ver.26-09-13 (1b878b1) — 아레나·중형 두 화면
  for (const [id, tag, prefix] of [
    [cfg.arenaQuote, "아레나", "A"],
    [cfg.midQuote, "중형", "M"],
  ]) {
    await page.goto(`${cfg.bo}/admin/${id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const body = await flatText(page);

    if (!/심사 채점 초안|평가 세부 기준/.test(body)) {
      rep.add(`[${tag} ${id}] 심사 화면 도달`, CANNOT_READ, "화면을 못 찾았습니다(신청서가 없어졌을 수 있음)");
      continue;
    }

    rep.check(`[${tag}] 배점표 버전 26-09-13`, body, (b) => /Ver\. ?26-09-13/.test(b), () => "");
    rep.check(`[${tag}] 옛 버전 26-08-22 안 보임`, body, (b) => !/Ver\. ?26-08-22/.test(b), () => "");
    rep.check(
      `[${tag}] 마케팅 실행 계획 3구간`,
      body,
      (b) => /구체화 5 · 중간 3 · 미흡 0/.test(b),
      () => "구체화 5 · 중간 3 · 미흡 0",
    );
    rep.check(`[${tag}] 옛 4구간 문구 사라짐`, body, (b) => !/전부 5 · 3개 3/.test(b), () => "");
    rep.check(`[${tag}] DQ-01 「계획 적정성 부족」 포함`, body, (b) => /계획 적정성 부족/.test(b), () => "");

    const codes = [...new Set(body.match(/[AM]-(?:REV|PUB|MKT|SAF|BON|PEN)-\d\d/g) || [])];
    rep.check(
      `[${tag}] 항목 코드가 전부 ${prefix}- 접두`,
      codes.length === 0 ? CANNOT_READ : codes,
      (cs) => cs.every((c) => c.startsWith(`${prefix}-`)),
      (cs) => `${cs.length}개 · 어긋남 ${cs.filter((c) => !c.startsWith(`${prefix}-`)).join(", ") || "없음"}`,
    );

    // 감점은 라벨과 폭이 별개 <span> 이라 개행이 낀다 — flatText 로 눌러서 본다.
    const pens = [
      ["3년 내 대관 계약 해지 이력", "-5"],
      ["대관 승인 이후 취소 이력", "-3"],
      ["정산 분쟁 이력", "-5"],
      ["공연장 정책 위반 이력", "-3"],
      ["중대 안전사고/법규 위반 이력", "-10"],
    ];
    rep.check(
      `[${tag}] 감점 5줄이 배점표 순서·폭대로`,
      body,
      (b) => pens.every(([l, p]) => new RegExp(`${l.replace(/[/]/g, "\\/")} ?${p}`).test(b)),
      () => "-5 · -3 · -5 · -3 · -10",
    );
    rep.check(
      `[${tag}] 감점은 노출만 하고 점수를 깎지 않는다`,
      body,
      (b) => /감점 −0/.test(b),
      () => "감점 −0",
    );
  }

  // ── 3) 신청 내역 저장 버튼 3종 (636cc93 / 11dec92)
  await page.goto(`${cfg.bo}/admin/${cfg.arenaQuote}/application`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  for (const name of ["워드 저장", "문서 저장", "PDF 저장"]) {
    const n = await page.getByRole("button", { name }).count();
    rep.check(`「${name}」 버튼`, n === 0 ? CANNOT_READ : n, (c) => c > 0, (c) => `${c}개`);
  }

  rep.check("JS 에러 없음", errs.js.length === 0 ? "없음" : errs.js[0], (v) => v === "없음", (v) => v);
  rep.check(
    "4xx 응답 없음",
    errs.http.length === 0 ? "없음" : errs.http[0],
    (v) => v === "없음",
    (v) => v,
  );

  await ctx.close();
  return rep;
}
