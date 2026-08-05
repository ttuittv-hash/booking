/* ============================================================================
   운영자 백오피스 공통 시각 토큰
   기준: docs/design-system.md
     · 샤프 코너 (rounded-* 금지) · border-soft 1px 헤어라인
     · background(#F2F0EF) 지면 + surface(#FFF) 패널. 컬러 밴드 교대는 공개 페이지 전용
     · 옐로는 면·강조·구분선에만. 옐로 위 텍스트는 항상 검정 (옐로 텍스트 금지)
     · 임의 px 폰트 금지 — text-xs / text-s / text-r … 토큰만
     · 포커스: 보더 foreground + 옐로 2px 아웃라인.
       Tailwind v4 에서 base 에 outline-none 을 넣으면 focus:outline-2 가 죽으므로
       base 에는 절대 outline-none 을 쓰지 않는다.
   kit.tsx 는 파운데이션이라 수정하지 않으므로, 백오피스 밀도용 토큰만 여기 모은다.
   ========================================================================= */

/** 입력 필드 (w-full 없음 — 폭을 직접 지정할 때) */
export const FIELD_BASE =
  "border border-border-soft bg-surface px-3 py-2 text-s text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent disabled:opacity-40";

/** 입력 필드 기본 */
export const FIELD = `w-full ${FIELD_BASE}`;

/** 밀도 높은 인라인 입력 (툴바·수량) */
export const FIELD_SM =
  "border border-border-soft bg-surface px-2 py-1.5 text-xs text-foreground transition-colors placeholder:text-muted focus:border-foreground focus:outline-2 focus:outline-accent disabled:opacity-40";

/** 숫자 입력 — 우측 정렬 + tabular-nums */
export const FIELD_NUM = `${FIELD} text-right tabular-nums`;

/** 필드 라벨 */
export const FIELD_LABEL = "mb-1.5 block text-xs text-muted";

/** 흰 패널 (지면이 background 이므로 구획은 흰 면 + 헤어라인으로) */
export const PANEL = "border border-border-soft bg-surface p-4 sm:p-5";

/** 반복 항목 카드 */
export const CARD = "border border-border-soft bg-surface p-4";

/** 카드 안에 다시 들어가는 카드 */
export const CARD_NESTED = "border border-border-soft bg-background p-3";

/** 점선 추가 버튼 (옐로 텍스트 금지 → hover 는 검정) */
export const ADD_BTN =
  "inline-flex items-center border border-dashed border-border-soft px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** 점선 추가 버튼 — 목록 하단의 큰 버전 */
export const ADD_BTN_LG =
  "inline-flex items-center border border-dashed border-border-soft px-4 py-3 text-xs font-bold text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** 삭제/제거 (파괴적 동작) */
export const REMOVE_BTN =
  "shrink-0 text-xs font-bold text-danger transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";

/** 텍스트 링크형 보조 동작 */
export const LINK_BTN =
  "text-xs font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong";

/** 조용한 취소 */
export const QUIET_BTN = "text-xs text-muted transition-colors hover:text-foreground";

/* ------------------------------------------------------------------ 탭 ---- */

/** 상단 탭 바 — 지면 위에 붙는 스티키 바 (AdminNav 높이 14/16 아래) */
export const TAB_BAR =
  "sticky top-14 z-10 -mx-6 flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border/20 bg-background px-6 sm:top-16";

/** 활성 탭은 옐로 하단 바 + 검정 텍스트 */
export function tabCls(active: boolean) {
  return [
    "shrink-0 border-b-2 px-3 py-3 text-xs font-bold transition-colors",
    active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground",
  ].join(" ");
}

/* ---------------------------------------------------------------- 표 ------ */

export const TABLE_WRAP = "overflow-x-auto border border-border-soft bg-surface";
export const TABLE = "w-full border-collapse text-s";
/** 헤더 행 — Archivo 라벨 대문자 (type-label 이 웨이트 800 을 이미 지정한다) */
export const THEAD_ROW = "border-b border-border-soft bg-background text-left";
export const TH = "type-label px-3 py-2.5 text-xs text-muted";
export const TH_NUM = `${TH} text-right`;
export const TR = "border-b border-border-soft last:border-b-0";
export const TD = "px-3 py-2.5 align-middle";
export const TD_NUM = `${TD} text-right tabular-nums`;

/* ------------------------------------------------------------- 타이포 ----- */

/** 화면 타이틀 */
export const PAGE_TITLE = "type-kr-heading text-h5-m sm:text-h5";
/** 화면 설명 */
export const PAGE_LEAD = "mt-3 max-w-3xl text-s text-muted";
/** 섹션 제목 */
export const SECTION_TITLE = "type-kr-heading text-h6-m";
/** 하위 제목 */
export const SUB_TITLE = "text-s font-bold";
/** 보조 설명 */
export const HELP = "text-xs text-muted";

/* ------------------------------------------------------------- 알림문 ----- */

export const ERROR_NOTE = "border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger";
export const OK_NOTE = "border-l-2 border-good bg-good-soft px-3 py-2 text-s text-good";
export const INFO_NOTE = "border-l-2 border-border-soft bg-surface px-3 py-2 text-s text-muted";
export const WARN_NOTE = "border-l-2 border-foreground bg-warn-soft px-3 py-2 text-s text-muted-strong";
