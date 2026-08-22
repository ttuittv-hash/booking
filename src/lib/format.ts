export function won(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

/**
 * 단위 없는 수 — 수량·건수·인원처럼 통화가 아닌 값에 쓴다.
 *
 * 표 규칙(`docs/design-system.md` §4)이 "단위 행을 두지 않고, 수량은 숫자만,
 * 금액은 셀마다 ₩" 이므로 `won()` 과 짝으로 필요하다. 통화 기호를 붙이지 않는다.
 */
export function num(amount: number): string {
  return Math.round(amount).toLocaleString("ko-KR");
}

/*
  날짜는 반드시 서울 시간대로 고정해서 그린다.

  클라이언트 컴포넌트는 서버에서 한 번 그려진 뒤 브라우저에서 다시 그려지는데,
  toLocaleDateString() 을 그대로 쓰면 시간대를 실행 환경에서 가져온다 — 파드는 UTC,
  브라우저는 KST 라 자정 전후 데이터의 날짜가 서로 달라지고, 텍스트가 어긋난 순간
  React 가 하이드레이션을 버린다(#418). 그 사이 화면의 버튼은 눌러도 반응이 없다.
  실제로 회원 관리 화면에서 그렇게 신고됐다.
*/

const KST_DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
// timeStyle: "short" 만 쓰면 오전/오후 표기가 서버 Node ICU와 브라우저 ICU에서 서로
// 다른 문자열("오전" vs "AM")로 나와 하이드레이션이 깨진다(2026-08-22, ContractAddendumsPanel
// 발견) — dayPeriod 문자열 자체가 없는 24시간제(hourCycle: "h23")로 고정해 이 어긋남의
// 근본 원인을 없앤다. dateStyle/timeStyle은 hour·minute·hourCycle 같은 개별 필드와
// 함께 쓸 수 없어(RangeError), "medium" 날짜 표기와 같은 형태를 개별 필드로 재현한다.
const KST_DATETIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});
const KST_MONTH_DAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
});

/** "2026. 8. 21." */
export function formatDate(iso: string | number | Date): string {
  return KST_DATE.format(new Date(iso));
}

/** "2026. 8. 21. 오후 2:30" */
export function formatDateTime(iso: string | number | Date): string {
  return KST_DATETIME.format(new Date(iso));
}

/** "8월 21일" */
export function formatMonthDay(iso: string | number | Date): string {
  return KST_MONTH_DAY.format(new Date(iso));
}
