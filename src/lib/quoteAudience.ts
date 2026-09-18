// [신규 2026-09-18] 백오피스 「신청 현황」 목록의 관객 열이 읽을 값을 고른다.
//
// 이 열은 공간과 무관하게 항상 selection.expectedAudience 만 읽고 있었다. 그런데
// expectedAudience 는 **아레나 몫**이고(pricing/types.ts "동시 대관 시 아레나 값"),
// 중형 단독 신청의 관객수는 secondaryAudience 에 들어간다 — 그래서 중형 단독 행은
// 신청자가 관객수를 제대로 적어 냈어도 목록에 항상 0 으로 떴다("신청현황 탭 관객수
// 필드에 동기화가 안 되는 이슈", niki 2026-09-18).
//
// 같은 화면의 공간 라벨은 이미 bookingMode → venueId 순으로 판정한다(admin/page.tsx).
// 라벨과 값이 다른 기준으로 갈리면 「중형공연장 / 0명」 같은 행이 다시 생기므로 판정
// 기준을 하나로 두고 양쪽이 같이 쓴다.
//
// 값은 모두 **1회당** 관객 수다(총 관객수는 어디에도 저장되지 않는다 — 위저드가 화면
// 표시용으로만 회차를 곱한다). 심사표 「예상 관객 규모」도 1회당 기준이라 열 제목에
// 그 사실을 드러내야 한다.
import type { QuoteSelection } from "@/lib/pricing/types";

export interface RowAudience {
  /** 목록에 크게 찍는 값 — 그 신청서의 주 공간 1회당 예상 관객 수 */
  main: number;
  /** 동시 대관에서만 존재하는 중형 몫(1회당). 단독 신청이면 null */
  sub: number | null;
}

type AudienceFields = Pick<
  QuoteSelection,
  "bookingMode" | "venueId" | "expectedAudience" | "secondaryAudience"
>;

export function rowAudience(selection: AudienceFields): RowAudience {
  // 동시 대관은 venueId 가 "arena" 로 고정돼 있어 venueId 만으로는 구분되지 않는다 —
  // 공간 라벨과 같은 이유로 bookingMode 를 먼저 본다.
  if (selection.bookingMode === "SIMULTANEOUS") {
    return { main: selection.expectedAudience, sub: selection.secondaryAudience };
  }
  if (selection.venueId === "medium-hall") {
    return { main: selection.secondaryAudience, sub: null };
  }
  return { main: selection.expectedAudience, sub: null };
}
