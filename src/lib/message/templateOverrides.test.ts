import { afterEach, describe, expect, it } from "vitest";
import { parseTemplateOverrides, resolveKakaoButtonUrl, resolveKakaoTemplateCode } from "./templateOverrides";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("환경별 템플릿 덮어쓰기", () => {
  it("변수가 없으면 정의값 그대로", () => {
    delete process.env.BIZTALK_TEMPLATE_OVERRIDES;
    delete process.env.BIZTALK_BUTTON_URL;
    expect(resolveKakaoTemplateCode("MB-02", "CTSELARNA0_00002")).toBe("CTSELARNA0_00002");
    expect(resolveKakaoButtonUrl("https://partner.seoularena.net/")).toBe("https://partner.seoularena.net/");
  });
  it("dev 신규 템플릿·링크로 갈아탄다 — 코드 배포 없이 환경변수만", () => {
    process.env.BIZTALK_TEMPLATE_OVERRIDES = "MB-02=MB-02-DEV, MB-03=MB-03-DEV";
    process.env.BIZTALK_BUTTON_URL = "https://partner.dev.seoularena.net/";
    expect(parseTemplateOverrides()).toEqual({ "MB-02": "MB-02-DEV", "MB-03": "MB-03-DEV" });
    expect(resolveKakaoTemplateCode("MB-02", "CTSELARNA0_00002")).toBe("MB-02-DEV");
    expect(resolveKakaoTemplateCode("MB-01", "CTSELARNA0_00001")).toBe("CTSELARNA0_00001");
    expect(resolveKakaoButtonUrl("https://partner.seoularena.net/")).toBe("https://partner.dev.seoularena.net/");
  });
});
