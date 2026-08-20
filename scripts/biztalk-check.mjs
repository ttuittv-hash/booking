#!/usr/bin/env node
// DKT BizMsg 연동 점검 — 방화벽이 열린 뒤(2026-08-24 오후 예정) 클러스터 안에서 돌린다.
//
//   kubectl -n arena-dev exec deploy/arena -- node scripts/biztalk-check.mjs
//
// 밖에서 돌리면 아웃바운드 IP 가 달라 결과가 다르다 — DKT 는 목적지 IP 기준으로 열어 준다.
//
// 확인하는 것
//   1) 검증 서버에 닿는가
//   2) 토큰이 발급되는가 (Basic "{id} {secret}" 공백 구분 형식)
//   3) 발송 URL 의 {cid} 가 무엇인가 — 가이드에 설명이 없어 두 형태를 모두 찔러 본다
//   4) 결과 폴링이 응답하는가
//
// 실제 발송은 하지 않는다. 3)은 수신번호 없이 보내 400 계열을 받는 것으로 경로 존재만 본다.

const BASE = (process.env.BIZTALK_BASE_URL || "https://cbt-web.dktechinmsg.com").replace(/\/+$/, "");
const ID = process.env.BIZTALK_CLIENT_ID;
const SECRET = process.env.BIZTALK_CLIENT_SECRET;
const SENDER_KEY = process.env.BIZTALK_SENDER_KEY;

const line = (ok, label, detail = "") =>
  console.log(`${ok ? "OK  " : "NG  "} ${label}${detail ? "  — " + detail : ""}`);

if (!ID || !SECRET) {
  console.error("BIZTALK_CLIENT_ID / BIZTALK_CLIENT_SECRET 가 없다. 시크릿을 확인할 것.");
  process.exit(2);
}

// 1) 연결
try {
  const res = await fetch(`${BASE}/v2/document/index.html`, { signal: AbortSignal.timeout(10_000) });
  line(true, "검증 서버에 닿는다", `status ${res.status}`);
} catch (e) {
  line(false, "검증 서버에 닿지 않는다", String(e.message || e));
  console.log("\n방화벽이 아직 열리지 않았을 수 있다. DKT 에 이 서버의 아웃바운드 IP 를 확인해 줄 것.");
  process.exit(1);
}

// 2) 토큰
let token = null;
try {
  const res = await fetch(`${BASE}/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${ID} ${SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json().catch(() => ({}));
  token = json.access_token ?? null;
  line(!!token, "토큰 발급", token ? `만료 ${json.expires_in ?? "?"}초` : JSON.stringify(json).slice(0, 120));
} catch (e) {
  line(false, "토큰 발급", String(e.message || e));
}
if (!token) process.exit(1);

// 3) {cid} 정체 — 두 형태로 같은 요청을 보내 어느 쪽이 경로로 인정되는지 본다.
//    수신번호를 비워 두었으므로 어느 쪽도 실제로 발송되지 않는다.
for (const [label, cid] of [["메시지 고유 ID", "check-" + process.pid], ["계약 ID(clientId)", ID]]) {
  try {
    const res = await fetch(`${BASE}/v2/request/${encodeURIComponent(cid)}/kakao`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message_type: "AT",
        sender_key: SENDER_KEY,
        template_code: "__connectivity_check__",
        phone_number: "",
        message: "",
        fall_back_yn: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.text()).slice(0, 160);
    // 404 면 그 경로 형태가 아니다. 400/유효성 오류면 경로는 맞고 본문만 틀린 것이다.
    line(res.status !== 404, `cid = ${label}`, `status ${res.status} · ${body}`);
  } catch (e) {
    line(false, `cid = ${label}`, String(e.message || e));
  }
}

// 4) 결과 폴링
try {
  const res = await fetch(`${BASE}/v2/info/message/results`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.text()).slice(0, 160);
  line(res.ok, "결과 폴링", `status ${res.status} · ${body}`);
} catch (e) {
  line(false, "결과 폴링", String(e.message || e));
}

console.log("\n※ 실제 발송은 하지 않았다. 템플릿 사전심사가 끝난 뒤 유저웹에서 테스트 발송할 것.");
