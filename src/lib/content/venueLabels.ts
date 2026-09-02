import { VENUES } from "@/lib/pricing/types";

/**
 * 공간(탭) 이름을 운영자가 바꿀 수 있게 하는 한 곳 (2026-09-02).
 *
 * 공간 이름은 위저드 탭·패키지 관리 탭·요금표·신청 내역까지 같은 말로 나가야 하는데,
 * 예전에는 `VENUES` 의 name 이 코드에 박혀 있어 이름을 바꾸려면 배포를 해야 했다.
 * 문구 저장소(`ScreenTextContent.wizardStrings`)의 한 key 로 덮어쓴다 — 위저드 화면은
 * 이미 그 맵을 Provider 로 받고 있어서, 운영자 문구 관리에서 그대로 편집된다.
 *
 * key 는 공간 id 로 만든다. 새 공간을 `VENUES` 에 추가하면 별도 등록 없이 따라온다.
 */
export function venueLabelKey(venueId: string): string {
  return `venue.${venueId}.name`;
}

/** 코드에 박힌 기본 이름. 운영자가 아직 안 바꿨을 때 쓰는 값이다. */
export function defaultVenueName(venueId: string): string {
  return VENUES.find((v) => v.id === venueId)?.name ?? venueId;
}

/**
 * 화면에 쓸 공간 이름. 운영자가 비워 두면(공백만 남겨도) 기본 이름으로 되돌린다 —
 * 빈 탭 이름은 누를 곳이 사라진 것처럼 보인다.
 */
export function venueLabel(venueId: string, overrides?: Record<string, string>): string {
  const custom = overrides?.[venueLabelKey(venueId)]?.trim();
  return custom || defaultVenueName(venueId);
}

/**
 * 대관료 페이지(투뎁스) 탭 이름 (2026-09-02).
 *
 * 대관료 화면의 토글만 영문 표기를 쓴다 — 위저드·신청 내역은 한글 공간 이름 그대로다.
 * 그래서 `venue.<id>.name` 과는 다른 key 를 둔다. 하나만 고쳐도 다른 화면이 따라
 * 바뀌면 안 되기 때문이다.
 */
export function venueRateTabKey(venueId: string): string {
  return `venue.${venueId}.rateTab`;
}

const DEFAULT_RATE_TAB: Record<string, string> = {
  arena: "ARENA RATE",
  "medium-hall": "Live Hall RATE",
  "special-hall": "All in One RATE",
};

export function defaultVenueRateTab(venueId: string): string {
  return DEFAULT_RATE_TAB[venueId] ?? defaultVenueName(venueId);
}

export function venueRateTab(venueId: string, overrides?: Record<string, string>): string {
  const custom = overrides?.[venueRateTabKey(venueId)]?.trim();
  return custom || defaultVenueRateTab(venueId);
}
