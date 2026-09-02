/**
 * 공지 캘린더 공개 기간 (2026-09-02).
 *
 * 공지사항에 끼워 넣는 「대관 현황 캘린더」(`[[대관현황캘린더]]` 마커 · 공지 상단
 * 캘린더 보기)는 지금까지 공지가 살아 있는 한 계속 열려 있었다. 대관 접수는 회차로
 * 도는 일이라 접수 기간이 아닐 때는 캘린더 대신 "언제 열린다/닫혔다"만 보여야 한다.
 *
 * 시각은 **운영자가 입력한 KST 그대로** 문자열(`YYYY-MM-DDTHH:mm`)로 저장하고 비교한다.
 * Date 로 바꿔 담으면 서버 TZ·브라우저 TZ 에 따라 한 시간씩 밀리는 문제가 생긴다 —
 * 운영자는 한국 시각으로 입력하고 이용자도 한국 시각으로 본다. `kstNowLocal()` 이
 * "지금"을 같은 형식으로 만들어 주므로 사전식 비교로 충분하다.
 */

export interface NoticeCalendarWindow {
  /** false = 기간 제한 없음(항상 공개). 켜야 아래 시각이 의미를 갖는다 */
  enabled: boolean;
  /** 공개 시작 — KST `YYYY-MM-DDTHH:mm`. 비우면 "지금까지 계속 열려 있었다" */
  startAt: string | null;
  /** 공개 종료 — 이 분(minute)까지 열려 있다. 비우면 종료 없음 */
  endAt: string | null;
  /** 시작 전에 캘린더 자리에 대신 보여 줄 안내 */
  beforeMessage: string;
  /** 종료 후에 캘린더 자리에 대신 보여 줄 안내 */
  afterMessage: string;
}

export const DEFAULT_NOTICE_CALENDAR_WINDOW: NoticeCalendarWindow = {
  enabled: false,
  startAt: null,
  endAt: null,
  beforeMessage: "대관 접수 기간이 아닙니다. 접수가 열리면 공지사항으로 안내드립니다.",
  afterMessage: "대관 접수가 마감되었습니다. 다음 접수 일정은 공지사항으로 안내드립니다.",
};

export type NoticeCalendarWindowState = "OPEN" | "BEFORE" | "AFTER";

/** 현재 한국 시각을 저장 형식(`YYYY-MM-DDTHH:mm`)으로 만든다. */
export function kstNowLocal(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * 지금 캘린더를 보여도 되는지. `nowLocal` 은 `kstNowLocal()` 결과.
 *
 * 기간을 켜 두고 시작·종료를 둘 다 비워 두면 제한이 없는 것과 같다 — 그 상태를 닫힘으로
 * 읽으면 운영자가 체크만 하고 시각을 안 넣었을 때 캘린더가 조용히 사라진다.
 */
export function noticeCalendarWindowState(
  window: NoticeCalendarWindow,
  nowLocal: string,
): NoticeCalendarWindowState {
  if (!window.enabled) return "OPEN";
  if (window.startAt && nowLocal < window.startAt) return "BEFORE";
  if (window.endAt && nowLocal > window.endAt) return "AFTER";
  return "OPEN";
}

/** 닫혀 있을 때 캘린더 자리에 대신 놓을 문구. 비어 있으면 기본 문구로 채운다. */
export function noticeCalendarClosedMessage(
  window: NoticeCalendarWindow,
  state: NoticeCalendarWindowState,
): string {
  if (state === "BEFORE") {
    return window.beforeMessage.trim() || DEFAULT_NOTICE_CALENDAR_WINDOW.beforeMessage;
  }
  if (state === "AFTER") {
    return window.afterMessage.trim() || DEFAULT_NOTICE_CALENDAR_WINDOW.afterMessage;
  }
  return "";
}

/** 저장 형식(`YYYY-MM-DDTHH:mm`)의 시각을 화면에 쓰는 한국식 표기로 바꾼다. */
export function formatWindowMoment(value: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const [, y, mo, d, h, min] = m;
  return `${y}년 ${Number(mo)}월 ${Number(d)}일 ${h}:${min}`;
}

const MOMENT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * 저장 전 정규화. `datetime-local` 은 초까지 붙여 보낼 때가 있어 분까지만 남기고,
 * 형식이 어긋나면 비운 것으로 본다 — 잘못된 문자열이 들어오면 비교가 조용히 틀어진다.
 */
export function normalizeWindowMoment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 16);
  return MOMENT_RE.test(trimmed) ? trimmed : null;
}
