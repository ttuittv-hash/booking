/**
 * 공지 캘린더가 보여 주는 달(月) 범위 (2026-09-02).
 *
 * 공지사항에 끼워 넣는 「대관 현황 캘린더」는 이번 회차에 신청받는 달만 보여야 한다.
 * 2027년 하반기 정기대관이면 2027-07 ~ 2027-12 만 넘겨 보게 두고, 그 앞뒤 달로는
 * 넘어가지 못하게 한다. 캘린더를 켜고 끄는 설정이 아니다 — 캘린더는 늘 열려 있고,
 * 여기서 정하는 건 **첫 화면에 뜨는 달과 넘길 수 있는 범위**다.
 *
 * [개정 2026-09-02] 처음에는 "공개 기간"(시각 기준 열림/닫힘)으로 만들었는데,
 * 운영에서 필요한 건 노출 여부가 아니라 보여 줄 달이었다. 저장 키는 그대로 두고
 * 필드를 월 범위로 바꿨다 — 예전 값(startAt·endAt 등)은 읽지 않으므로 그냥 남는다.
 *
 * 달은 운영자가 입력한 **KST 기준 `YYYY-MM` 문자열 그대로** 저장하고 사전식으로
 * 비교한다. Date 로 바꿔 담으면 서버 TZ 에 따라 한 달씩 밀리는 자리가 생긴다.
 */

export interface NoticeCalendarWindow {
  /** false = 범위 제한 없음(어느 달이든 넘겨 볼 수 있다) */
  enabled: boolean;
  /** 볼 수 있는 첫 달 — KST `YYYY-MM`. 비우면 앞쪽 제한 없음 */
  startMonth: string | null;
  /** 볼 수 있는 마지막 달 — KST `YYYY-MM`. 비우면 뒤쪽 제한 없음 */
  endMonth: string | null;
}

export const DEFAULT_NOTICE_CALENDAR_WINDOW: NoticeCalendarWindow = {
  enabled: false,
  startMonth: null,
  endMonth: null,
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 현재 한국 시각의 달을 저장 형식(`YYYY-MM`)으로 만든다. */
export function kstNowMonth(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

/** `2027`, `7` → `"2027-07"`. 캘린더가 넘기는 연·월을 저장 형식으로 맞춘다. */
export function toMonthKey(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

/**
 * 저장 전 정규화. `month` 입력이 비어 있거나 형식이 어긋나면 "제한 없음"으로 본다 —
 * 잘못된 문자열이 들어오면 사전식 비교가 조용히 틀어진다.
 */
export function normalizeMonth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 7);
  return MONTH_RE.test(trimmed) ? trimmed : null;
}

/**
 * 실제로 적용되는 범위. 끄여 있으면 양쪽 다 null(제한 없음)이고,
 * 켜 두고 둘 다 비웠으면 역시 제한이 없다 — 체크만 하고 달을 안 넣었을 때
 * 캘린더가 한 달에 갇히면 안 된다.
 */
export function noticeCalendarMonthBounds(window: NoticeCalendarWindow): {
  start: string | null;
  end: string | null;
} {
  if (!window.enabled) return { start: null, end: null };
  const start = normalizeMonth(window.startMonth);
  const end = normalizeMonth(window.endMonth);
  // 시작이 끝보다 뒤면 볼 수 있는 달이 하나도 없다 — 잘못 넣은 값으로 캘린더를
  // 비우는 대신 제한을 풀어 둔다(운영자 화면에서 경고로 알려 준다).
  if (start && end && start > end) return { start: null, end: null };
  return { start, end };
}

/** 이 달을 보여 줘도 되는가. */
export function isMonthInRange(month: string, window: NoticeCalendarWindow): boolean {
  const { start, end } = noticeCalendarMonthBounds(window);
  if (start && month < start) return false;
  if (end && month > end) return false;
  return true;
}

/**
 * 캘린더를 열었을 때 처음 보여 줄 달. 이번 달이 범위 안이면 이번 달,
 * 범위보다 앞이면 첫 달, 뒤면 마지막 달이다 — 열자마자 빈 화면이 나오지 않게 한다.
 */
export function initialCalendarMonth(window: NoticeCalendarWindow, nowMonth: string): string {
  const { start, end } = noticeCalendarMonthBounds(window);
  if (start && nowMonth < start) return start;
  if (end && nowMonth > end) return end;
  return nowMonth;
}

/** `"2027-07"` → `"2027년 7월"`. 형식이 아니면 null. */
export function formatMonth(value: string | null): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  return `${m[1]}년 ${Number(m[2])}월`;
}
