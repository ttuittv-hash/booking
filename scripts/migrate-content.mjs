#!/usr/bin/env node
/*
  콘텐츠 데이터 이관 — preview → dev (2026-08-30).

  옮기는 것은 운영자가 백오피스에서 등록·편집한 것들이다 — 요금표(패키지·옵션 포함),
  콘텐츠 관리 내역(페이지 콘텐츠·화면 문구·공지·FAQ), 안내 페이지, 알림 규칙,
  일정 차단일, 기능정의서.

  실행이 끝나면 화면 단위로 "무엇이 몇 건 옮겨졌는지" 를 다시 한 번 정리해 준다 —
  표 이름만 봐서는 요금표·패키지·콘텐츠가 실제로 갔는지 알기 어렵기 때문이다.

  회원·신청서·계약·정산처럼 그 환경에서 생긴 업무 데이터는 건드리지 않는다 — 환경마다
  계정과 번호 체계가 달라 섞으면 되돌릴 수 없다.

  기본은 **연습 실행(dry run)** 이다. 무엇이 몇 건 바뀌는지 먼저 찍어 보고,
  확인한 뒤에 --apply 를 붙여 실제로 쓴다.

    node scripts/migrate-content.mjs                    # 연습 실행
    node scripts/migrate-content.mjs --apply            # 실제 이관
    node scripts/migrate-content.mjs --apply --replace  # 원본에 없는 행은 지워 원본과 똑같이

  Render 의 External Database URL 로 붙을 때는 SSL 이 필요하다. 주소 끝에 ?sslmode=require
  가 없으면 붙여 주고, 그래도 "self-signed certificate" 로 막히면 --ssl-no-verify 를 준다
  (관리형 DB 가 사설 CA 를 쓰는 경우다 — 이관은 한 번 쓰고 마는 작업이라 이 정도로 둔다).

  환경변수:
    SOURCE_DATABASE_URL   가져올 곳 (preview)
    TARGET_DATABASE_URL   넣을 곳   (dev)

  주의 — 업로드 파일은 DB 가 아니라 디스크(DATA_DIR)에 있다. 공지 이미지·첨부, 안내
  페이지 본문에 박힌 이미지는 행만 옮기면 링크가 깨진다. 어떤 행이 파일을 참조하는지
  실행 끝에 따로 알려 주므로, 그 파일들은 볼륨에서 직접 복사해야 한다.
*/

import pg from "pg";

const APPLY = process.argv.includes("--apply");
const REPLACE = process.argv.includes("--replace");
const NO_VERIFY = process.argv.includes("--ssl-no-verify");
const only = process.argv.find((a) => a.startsWith("--tables="));
const extra = process.argv.find((a) => a.startsWith("--include="));

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;

/**
 * 옮길 표와 "같은 것"으로 볼 열쇠.
 *
 * 열쇠가 두 벌인 표가 있다(pages 는 id 도 유일하고 page_group+slug 도 유일하다).
 * 한 쪽만 보고 넣으면 다른 쪽 제약에 걸리므로, 넣기 전에 두 열쇠 모두로 지운다.
 */
const TABLES = [
  // 패키지와 옵션은 별도 표가 아니라 요금표 안(packages_json · addons_json)에 있다 —
  // 어드민의 [요금표 관리]와 [패키지 관리]가 같은 행을 본다.
  {
    name: "rate_tables",
    keys: [["version"]],
    label: "요금표 · 패키지 · 옵션",
    screen: "요금표 관리 · 패키지 관리",
    warn:
      "화면에 뜨는 요금표는 updated_at 이 가장 늦은 행이다. 대상에 더 늦게 손댄 행이 있으면 " +
      "옮겨도 그쪽이 계속 현재 요금표로 남는다(이관 후 어느 버전이 현재인지 아래에 찍는다)",
  },
  {
    name: "site_content",
    keys: [["page"]],
    label: "페이지 콘텐츠 · 화면 문구",
    screen: "콘텐츠 관리",
  },
  { name: "notices", keys: [["id"]], label: "공지사항", screen: "콘텐츠 관리", files: ["image_url", "attachment_url"] },
  { name: "faqs", keys: [["id"]], label: "FAQ", screen: "콘텐츠 관리" },
  { name: "pages", keys: [["id"], ["page_group", "slug"]], label: "안내 페이지", screen: "페이지 관리", files: ["body"] },
  { name: "notification_rules", keys: [["id"], ["type_code"]], label: "알림 규칙", screen: "알림 관리" },
  { name: "date_blocks", keys: [["date"]], label: "일정 차단일", screen: "일정 관리" },
  { name: "feature_spec_sheets", keys: [["sheet_key"]], label: "기능정의서 시트", screen: "기능정의서" },
];

/**
 * 기본에서 뺀 표 — 옮기려면 --include= 로 이름을 직접 준다.
 * 그냥 옮기면 사고가 나는 것들이라 일부러 손이 한 번 더 가게 뒀다.
 */
