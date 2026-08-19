import { describe, it, expect } from "vitest";
import { publicOrigin } from "./publicUrl";

// 초대 링크가 http://localhost:3000 으로 나가던 사고를 고정한다.
// 게이트웨이 뒤에서는 request.url 이 내부 주소라 그대로 쓰면 받는 사람이 열 수 없다.
function req(headers: Record<string, string>, url = "http://localhost:3000/api/x") {
  return new Request(url, { headers });
}

describe("publicOrigin", () => {
  it("X-Forwarded-Host 를 가장 먼저 본다", () => {
    expect(
      publicOrigin(req({ "x-forwarded-host": "partner.dev.seoularena.net", host: "localhost:3000" })),
    ).toBe("https://partner.dev.seoularena.net");
  });

  it("X-Forwarded-Proto 를 존중한다", () => {
    expect(
      publicOrigin(req({ "x-forwarded-host": "example.com", "x-forwarded-proto": "http" })),
    ).toBe("http://example.com");
  });

  it("Forwarded 헤더가 없으면 Host 를 쓴다", () => {
    expect(publicOrigin(req({ host: "bo.dev.seoularena.net" }))).toBe(
      "https://bo.dev.seoularena.net",
    );
  });

  it("로컬 개발은 http 로 본다", () => {
    expect(publicOrigin(req({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });

  it("환경변수가 있으면 그것을 최우선으로 쓴다", () => {
    process.env.PUBLIC_BASE_URL = "https://partner.seoularena.net/";
    expect(publicOrigin(req({ host: "localhost:3000" }))).toBe("https://partner.seoularena.net");
    delete process.env.PUBLIC_BASE_URL;
  });

  it("헤더가 전혀 없으면 요청 URL 로 되돌아간다", () => {
    expect(publicOrigin(req({}, "https://fallback.example/api/x"))).toBe("https://fallback.example");
  });
});
