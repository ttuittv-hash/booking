import { describe, expect, it } from "vitest";
import {
  MAX_RANGE_DAYS,
  bucketLabel,
  daysBetween,
  parseDate,
  parseGranularity,
  resolveRange,
  shiftDays,
} from "./trafficRange";

const TODAY = "2026-08-28";

describe("parseGranularity", () => {
  it("허용된 값만 통과시키고 나머지는 일간으로 떨어진다", () => {
    expect(parseGranularity("week")).toBe("week");
    expect(parseGranularity("month")).toBe("month");
    expect(parseGranularity("year")).toBe("day");
    expect(parseGranularity(undefined)).toBe("day");
  });
});

describe("parseDate", () => {
  it("형식과 실재 여부를 함께 본다", () => {
    expect(parseDate("2026-08-28")).toBe("2026-08-28");
    expect(parseDate("2026-02-31")).toBeNull(); // 3월로 넘어가는 값
    expect(parseDate("2026-8-1")).toBeNull();
    expect(parseDate("어제")).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });
});

describe("날짜 산술", () => {
  it("월·연 경계를 넘어도 맞다", () => {
    expect(shiftDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDays("2024-02-28", 1)).toBe("2024-02-29"); // 윤년
  });

  it("일수는 양끝을 포함해 센다", () => {
    expect(daysBetween("2026-08-28", "2026-08-28")).toBe(1);
    expect(daysBetween("2026-08-01", "2026-08-31")).toBe(31);
  });
});

describe("resolveRange", () => {
  it("아무것도 안 주면 최근 30일", () => {
    const r = resolveRange({ today: TODAY });
    expect(r).toMatchObject({ from: "2026-07-30", to: TODAY, presetDays: 30, notice: null });
  });

  it("프리셋 일수를 존중한다", () => {
    expect(resolveRange({ days: "7", today: TODAY })).toMatchObject({
      from: "2026-08-22",
      to: TODAY,
      presetDays: 7,
    });
  });

  it("프리셋에 없는 일수는 기본값으로 떨어진다", () => {
    expect(resolveRange({ days: "13", today: TODAY }).presetDays).toBe(30);
  });

  it("직접 지정이 프리셋보다 우선한다", () => {
    const r = resolveRange({ from: "2026-08-01", to: "2026-08-10", days: "90", today: TODAY });
    expect(r).toMatchObject({ from: "2026-08-01", to: "2026-08-10", presetDays: null });
  });

  it("한쪽만 줘도 나머지를 채운다", () => {
    expect(resolveRange({ from: "2026-08-20", today: TODAY }).to).toBe(TODAY);
    expect(resolveRange({ to: "2026-08-10", today: TODAY }).from).toBe("2026-07-12");
  });

  it("뒤집어 받으면 바로잡고 알린다", () => {
    const r = resolveRange({ from: "2026-08-20", to: "2026-08-10", today: TODAY });
    expect(r.from).toBe("2026-08-10");
    expect(r.to).toBe("2026-08-20");
    expect(r.notice).toContain("바꿔");
  });

  it("종료일이 미래면 오늘까지만 본다", () => {
    const r = resolveRange({ from: "2026-08-01", to: "2027-01-01", today: TODAY });
    expect(r.to).toBe(TODAY);
    expect(r.notice).toContain("오늘");
  });

  it("최대 기간을 넘기면 잘라낸다", () => {
    const r = resolveRange({ from: "2020-01-01", to: TODAY, today: TODAY });
    expect(daysBetween(r.from, r.to)).toBe(MAX_RANGE_DAYS);
    expect(r.notice).toContain(String(MAX_RANGE_DAYS));
  });

  it("직접 지정이 프리셋과 정확히 겹치면 그 프리셋이 눌린 것으로 본다", () => {
    const r = resolveRange({ from: "2026-08-22", to: TODAY, today: TODAY });
    expect(r.presetDays).toBe(7);
  });
});

describe("bucketLabel", () => {
  it("단위마다 다르게 읽힌다", () => {
    expect(bucketLabel("2026-08-28", "day")).toBe("2026-08-28");
    expect(bucketLabel("2026-08-24", "week")).toBe("2026-08-24 ~ 2026-08-30");
    expect(bucketLabel("2026-08-01", "month")).toBe("2026.08");
  });
});
