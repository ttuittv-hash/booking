/**
 * 공지 본문 아무 곳에나 넣을 수 있는 "대관 현황 캘린더" 삽입 마커.
 *
 * `BookingCalendarLauncher`는 실시간 데이터를 불러오는 클라이언트 컴포넌트라
 * 리치에디터 HTML(dangerouslySetInnerHTML)에 그대로 박아넣을 수 없다. 그래서
 * 운영자가 에디터에서 이 텍스트를 담은 문단을 삽입하면, 렌더링 시점에 그
 * 문단을 찾아 실제 컴포넌트로 바꿔 끼운다(`splitNoticeBodyAtCalendarMarker`).
 *
 * 표·이미지처럼 항상 자기 줄(문단)을 하나 차지하는 블록 삽입으로 취급한다 —
 * 인라인으로 섞이면 앞뒤 HTML을 안전하게 자를 수 없다.
 */
export const NOTICE_CALENDAR_MARKER_TEXT = "[[대관현황캘린더]]";

/** 삽입 버튼이 TipTap에 넣는 HTML — 새 문단으로 삽입된다. */
export const NOTICE_CALENDAR_MARKER_HTML = `<p>${NOTICE_CALENDAR_MARKER_TEXT}</p>`;

// TipTap의 TextAlign 확장이 문단에 style 속성을 붙일 수 있어, 태그 속성은 느슨하게 받는다.
const MARKER_PATTERN = /<p[^>]*>\[\[대관현황캘린더\]\]<\/p>/g;

/**
 * sanitize를 거친 공지 본문 HTML을 마커 기준으로 자른다.
 * 반환된 조각 사이사이에 `<BookingCalendarLauncher />`를 끼워 렌더링한다.
 */
export function splitNoticeBodyAtCalendarMarker(html: string): string[] {
  return html.split(MARKER_PATTERN);
}
