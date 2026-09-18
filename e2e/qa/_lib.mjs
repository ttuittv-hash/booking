// QA 러너 공용 토대 — 「개발 끝나고 마지막에 한 번 돌려서 정상/정상/정상」을 위한 것.
//
// 이 파일의 목적은 헬퍼 모음이 아니라 **규칙을 구조로 박는 것**이다. 2026-09-18 하루에
// 프로브 판정을 다섯 번 틀렸고, 다섯 번 다 같은 모양이었다:
//
//   ① 못 읽었는데 "0" 으로 단정했다        → 요금표 객석 규모를 "전부 0" 이라 보고할 뻔
//   ② 못 읽었는데 "통과" 로 찍었다          → 위저드 관객수 "(입력칸 없음) !== '0'" → ✅
//   ③ 아이디 열이 없는데 "위반 0건" 이라 했다 → 0개 중 0개 위반이니 ✅
//   ④ 줄바꿈 때문에 정상 화면을 전부 ❌ 로  → 라벨과 값이 별개 <span> 이라 innerText 에 개행
//   ⑤ 파일에 문자열이 있다고 결함이라 했다   → RSC payload(<script>) 안이라 화면엔 안 보임
//
// 그래서 여기서는 **읽지 못하면 그 자리에서 실패**다. 못 읽은 값은 다른 값과 비교조차
// 하지 않는다(비교하는 순간 ①②③ 이 다시 난다). 텍스트 비교는 개행을 눌러서 하고(④),
// "보이는가" 는 getClientRects 로 본다 — getComputedStyle(자식).display 는 조상이
// display:none 이어도 none 이 아니다.
//
// 운영 원칙:
//   · **운영에서는 읽기만 한다.** 오늘 접수된 신청서가 살아 있다. 만들지도 지우지도 않는다.
//   · **자격증명은 환경변수에서만 받는다.** 기본값을 두지 않는다 — 저장소에 비밀번호를
//     박아 두는 일이 이미 e2e 스펙 여러 곳에서 벌어졌다 — 운영자·신청자 로그인 비밀번호가
//     기본값으로, 일부는 환경변수 우회조차 없이 본문에 적혀 있었다(2026-09-18 정리).
//     리터럴은 여기에도 적지 않는다. 지우자고 쓴 주석에 그 값을 옮겨 적으면 의미가 없다.

export const CANNOT_READ = Symbol("읽지 못함");

/** 환경변수 필수 — 없으면 기본값으로 때우지 않고 즉시 멈춘다. */
export function env(name, { optional = false } = {}) {
  const v = process.env[name];
  if (!v && !optional) {
    console.error(`\n❌ 환경변수 ${name} 가 필요합니다. 기본값은 두지 않습니다(자격증명을 저장소에 박지 않기 위해).`);
    process.exit(2);
  }
  return v ?? null;
}

/** 결과 수집기 — 못 읽은 항목을 통과로 세지 않는다. */
export class Report {
  constructor(title) {
    this.title = title;
    this.rows = [];
  }
  /** ok=true 통과 / ok=false 실패 / ok=CANNOT_READ 읽기 실패(=실패로 센다, 따로 표시) */
  add(label, ok, detail = "") {
    this.rows.push({ label, ok, detail });
    const mark = ok === true ? "✅" : ok === CANNOT_READ ? "⛔" : "❌";
    console.log(`  ${mark} ${label}${detail ? `  — ${detail}` : ""}`);
    return ok === true;
  }
  /** 값을 읽어 검사한다. 값이 없으면 검사하지 않고 ⛔ 로 끊는다(비교하지 않는다). */
  check(label, value, predicate, describe = (v) => String(v)) {
    if (value === CANNOT_READ || value === null || value === undefined || value === "") {
      return this.add(label, CANNOT_READ, "값을 읽지 못했습니다 — 통과로 세지 않습니다");
    }
    return this.add(label, predicate(value), describe(value));
  }
  get passed() {
    return this.rows.filter((r) => r.ok === true).length;
  }
  get unread() {
    return this.rows.filter((r) => r.ok === CANNOT_READ).length;
  }
  get failed() {
    return this.rows.length - this.passed;
  }
  summary() {
    const s = `${this.title}: ${this.passed}/${this.rows.length} 정상`;
    return this.unread > 0 ? `${s} (읽기 실패 ${this.unread}건 포함)` : s;
  }
}

