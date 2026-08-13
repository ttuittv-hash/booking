import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkCompanyNumber,
  isBlockedCompanyStatus,
  isNiceConfigured,
  normalizeCompanyName,
} from "./nice";

// 실제 사업자등록증(주식회사 카카오엔터프라이즈, 741-81-01531, 대표자 이원주)을 기준으로
// NICE 법인실명확인 응답을 재현해 판정 로직을 검증한다.
const KAKAO_ENTERPRISE = {
  compNum: "741-81-01531",
  name: "주식회사 카카오엔터프라이즈",
  representative: "이원주",
};

function niceResponse(dataBody: Record<string, string>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      dataHeader: { GW_RSLT_CD: "1200", GW_RSLT_MSG: "오류없음" },
      dataBody,
    }),
  };
}

function tokenResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      dataHeader: { GW_RSLT_CD: "1200" },
      dataBody: { access_token: "test-token", expires_in: 3600, token_type: "bearer" },
    }),
  };
}

/** 토큰 발급 1회 + 조회 1회 순서로 응답을 돌려주는 fetch 스텁 */
function stubFetch(checkBody: Record<string, string>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return url.includes("/oauth/token") ? tokenResponse() : niceResponse(checkBody);
    }),
  );
  return calls;
}

describe("NICE 사업자 진위확인", () => {
  beforeEach(() => {
    process.env.NICE_CLIENT_ID = "test-client";
    process.env.NICE_CLIENT_SECRET = "test-secret";
    globalThis.__niceToken = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NICE_CLIENT_ID;
    delete process.env.NICE_CLIENT_SECRET;
  });

  it("정상 법인은 상호·대표자·상태를 파싱한다", async () => {
    const calls = stubFetch({
      rsp_cd: "P000",
      result_cd: "01",
      comp_num: "7418101531",
      comp_name: KAKAO_ENTERPRISE.name,
      representive_name: KAKAO_ENTERPRISE.representative,
      comp_status: "1",
      comp_type: "4",
    });

    const result = await checkCompanyNumber(KAKAO_ENTERPRISE.compNum);

    expect(result.status).toBe("VERIFIED");
    expect(result.companyName).toBe(KAKAO_ENTERPRISE.name);
    expect(result.representativeName).toBe(KAKAO_ENTERPRISE.representative);
    expect(result.compStatusLabel).toBe("정상");
    expect(result.compTypeLabel).toBe("일반");
    expect(isBlockedCompanyStatus(result)).toBe(false);

    // 하이픈은 제거하고 10자리 숫자만 보낸다
    const checkCall = calls.find((c) => c.url.includes("/comp/check"));
    expect(JSON.parse(String(checkCall?.init?.body))).toMatchObject({
      dataBody: { comp_num: "7418101531" },
    });
  });

  it("폐업·휴업·부도는 가입 차단 대상이다", async () => {
    for (const [code, label] of [
      ["8", "폐업"],
      ["7", "휴업"],
      ["6", "부도"],
    ]) {
      globalThis.__niceToken = undefined;
      stubFetch({
        rsp_cd: "P000",
        result_cd: "01",
        comp_name: KAKAO_ENTERPRISE.name,
        representive_name: KAKAO_ENTERPRISE.representative,
        comp_status: code,
      });
      const result = await checkCompanyNumber(KAKAO_ENTERPRISE.compNum);
      expect(result.compStatusLabel).toBe(label);
      expect(isBlockedCompanyStatus(result)).toBe(true);
      vi.unstubAllGlobals();
    }
  });

  it("보유하지 않은 번호(result_cd 03)는 NOT_FOUND 로 표시한다", async () => {
    stubFetch({ rsp_cd: "P000", result_cd: "03" });
    const result = await checkCompanyNumber("123-45-67890");
    expect(result.status).toBe("NOT_FOUND");
    expect(isBlockedCompanyStatus(result)).toBe(false);
  });

  it("게이트웨이 오류(IP 미등록 등)는 UNCHECKED 로 두고 가입을 막지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/oauth/token")
          ? tokenResponse()
          : {
              ok: true,
              status: 200,
              json: async () => ({
                dataHeader: {
                  GW_RSLT_CD: "1702",
                  GW_RSLT_MSG: "Access is not allowed - Client ID + Client IP",
                },
              }),
            },
      ),
    );
    const result = await checkCompanyNumber(KAKAO_ENTERPRISE.compNum);
    expect(result.status).toBe("UNCHECKED");
    expect(result.message).toContain("Client IP");
    expect(isBlockedCompanyStatus(result)).toBe(false);
  });

  it("네트워크 오류도 UNCHECKED 로 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect timed out"); }));
    const result = await checkCompanyNumber(KAKAO_ENTERPRISE.compNum);
    expect(result.status).toBe("UNCHECKED");
    expect(result.message).toContain("connect timed out");
  });

  it("계정 정보가 없으면 호출하지 않는다", async () => {
    delete process.env.NICE_CLIENT_ID;
    delete process.env.NICE_CLIENT_SECRET;
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);

    expect(isNiceConfigured()).toBe(false);
    const result = await checkCompanyNumber(KAKAO_ENTERPRISE.compNum);
    expect(result.status).toBe("UNCHECKED");
    expect(spy).not.toHaveBeenCalled();
  });

  it("사업자번호 형식이 아니면 호출하지 않는다", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const result = await checkCompanyNumber("12345");
    expect(result.status).toBe("UNCHECKED");
    expect(spy).not.toHaveBeenCalled();
  });

  it("상호 표기 차이는 같은 이름으로 본다", () => {
    expect(normalizeCompanyName("주식회사 카카오엔터프라이즈")).toBe(
      normalizeCompanyName("(주)카카오엔터프라이즈"),
    );
    expect(normalizeCompanyName("㈜카카오엔터프라이즈")).toBe(
      normalizeCompanyName("카카오엔터프라이즈"),
    );
    expect(normalizeCompanyName("카카오엔터프라이즈")).not.toBe(normalizeCompanyName("카카오"));
  });
});
