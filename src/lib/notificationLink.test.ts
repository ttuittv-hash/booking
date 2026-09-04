import { describe, expect, it } from "vitest";
import { notificationHref } from "./notificationLink";

const ORIGIN = "https://bo.seoularena.net";

describe("notificationHref — 알림을 누르면 갈 곳", () => {
  it("저장된 링크가 있으면 그리로 간다", () => {
    expect(notificationHref({ link: "/admin/inquiries/abc" }, "ADMIN", ORIGIN)).toBe("/admin/inquiries/abc");
  });

  it("같은 사이트의 절대 URL 이면 경로만 남긴다 — 화면 전환이 끊기지 않게", () => {
    expect(notificationHref({ link: `${ORIGIN}/admin/applicants?tab=pending` }, "ADMIN", ORIGIN)).toBe(
      "/admin/applicants?tab=pending",
    );
  });

  it("다른 사이트 주소는 그대로 둔다", () => {
    const url = "https://partner.seoularena.net/mypage";
    expect(notificationHref({ link: url }, "ADMIN", ORIGIN)).toBe(url);
  });

  it("링크가 없으면 신청서 상세로 간다", () => {
    expect(notificationHref({ quoteId: "SA-1" }, "ADMIN", ORIGIN)).toBe("/admin/SA-1");
    expect(notificationHref({ quoteId: "SA-1" }, "APPLICANT", ORIGIN)).toBe("/mypage/SA-1");
  });

  it("링크도 신청서도 없으면 역할별 첫 화면으로 간다", () => {
    expect(notificationHref({}, "ADMIN", ORIGIN)).toBe("/admin");
    expect(notificationHref({ link: "", quoteId: "" }, "APPLICANT", ORIGIN)).toBe("/mypage");
    expect(notificationHref({ link: null, quoteId: null }, "ADMIN", ORIGIN)).toBe("/admin");
  });

  it("옛 알림이 quoteId 자리에 넣어 둔 목록 이름도 그대로 살린다", () => {
    expect(notificationHref({ quoteId: "applicants" }, "ADMIN", ORIGIN)).toBe("/admin/applicants");
  });

  it("서버에서 그릴 때(origin 없음)는 저장된 링크를 그대로 쓴다", () => {
    expect(notificationHref({ link: `${ORIGIN}/admin/x` }, "ADMIN")).toBe(`${ORIGIN}/admin/x`);
  });
});