const OPT_IN = [
  {
    name: "message_templates",
    keys: [["code"]],
    label: "메시지 템플릿",
    warn: "카카오에 등록된 템플릿과 글자가 어긋나면 발송이 거절된다",
  },
  {
    name: "review_criteria_documents",
    keys: [["id"]],
    label: "심사 기준 문서",
    files: ["file_path"],
    warn: "uploaded_by 가 users(id) 를 참조한다 — 그 계정이 dev 에 없으면 넣다가 실패한다. 파일 자체도 디스크에 있어 함께 옮겨야 한다",
  },
];

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!SOURCE || !TARGET) die("SOURCE_DATABASE_URL 과 TARGET_DATABASE_URL 을 모두 설정하세요.");
if (SOURCE === TARGET) die("원본과 대상이 같습니다. 주소를 확인하세요.");

const picked = (() => {
  const base = only
    ? [...TABLES, ...OPT_IN].filter((t) => only.slice("--tables=".length).split(",").includes(t.name))
    : TABLES;
  const add = extra
    ? OPT_IN.filter((t) => extra.slice("--include=".length).split(",").includes(t.name))
    : [];
  // --tables= 로 직접 고른 경우 중복이 생길 수 있다.
  return [...new Map([...base, ...add].map((t) => [t.name, t])).values()];
})();
if (!picked.length) die("옮길 표가 없습니다. --tables= 이름을 확인하세요.");

/** 두 DB 에 모두 있는 열만 옮긴다 — 한쪽에 새 열이 생겨도 멈추지 않게. */
async function commonColumns(src, dst, table) {
  const q = `SELECT column_name FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = $1`;
  const [a, b] = await Promise.all([src.query(q, [table]), dst.query(q, [table])]);
  const bs = new Set(b.rows.map((r) => r.column_name));
  return a.rows.map((r) => r.column_name).filter((c) => bs.has(c));
}

/**
 * 관리형 DB(Render 등)는 외부 접속에 SSL 을 요구하는데 인증서가 사설 CA 인 경우가 있다.
 * 주소에 sslmode 가 적혀 있으면 pg 가 알아서 처리하고, --ssl-no-verify 를 주면
 * 인증서 검증만 끈다. localhost 로 포워딩해 붙는 쪽은 그대로 둔다.
 */
