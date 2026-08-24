import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  classifyBizTalkCode,
  isBizTalkConfigured,
  isXmsConfigured,
  issueBizTalkToken,
  resetBizTalkToken,
  resetBizTalkBreaker,
  kakaoBizTalkAdapter,
  xmsAdapter,
  pollMessageResults,
  completePoll,
} from "./kakaoBizTalk";

// DKT 가이드(2026-08-20 수신)의 흐름을 코드가 그대로 따르는지 고정한다.
// 검증 환경은 방화벽 개방 전까지 닿지 않으므로, 여기서는 우리가 "무엇을 어디로 보내는지"만 본다.

const ENV = {
  BIZTALK_BASE_URL: "https://cbt-web.dktechinmsg.com",
  BIZTALK_CLIENT_ID: "CTSELARNA0",
  BIZTALK_CLIENT_SECRET: "secret",
  BIZTALK_SENDER_KEY: "4bcf1b2c",
  BIZTALK_SENDER_NO: "0212345678",
};

let calls: Array<{ url: string; init: RequestInit | undefined }>;

function mockFetch(responder: (url: string) => unknown) {
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => responder(String(url)) } as Response;
  });
}

beforeEach(() => {
  calls = [];
  resetBizTalkToken();
  resetBizTalkBreaker();
  Object.assign(process.env, ENV);
  delete process.env.BIZTALK_CID;
});
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k as keyof typeof ENV];
  vi.unstubAllGlobals();
  resetBizTalkToken();
  resetBizTalkBreaker();
});

const request = {
  templateCode: "MB-01",
  body: "본문",
  recipient: { userId: "u1", phone: "010-1234-5678", email: null, name: "홍길동" },
  variables: { __sendId: "send-1" },
  button: { name: "확인하기", url: "https://partner.example/notice" },
};

describe("설정 판정", () => {
  it("키가 다 있으면 알림톡이 켜진다", () => expect(isBizTalkConfigured()).toBe(true));
  it("발신번호가 없으면 알림톡·문자 모두 꺼진다 — DKT 가 알림톡에도 sender_no 를 요구한다", () => {
    delete process.env.BIZTALK_SENDER_NO;
    expect(isBizTalkConfigured()).toBe(false);
    expect(isXmsConfigured()).toBe(false);
  });
});

describe("토큰", () => {
  it("Basic 뒤에 id 와 secret 을 공백으로 나눠 보낸다 — base64 가 아니다", async () => {
    vi.stubGlobal("fetch", mockFetch(() => ({ access_token: "T", expires_in: 21600 })));
    await issueBizTalkToken();
    expect(calls[0].url).toBe("https://cbt-web.dktechinmsg.com/v2/oauth/token");
    expect(calls[0].init?.headers).toMatchObject({ Authorization: "Basic CTSELARNA0 secret" });
  });

  it("6시간 유효하면 다시 발급하지 않는다", async () => {
    vi.stubGlobal("fetch", mockFetch(() => ({ access_token: "T", expires_in: 21600 })));
    await issueBizTalkToken();
    await issueBizTalkToken();
    expect(calls.filter((c) => c.url.includes("/oauth/token"))).toHaveLength(1);
  });

  it("만료가 1시간 안쪽이면 갱신한다 — 가이드의 4~5시간 갱신 주기", async () => {
    vi.stubGlobal("fetch", mockFetch(() => ({ access_token: "T", expires_in: 600 })));
    await issueBizTalkToken();
    await issueBizTalkToken();
    expect(calls.filter((c) => c.url.includes("/oauth/token"))).toHaveLength(2);
  });
});

describe("알림톡 발송", () => {
  it("가이드의 /v2/request/{cid}/kakao 로 보낸다", async () => {
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token") ? { access_token: "T", expires_in: 21600 } : { code: "200", uid: "U1" }));
    const result = await kakaoBizTalkAdapter.send(request);
    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toBe("U1");
    const send = calls.find((c) => c.url.includes("/kakao"));
    expect(send?.url).toBe("https://cbt-web.dktechinmsg.com/v2/request/send-1/kakao");
  });

  it("cid 는 BIZTALK_CID 로 덮어쓸 수 있다 — 계약 ID 였을 경우에 대비한다", async () => {
    process.env.BIZTALK_CID = "CTSELARNA0";
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token") ? { access_token: "T", expires_in: 21600 } : { code: "200" }));
    await kakaoBizTalkAdapter.send(request);
    expect(calls.find((c) => c.url.includes("/kakao"))?.url).toContain("/v2/request/CTSELARNA0/kakao");
  });

  it("대체발송을 DKT 에 맡기지 않는다 — 우리 이력에 남기려면 우리가 보내야 한다", async () => {
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token") ? { access_token: "T", expires_in: 21600 } : { code: "200" }));
    await kakaoBizTalkAdapter.send(request);
    const body = JSON.parse(String(calls.find((c) => c.url.includes("/kakao"))?.init?.body));
    expect(body.fall_back_yn).toBe(false);
    expect(body.sender_key).toBe("4bcf1b2c");
    expect(body.phone_number).toBe("01012345678");
    expect(body.button[0]).toMatchObject({ type: "WL", url_mobile: "https://partner.example/notice" });
  });

  it("수신번호가 없으면 보내지 않는다", async () => {
    const result = await kakaoBizTalkAdapter.send({ ...request, recipient: { ...request.recipient, phone: null } });
    expect(result.ok).toBe(false);
    expect(result.failure).toBe("INVALID_NUMBER");
  });
});

