import { describe, expect, it } from "vitest";
import { NOTICE_TAGS, PINNED_NOTICE_TAG, isPinnedTag, normalizeNoticeTag } from "@/components/TagBadge";

describe("공지 말머리 — 승격 말머리는 '대관공지' 하나다 (2026-09-04 개명)", () => {
  it("닫힌 목록의 첫 자리가 승격 말머리다", () => {
    expect(PINNED_NOTICE_TAG).toBe("대관공지");
    expect(NOTICE_TAGS[0]).toBe("대관공지");
  });

  it("옛 이름(대관공고)으로 저장된 공지도 같은 말머리로 보인다", () => {
    for (const old of ["대관공고", "대관 공고", "공고", "모집공고", "대관공모", "대관모집"]) {
      expect(normalizeNoticeTag(old)).toBe("대관공지");
      expect(isPinnedTag(old)).toBe(true);
    }
  });

  it("다른 말머리는 승격되지 않는다", () => {
    expect(normalizeNoticeTag("접수 마감 안내")).toBe("접수일정");
    expect(normalizeNoticeTag("대관료 변경")).toBe("요금안내");
    expect(normalizeNoticeTag("정기 점검")).toBe("시스템");
    expect(isPinnedTag("접수일정")).toBe(false);
    expect(isPinnedTag(null)).toBe(false);
  });

  it("모르는 말머리는 일반안내로 모은다", () => {
    expect(normalizeNoticeTag("아무말")).toBe("일반안내");
    expect(normalizeNoticeTag(null)).toBeNull();
  });
});