function clientFor(url) {
  const local = /@(localhost|127\.0\.0\.1|\/)/.test(url) || url.includes("host=/");
  return new pg.Client({
    connectionString: url,
    ...(NO_VERIFY && !local ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

const source = clientFor(SOURCE);
const target = clientFor(TARGET);

try {
  await source.connect();
} catch (e) {
  die(`원본(preview) 에 접속하지 못했습니다.\n  ${e.message}\n` +
      `  Render 주소라면 끝에 ?sslmode=require 를 붙이고, 그래도 인증서 오류가 나면 --ssl-no-verify 를 주세요.`);
}
try {
  await target.connect();
} catch (e) {
  await source.end().catch(() => {});
  die(`대상(dev) 에 접속하지 못했습니다.\n  ${e.message}`);
}

console.log(`\n콘텐츠 이관 ${APPLY ? "(실제 실행)" : "(연습 실행 — 아무 것도 바뀌지 않습니다)"}`);
if (REPLACE) console.log("원본에 없는 행은 대상에서 지웁니다(--replace).");
console.log("─".repeat(72));

const fileRefs = [];
let totalIn = 0;
let totalDel = 0;

try {
  if (APPLY) await target.query("BEGIN");

  for (const t of picked) {
    const cols = await commonColumns(source, target, t.name);
    if (!cols.length) {
      console.log(`  ${t.name.padEnd(26)} 건너뜀 — 대상에 표가 없습니다`);
      continue;
    }

    const rows = (await source.query(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${t.name}"`)).rows;
    const before = Number((await target.query(`SELECT COUNT(*)::int AS n FROM "${t.name}"`)).rows[0].n);

    // 파일을 가리키는 값이 있으면 모아 뒀다가 끝에 알려 준다.
    for (const r of rows) {
      for (const f of t.files ?? []) {
        const v = String(r[f] ?? "");
        for (const m of v.matchAll(/\/api\/[\w/-]*(?:upload|attachment)[\w/.-]*/g)) {
          fileRefs.push(`${t.name}: ${m[0]}`);
        }
      }
    }

    let deleted = 0;
    if (APPLY) {
      if (REPLACE) {
        deleted = (await target.query(`DELETE FROM "${t.name}"`)).rowCount ?? 0;
      } else {
        // 같은 열쇠를 가진 대상 행만 비우고 새로 넣는다 = 덮어쓰기.
        for (const key of t.keys) {
          if (!key.every((k) => cols.includes(k))) continue;
          for (const r of rows) {
            const where = key.map((k, i) => `"${k}" = $${i + 1}`).join(" AND ");
            deleted += (await target.query(`DELETE FROM "${t.name}" WHERE ${where}`, key.map((k) => r[k])))
              .rowCount ?? 0;
          }
        }
      }
      for (const r of rows) {
        const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
        await target.query(
          `INSERT INTO "${t.name}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${ph})`,
          cols.map((c) => r[c]),
        );
      }
    }

    totalIn += rows.length;
    totalDel += deleted;
    console.log(
      `  ${t.name.padEnd(26)} 원본 ${String(rows.length).padStart(4)}건  대상(전) ${String(before).padStart(4)}건` +
        (APPLY ? `  → 삭제 ${deleted} / 삽입 ${rows.length}` : "  → 덮어쓸 예정") +
        `   ${t.label}${t.screen ? ` [${t.screen}]` : ""}`,
    );
    if (t.warn) console.log(`      ⚠ ${t.warn}`);
  }

  if (APPLY) {
    await target.query("COMMIT");
    console.log(`\n✓ 이관 완료 — 삽입 ${totalIn}건 / 삭제 ${totalDel}건`);

    // 요금표는 "가장 늦게 손댄 행"이 현재 요금표가 된다(getCurrentRateTable).
    // 옮겼는데 대상의 다른 행이 더 늦으면 화면은 그대로다 — 그 경우를 눈에 띄게 알린다.
    if (picked.some((t) => t.name === "rate_tables")) {
      const cur = (
        await target.query(
          "SELECT version, updated_at FROM rate_tables ORDER BY updated_at DESC LIMIT 1",
        )
      ).rows[0];
      const src = (
        await source.query(
          "SELECT version, updated_at FROM rate_tables ORDER BY updated_at DESC LIMIT 1",
        )
      ).rows[0];
      if (cur) {
        console.log(`\n현재 요금표(대상): ${cur.version}  (updated_at ${cur.updated_at})`);
        if (src && cur.version !== src.version) {
          console.log(
            `  ⚠ 원본의 최신은 ${src.version}(${src.updated_at}) 인데 대상에서는 위 버전이 현재입니다.\n` +
              `    대상에 더 늦게 손댄 행이 있다는 뜻입니다 — 원본 것을 쓰려면 그 행의 updated_at 을\n` +
              `    올리거나 --replace 로 대상 요금표를 원본과 똑같이 맞추세요.`,
          );
        }
      }
    }
  } else {
    console.log(`\n연습 실행이라 대상 DB 는 그대로입니다. 실제로 옮기려면 --apply 를 붙이세요.`);
  }
} catch (e) {
  if (APPLY) await target.query("ROLLBACK").catch(() => {});
  die(`이관 실패 — 아무 것도 반영되지 않았습니다(롤백).\n  ${e.message}`);
} finally {
  await source.end();
  await target.end();
}

/*
  화면 단위 확인 — 표 이름만 봐서는 "요금표·패키지·콘텐츠가 실제로 갔나" 를 알 수 없다.
  이관이 끝난 뒤 대상 DB 를 다시 읽어, 어드민 화면 기준으로 원본과 건수가 맞는지 본다.
  건수만 보는 것이라 내용까지 같다는 보장은 아니지만, 통째로 빠진 것은 여기서 잡힌다.
*/
if (APPLY) {
  const src2 = clientFor(SOURCE);
  const dst2 = clientFor(TARGET);
  await src2.connect();
  await dst2.connect();
  console.log(`\n확인 — 어드민 화면 기준`);
  console.log("─".repeat(72));
  const byScreen = new Map();
  for (const t of picked) {
    const k = t.screen ?? t.label;
    if (!byScreen.has(k)) byScreen.set(k, []);
    byScreen.get(k).push(t);
  }
  for (const [screen, list] of byScreen) {
    const parts = [];
    let ok = true;
    for (const t of list) {
      const n = async (c) =>
        Number((await c.query(`SELECT COUNT(*)::int AS n FROM "${t.name}"`)).rows[0].n);
      const [a, b] = await Promise.all([n(src2), n(dst2)]);
      if (b < a) ok = false;
      parts.push(`${t.label} ${b}/${a}건`);
    }
    console.log(`  ${ok ? "✓" : "✗"} ${screen.padEnd(22)} ${parts.join(" · ")}`);
  }
  console.log(`  (대상/원본 건수. 대상이 더 많으면 원본에 없던 행이 대상에 남아 있는 것입니다)`);
  await src2.end();
  await dst2.end();
}

const skipped = [...TABLES, ...OPT_IN].filter((t) => !picked.some((p) => p.name === t.name));
if (skipped.length) {
  console.log(`\n이번에 옮기지 않은 것 — 필요하면 --include= 로 이름을 주세요.`);
  for (const t of skipped) {
    console.log(`    ${t.name.padEnd(26)} ${t.label}${t.screen ? ` [${t.screen}]` : ""}`);
  }
}

if (fileRefs.length) {
  const uniq = [...new Set(fileRefs)];
  console.log(`\n⚠ 업로드 파일을 가리키는 값 ${uniq.length}건 — DB 만 옮기면 링크가 깨집니다.`);
  console.log(`  파일은 DATA_DIR 볼륨에 있으니 따로 복사하세요.`);
  for (const f of uniq.slice(0, 20)) console.log(`    ${f}`);
  if (uniq.length > 20) console.log(`    … 외 ${uniq.length - 20}건`);
}
