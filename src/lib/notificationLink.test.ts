import { describe, expect, it } from "vitest";
import { crossHostHref, notificationHref, unreadBadgeLabel } from "./notificationLink";

const ORIGIN = "https://bo.seoularena.net";
const PARTNER = "https://partner.seoularena.net";

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
    expect(notificationHref({ quoteId: "SA-1" }, "APPLICANT", PARTNER)).toBe("/mypage/SA-1");
  });

  it("링크도 신청서도 없으면 역할별 첫 화면으로 간다", () => {
    expect(notificationHref({}, "ADMIN", ORIGIN)).toBe("/admin");
    expect(notificationHref({ link: "", quoteId: "" }, "APPLICANT", PARTNER)).toBe("/mypage");
    expect(notificationHref({ link: null, quoteId: null }, "ADMIN", ORIGIN)).toBe("/admin");
  });

  it("옛 알림이 quoteId 자리에 넣어 둔 목록 이름도 그대로 살린다", () => {
    expect(notificationHref({ quoteId: "applicants" }, "ADMIN", ORIGIN)).toBe("/admin/applicants");
  });

  it("서버에서 그릴 때(origin 없음)는 저장된 링크를 그대로 쓴다", () => {
    expect(notificationHref({ link: `${ORIGIN}/admin/x` }, "ADMIN")).toBe(`${ORIGIN}/admin/x`);
  });
});

describe("unreadBadgeLabel — 종 위의 숫자", () => {
  it("하나 읽으면 하나 줄어드는 게 보인다", () => {
    expect(unreadBadgeLabel(31)).toBe("31");
    expect(unreadBadgeLabel(30)).toBe("30");
    expect(unreadBadgeLabel(9)).toBe("9");
  });

  it("세 자리부터는 99+ 로 줄인다", () => {
    expect(unreadBadgeLabel(99)).toBe("99");
    expect(unreadBadgeLabel(100)).toBe("99+");
  });

  it("없으면 아무것도 그리지 않는다", () => {
    expect(unreadBadgeLabel(0)).toBe("");
    expect(unreadBadgeLabel(-1)).toBe("");
  });
});

describe("crossHostHref — 운영자 화면과 신청자 화면은 호스트가 다르다", () => {
  it("파트너 화면에서 운영자 알림을 누르면 백오피스 주소로 보낸다", () => {
    expect(crossHostHref("/admin/applicants", "https://partner.seoularena.net")).toBe(
      "https://bo.seoularena.net/admin/applicants",
    );
    expect(crossHostHref("/admin/inquiries/abc", "https://partner.dev.seoularena.net")).toBe(
      "https://bo.dev.seoularena.net/admin/inquiries/abc",
    );
  });

  it("백오피스에서 신청자 화면 알림을 누르면 파트너 주소로 보낸다", () => {
    expect(crossHostHref("/mypage/inquiries", "https://bo.seoularena.net")).toBe(
      "https://partner.seoularena.net/mypage/inquiries",
    );
  });

  it("같은 호스트로 가는 알림은 경로 그대로 둔다 — 화면 전환이 끊기지 않게", () => {
    expect(crossHostHref("/admin/applicants", "https://bo.seoularena.net")).toBe("/admin/applicants");
    expect(crossHostHref("/mypage", "https://partner.seoularena.net")).toBe("/mypage");
  });

  it("로컬이나 모르는 호스트는 건드리지 않는다", () => {
    expect(crossHostHref("/admin/applicants", "http://localhost:3000")).toBe("/admin/applicants");
    expect(crossHostHref("/admin", undefined)).toBe("/admin");
  });

  it("알림이 든 링크에도 같은 규칙이 걸린다", () => {
    expect(
      notificationHref({ link: "/admin/applicants" }, "ADMIN", "https://partner.seoularena.net"),
    ).toBe("https://bo.seoularena.net/admin/applicants");
    expect(notificationHref({ quoteId: "applicants" }, "ADMIN", "https://partner.seoularena.net")).toBe(
      "https://bo.seoularena.net/admin/applicants",
    );
  });
});