/** innerText 를 한 줄로 눌러서 준다 — 라벨과 값이 별개 <span> 이면 개행이 낀다(④). */
export async function flatText(page, selector = "body") {
  return (await page.locator(selector).innerText()).replace(/\s+/g, " ");
}

/** 실제로 화면에 그려졌는가. getComputedStyle 로 판정하면 안 된다(조상 숨김을 안 물려받는다). */
export async function isVisible(locator) {
  if ((await locator.count()) === 0) return false;
  return locator.first().evaluate((el) => el.getClientRects().length > 0);
}

/**
 * 라벨 옆의 입력값을 읽는다. 못 찾으면 CANNOT_READ — 0 이나 "" 로 바꾸지 않는다(①②).
 * 이 저장소의 폼은 <label><input> 이 아니라 <span class=FIELD_LABEL> + 형제 입력이 흔하다.
 */
export async function readFieldByLabel(page, labelText) {
  const v = await page.evaluate((text) => {
    const span = [...document.querySelectorAll("span,label")].find(
      (s) => (s.textContent || "").trim() === text,
    );
    if (!span) return null;
    const own = span.querySelector?.("input");
    if (own) return own.value;
    let el = span;
    while (el && el.tagName !== "FORM" && el.tagName !== "BODY") {
      for (let sib = el.nextElementSibling; sib; sib = sib.nextElementSibling) {
        const inp = sib.tagName === "INPUT" ? sib : sib.querySelector?.("input");
        if (inp) return inp.value;
      }
      el = el.parentElement;
    }
    return null;
  }, labelText);
  return v === null ? CANNOT_READ : v;
}

/** 표를 헤더 이름으로 읽는다 — 열 위치로 박으면 열이 바뀔 때 조용히 엉뚱한 값을 읽는다. */
export async function readTable(page, headerNames) {
  return page.evaluate((names) => {
    const table = document.querySelector("table");
    if (!table) return null;
    const headers = [...table.querySelectorAll("thead th")].map((th) => (th.textContent || "").trim());
    const idx = {};
    for (const n of names) idx[n] = headers.findIndex((h) => h.includes(n));
    if (Object.values(idx).some((i) => i < 0)) return { headers, rows: null, missing: names.filter((n) => idx[n] < 0) };
    const rows = [...table.querySelectorAll("tbody tr")].map((tr) => {
      const td = [...tr.querySelectorAll("td")];
      const o = {};
      for (const n of names) {
        const cell = td[idx[n]];
        const sub = cell?.querySelector("div");
        const subText = sub ? sub.textContent.trim() : "";
        o[n] = (cell?.textContent || "").replace(subText, "").trim();
        if (subText) o[`${n}_보조`] = subText;
      }
      return o;
    });
    return { headers, rows, missing: [] };
  }, headerNames);
}

/** 로그인. 도착을 단언한다 — 실패하면 뒤 검사들이 전부 무의미해지므로 즉시 멈춘다. */
export async function login(page, { base, user, pw, expectPath = /\/(admin|mypage|$)/ }) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  const form = page.locator("form").first();
  await form
    .locator('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"])')
    .first()
    .fill(user);
  await form.locator('input[type="password"]').first().fill(pw);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).catch(() => null),
    form.locator('button[type="submit"]').first().click(),
  ]);
  if (page.url().includes("/login")) {
    console.error(`❌ 로그인 실패 (${base}) — 이후 검사는 의미가 없어 중단합니다.`);
    process.exit(1);
  }
  void expectPath;
  return page.url();
}

/** 페이지에서 JS 에러·4xx 를 모은다. 조용한 실패를 놓치지 않기 위한 것. */
export function watchErrors(page) {
  const js = [];
  const http = [];
  page.on("pageerror", (e) => js.push(e.message.slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error") js.push(m.text().slice(0, 160));
  });
  page.on("response", (r) => {
    if (r.status() >= 400) http.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  return { js, http };
}
