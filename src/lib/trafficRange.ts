import type { TrafficGranularity } from "./db";

/*
  리포트 "유입" 섹션의 기간·단위 해석 (2026-08-28).

  날짜는 전부 KST 기준 "YYYY-MM-DD" 문자열로만 다룬다. Date 객체로 바꿔 계산하면 서버
  타임존에 따라 하루씩 밀린다 — AGENTS.md 가 경고하는 toLocale 계열 타임존 의존과 같은 함정이다.
  그래서 날짜 산술은 UTC 정오로 고정한 Date 로만 하고, 곧바로 문자열로 되돌린다.
*/

export const GRANULARITIES: { key: TrafficGranularity; label: string }[] = [
  { key: "day", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

/** 자주 쓰는 기간. 값은 URL(?days=)에 실린다. */
export const RANGE_PRESETS: { days: number; label: string }[] = [
  { days: 7, label: "최근 7일" },
  { days: 30, label: "최근 30일" },
  { days: 90, label: "최근 90일" },
];

/** 한 번에 조회할 수 있는 최대 기간. 넘겨 받으면 잘라낸다. */
export const MAX_RANGE_DAYS = 366;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseGranularity(raw: string | undefined): TrafficGranularity {
  return GRANULARITIES.some((g) => g.key === raw) ? (raw as TrafficGranularity) : "day";
}

/** "YYYY-MM-DD" 형식이고 실제로 존재하는 날짜일 때만 통과시킨다. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw || !DATE_RE.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // "2026-02-31" 같은 값은 Date 가 3월로 넘겨 버리므로 되돌려 확인한다.
  return d.toISOString().slice(0, 10) === raw ? raw : null;
}

/** 날짜 문자열에 일수를 더한다(음수면 뺀다). 정오 기준이라 서머타임·타임존에 흔들리지 않는다. */
export function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 두 날짜 사이의 일수(양끝 포함). */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

export interface ResolvedRange {
  from: string;
  to: string;
  /** 프리셋으로 딱 떨어지면 그 일수, 직접 지정한 기간이면 null */
  presetDays: number | null;
  /** 입력을 그대로 쓰지 못하고 손본 경우의 안내 문구 */
  notice: string | null;
}

/**
 * 기간을 정한다. 우선순위는 직접 지정(from·to) > 프리셋(days) > 기본값(최근 30일).
 *
 * from 만, 또는 to 만 준 경우도 받는다 — 한쪽만 채워 넣고 조회하는 일이 흔하다.
 */
export function resolveRange(input: {
  from?: string;
  to?: string;
  days?: string;
  today: string;
}): ResolvedRange {
  const rawFrom = parseDate(input.from);
  const rawTo = parseDate(input.to);
  let notice: string | null = null;

  if (rawFrom || rawTo) {
    let from = rawFrom ?? shiftDays(rawTo!, -29);
    let to = rawTo ?? input.today;
    if (from > to) {
      // 뒤집어 받은 건 오류로 막기보다 바로잡아 보여주는 편이 쓰기 좋다.
      [from, to] = [to, from];
      notice = "시작일이 종료일보다 늦어 두 날짜를 바꿔 조회했습니다.";
    }
    if (to > input.today) {
      to = input.today;
      notice = "종료일이 오늘 이후라 오늘까지만 조회했습니다.";
    }
    if (daysBetween(from, to) > MAX_RANGE_DAYS) {
      from = shiftDays(to, -(MAX_RANGE_DAYS - 1));
      notice = `한 번에 최대 ${MAX_RANGE_DAYS}일까지 조회할 수 있어 기간을 줄였습니다.`;
    }
    const span = daysBetween(from, to);
    const preset = RANGE_PRESETS.find((p) => p.days === span && to === input.today);
    return { from, to, presetDays: preset?.days ?? null, notice };
  }

  const days = Number(input.days);
  const preset = RANGE_PRESETS.find((p) => p.days === days) ?? RANGE_PRESETS[1];
  return {
    from: shiftDays(input.today, -(preset.days - 1)),
    to: input.today,
    presetDays: preset.days,
    notice: null,
  };
}

/** 표에 찍을 구간 이름. 구간 시작일만으로는 주·월을 구분할 수 없어 단위를 함께 받는다. */
export function bucketLabel(bucket: string, granularity: TrafficGranularity): string {
  if (granularity === "month") return bucket.slice(0, 7).replace("-", ".");
  if (granularity === "week") return `${bucket} ~ ${shiftDays(bucket, 6)}`;
  return bucket;
}
