import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATES_CONTENT,
  EMPTY_VENUE_RATE_CONTENT,
  RATES_CONTENT_VERSION,
  normalizeRatesContent,
  type RatesContent,
  type VenueRateContent,
} from "./pageContent";

const filled = (intro: string): VenueRateContent => ({
  ...EMPTY_VENUE_RATE_CONTENT,
  intro,
  rowLabels: ["대관료"],
  columns: [{ key: "a", name: "A", values: ["1,000원"] }],
});

describe("normalizeRatesContent", () => {
  // [회귀 2026-09-02] 이 함수는 필드를 나열해 새 객체를 만든다. 「패키지」 탭이 목록에
  // 빠져 있어, 운영자가 어드민에서 채워도 대관료 페이지에는 아무것도 나오지 않았다.
  // 공간 탭을 추가할 때 여기 빠뜨리면 같은 일이 다시 난다.
  it("저장된 공간 탭을 하나도 떨어뜨리지 않는다", () => {
    const stored: RatesContent = {
      arena: filled("아레나"),
      liveHall: filled("중형"),
      special: filled("패키지"),
    };
    const out = normalizeRatesContent(stored);
    expect(out.arena.intro).toBe("아레나");
    expect(out.liveHall.intro).toBe("중형");
    expect(out.special?.intro).toBe("패키지");
    // 열은 저장본 그대로 실려야 한다. `extras`(개편으로 생긴 자리)는 저장본에 없으면
    // 기본값에서 채워 붙으므로, 키·이름·값만 비교한다.
    expect(out.special?.columns.map(({ key, name, values }) => ({ key, name, values }))).toEqual([
      { key: "a", name: "A", values: ["1,000원"] },
    ]);
  });

  it("패키지 탭을 아직 안 채웠으면 undefined 그대로 — 빈 객체를 만들지 않는다", () => {
    const out = normalizeRatesContent({ arena: filled("아레나"), liveHall: filled("중형") });
    expect(out.special).toBeUndefined();
  });

  it("예전 저장본에 없던 필드는 기본값으로 채운다", () => {
    // includeGroups·includesLead 는 나중에 생긴 필드다. 없는 채로 화면에 넘기면
    // map 에서 터진다.
    const legacy = { ...DEFAULT_RATES_CONTENT.arena } as Partial<VenueRateContent>;
    delete legacy.includeGroups;
    delete legacy.includesLead;
    const out = normalizeRatesContent({
      arena: legacy as VenueRateContent,
      liveHall: DEFAULT_RATES_CONTENT.liveHall,
    });
    expect(Array.isArray(out.arena.includeGroups)).toBe(true);
    expect(out.arena.includesLead).toBe(DEFAULT_RATES_CONTENT.arena.includesLead);
  });

  it("판번호는 항상 최신으로 붙인다", () => {
    const out = normalizeRatesContent({ ...DEFAULT_RATES_CONTENT, version: 1 });
    expect(out.version).toBe(RATES_CONTENT_VERSION);
  });

  // 패키지 탭도 예전 저장본처럼 필드가 빠질 수 있다 — 빈 값으로 채워야 화면이 선다.
  it("패키지 탭의 빠진 필드는 빈 값으로 채운다", () => {
    const partial = { intro: "패키지", rowLabels: [], columns: [] } as unknown as VenueRateContent;
    const out = normalizeRatesContent({
      arena: DEFAULT_RATES_CONTENT.arena,
      liveHall: DEFAULT_RATES_CONTENT.liveHall,
      special: partial,
    });
    expect(out.special?.includes).toEqual([]);
    expect(out.special?.includeGroups).toEqual([]);
  });
});