describe("문자(XMS) 발송", () => {
  it("/v2/request/{cid}/xms 로 보내고 제목을 함께 넘긴다", async () => {
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token") ? { access_token: "T", expires_in: 21600 } : { code: "200", uid: "X1" }));
    const result = await xmsAdapter.send(request);
    expect(result.ok).toBe(true);
    const send = calls.find((c) => c.url.includes("/xms"));
    expect(send?.url).toBe("https://cbt-web.dktechinmsg.com/v2/request/send-1/xms");
    const body = JSON.parse(String(send?.init?.body));
    expect(body).toMatchObject({ message_type: "LM", sender_no: "0212345678", title: "서울아레나" });
  });
});

describe("결과 폴링", () => {
  it("결과를 받아 우리 형태로 옮긴다", async () => {
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token")
        ? { access_token: "T", expires_in: 21600 }
        : { report_group_no: "RG1", results: [{ cid: "send-1", uid: "U1", state_code: "200" }] }));
    const batch = await pollMessageResults();
    expect(batch.reportGroupNumber).toBe("RG1");
    expect(batch.results[0]).toMatchObject({ cid: "send-1", stateCode: "200" });
  });

  it("완료 처리는 PUT 으로 리포트그룹번호를 경로에 담는다 — 빼먹으면 같은 결과가 계속 내려온다", async () => {
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token") ? { access_token: "T", expires_in: 21600 } : { code: "200" }));
    const ok = await completePoll("RG1");
    expect(ok).toBe(true);
    expect(calls.at(-1)?.url).toBe(
      "https://cbt-web.dktechinmsg.com/v2/info/message/results/complete/RG1",
    );
    expect(calls.at(-1)?.init?.method).toBe("PUT");
  });
});

describe("결과 코드 분류", () => {
  it("템플릿·유효성 오류는 재시도하지 않는다", () => {
    for (const c of ["400", "410", "420"]) expect(classifyBizTalkCode(c)).toBe("TEMPLATE");
  });
  it("시스템·처리중은 일시 오류로 본다", () => {
    for (const c of ["100", "500", "510", "520"]) expect(classifyBizTalkCode(c)).toBe("TRANSIENT");
  });
  it("숫자로 와도 같게 판정한다", () => expect(classifyBizTalkCode(410)).toBe("TEMPLATE"));
  it("상세코드(Appendix A)가 있으면 그쪽을 우선한다", () => {
    expect(classifyBizTalkCode("410", "ERR11000")).toBe("UNREACHABLE");
    expect(classifyBizTalkCode("410", "ERR50025")).toBe("INVALID_NUMBER");
    expect(classifyBizTalkCode("500", "ERR41001")).toBe("TEMPLATE");
  });
});

describe("폴링 필드명(v2.2.1)", () => {
  it("status_code / error_message 를 읽는다", async () => {
    vi.stubGlobal("fetch", mockFetch((u) =>
      u.includes("/oauth/token")
        ? { access_token: "T", expires_in: 21600 }
        : { report_group_no: "RG2", results: [{ cid: "send-2", status_code: "510", error_message: "전송실패" }] }));
    const batch = await pollMessageResults();
    expect(batch.results[0]).toMatchObject({ cid: "send-2", stateCode: "510", message: "전송실패" });
  });
});

describe("회로 차단기", () => {
  // 가입·승인 라우트가 발송을 await 한다. DKT 가 닿지 않을 때 한 건마다 타임아웃을 기다리면
  // 회원가입(알림 3건)이 30초 넘게 붙잡힌다 — 알림이 늦는 것과 가입이 안 되는 것은 다른 문제다.
  function failingFetch() {
    return vi.fn(async () => {
      throw new Error("connect ETIMEDOUT");
    });
  }

  it("연결 실패가 3번 이어지면 이후 호출은 기다리지 않고 건너뛴다", async () => {
    const fetchMock = failingFetch();
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 3; i++) await kakaoBizTalkAdapter.send(request);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const result = await kakaoBizTalkAdapter.send(request);
    expect(result.ok).toBe(false);
    expect(result.resultCode).toBe("BREAKER_OPEN");
    // 네 번째는 아예 나가지 않았다
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("차단 중에는 문자 대체발송도 같이 건너뛴다 — 같은 서버다", async () => {
    vi.stubGlobal("fetch", failingFetch());
    for (let i = 0; i < 3; i++) await kakaoBizTalkAdapter.send(request);
    const result = await xmsAdapter.send(request);
    expect(result.resultCode).toBe("BREAKER_OPEN");
  });

  it("서버가 거절한 응답은 연결 실패로 세지 않는다 — 서버는 살아 있다", async () => {
    const fetchMock = mockFetch((u) =>
      u.includes("/oauth/token") ? { access_token: "T", expires_in: 21600 } : { code: "410" });
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 5; i++) await kakaoBizTalkAdapter.send(request);
    const result = await kakaoBizTalkAdapter.send(request);
    expect(result.resultCode).not.toBe("BREAKER_OPEN");
    expect(result.failure).toBe("TEMPLATE");
  });
});
