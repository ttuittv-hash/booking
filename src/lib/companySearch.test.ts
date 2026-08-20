import { describe, it, expect } from "vitest";
import { normalizeBusinessNumber } from "./db";

// 검색 결과에 실리는 값이 가입 전 사람에게 얼마나 보이는지가 이 화면의 설계 핵심이다.
// 마스킹/절삭 규칙이 무너지면 "회사 목록 훑기"가 가능해진다(기획서 A6).
// maskBusinessNumber·coarseAddress 는 db.ts 내부 함수라 같은 규칙을 여기 옮겨 고정한다.
function maskBusinessNumber(brn: string | null): string | null {
  if (!brn) return null;
  return brn.length <= 3 ? brn : `${brn.slice(0, 3)}-**-*****`;
}
function coarseAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const kept: string[] = [];
  for (const part of parts.slice(0, 3)) {
    kept.push(part);
    if (/(구|군)$/.test(part)) break;
  }
  return kept.join(" ") || null;
}

describe("회사 검색 노출 규칙", () => {
  it("사업자등록번호는 앞 3자리만 남는다", () => {
    expect(maskBusinessNumber("1208147521")).toBe("120-**-*****");
  });

  it("마스킹 결과에 뒷자리가 남지 않는다", () => {
    const masked = maskBusinessNumber("1208147521")!;
    expect(masked).not.toContain("8147521");
    expect(masked).not.toContain("1208147521");
  });

  it("번호가 없으면 null 이다", () => {
    expect(maskBusinessNumber(null)).toBeNull();
  });

  it("주소는 시/군/구까지만 남는다", () => {
    // 도 주소는 3단계, 광역시 주소는 2단계에서 구가 나온다 — 개수가 아니라 구/군에서 끊는다.
    expect(coarseAddress("경기도 성남시 분당구 판교역로 166")).toBe("경기도 성남시 분당구");
    expect(coarseAddress("서울특별시 도봉구 창동 1-24")).toBe("서울특별시 도봉구");
    expect(coarseAddress("강원도 평창군 대관령면 올림픽로 715")).toBe("강원도 평창군");
  });

  it("상세 주소는 노출되지 않는다", () => {
    const region = coarseAddress("경기도 성남시 분당구 판교역로 166 5층")!;
    expect(region).not.toContain("판교역로");
    expect(region).not.toContain("166");
    expect(region).not.toContain("5층");
  });

  it("주소가 없으면 null 이다", () => {
    expect(coarseAddress(null)).toBeNull();
    expect(coarseAddress("   ")).toBeNull();
  });

  it("사업자번호 검색은 표기가 달라도 같은 값으로 모인다", () => {
    expect(normalizeBusinessNumber("120-81-47521")).toBe(normalizeBusinessNumber("1208147521"));
  });
});
