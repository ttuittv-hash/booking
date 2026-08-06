/* ============================================================================
   운영자 백오피스 공통 시각 토큰
   기준: docs/design-system.md + Figma "APPLICATION COMPONENTS" 페이지

   원칙
     · 샤프 코너 (rounded-* 금지) · border-soft 1px 헤어라인
     · 하드코딩 색 없음. background / panel / foreground / muted / border /
       border-soft 시맨틱 토큰만 쓴다 → 다크모드가 자동으로 따라온다
     · 백오피스는 공개 페이지의 컬러 밴드 교대를 쓰지 않는다.
       지면(background) + 흰 패널(panel) + 헤어라인으로만 구획한다
     · 옐로는 면·강조·구분선에만. 옐로 위 텍스트는 항상 검정 (옐로 텍스트 금지)
     · 임의 px 폰트 금지 — text-xs / text-s / text-r … 토큰만
     · 아이브로(Tagline) 없음. 화면 상단은 제목 + 한 줄 설명으로 시작한다
     · 포커스: 보더 foreground + 옐로 2px 아웃라인.
       Tailwind v4 에서 base 에 outline-none 을 넣으면 focus:outline-2 가 죽으므로
       base 에는 절대 outline-none 을 쓰지 않는다.

   kit.tsx / globals.css 는 파운데이션이라 수정하지 않는다.
   백오피스 밀도용 토큰만 여기 모은다.
   ========================================================================= */

/* ------------------------------------------------------------- 입력 ------ */
/* 입력 필드는 globals.css 의 `field-base` 유틸리티를 쓴다.
   (배경은 지면과 같고 1px 보더로만 구분 · 포커스 시 옐로 2px 아웃라인)
   커스텀 유틸리티는 Tailwind 유틸리티보다 먼저 방출되므로
   `w-32 ${FIELD}` 처럼 폭·정렬을 뒤에 붙여 덮어쓸 수 있다. */

/** 입력 필드 기본 */
export const FIELD = "field-base disabled:opacity-40";

/** 밀도 높은 인라인 입력 (툴바·수량) */
export const FIELD_SM = "field-base px-2 py-1.5 text-xs disabled:opacity-40";

/** 숫자 입력 — 우측 정렬 + tabular-nums */
export const FIELD_NUM = `${FIELD} text-right tabular-nums`;

/** 필드 라벨 */
export const FIELD_LABEL = "mb-1.5 block text-xs text-muted";

/* ------------------------------------------------------------- 지면 ------ */

/** 흰 패널 (지면이 background 이므로 구획은 패널 면 + 헤어라인으로) */
export const PANEL = "border border-border-soft bg-panel p-4 sm:p-5";

/** 반복 항목 카드 */
export const CARD = "border border-border-soft bg-panel p-4";

/** 카드 안에 다시 들어가는 카드 */
export const CARD_NESTED = "border border-border-soft bg-background p-3";

/* ------------------------------------------------------------- 버튼 ------ */
/* 버튼은 kit 의 btnClass(primary | secondary | tertiary) 만 쓴다.
   아래는 버튼이 아닌 것들 — 점선 추가 슬롯, 텍스트 링크, 파괴적 동작 신호. */

/** 점선 추가 버튼 (옐로 텍스트 금지 → hover 는 검정) */
export const ADD_BTN =
  "inline-flex items-center border border-dashed border-border-soft px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** 점선 추가 버튼 — 목록 하단의 큰 버전 */
export const ADD_BTN_LG =
  "inline-flex items-center border border-dashed border-border-soft px-4 py-3 text-xs font-bold text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** 삭제/제거 — 파괴적 동작은 색(text-danger)으로만 신호한다 */
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

/* ---------------------------------------------------------------- 표 ------
   Figma APPLICATION COMPONENTS › Table / 1

     ┌─────────────────────────────────────────────┐  ← 1px 보더, 샤프 코너
     │ 제목 + 한 줄 설명            [secondary][primary] │  TABLE_HEAD
     ├─────────────────────────────────────────────┤
     │ 컬럼명(작고 muted, 정렬 가능하면 ↓)               │  THEAD_ROW / TH
     ├─────────────────────────────────────────────┤
     │ 식별자(굵게)  값  값  값               상세 →   │  TR / TD_ID / TD / ROW_LINK
     ├─────────────────────────────────────────────┤
     │ Prev            1 2 3               Next    │  PAGER
     └─────────────────────────────────────────────┘
   ========================================================================= */

/** 바깥 컨테이너 — 1px 보더, 샤프 코너 */
export const TABLE_CARD = "border border-border-soft bg-panel";

/** 상단 헤더 행 — 좌: 제목 + 한 줄 설명 / 우: 액션 버튼 */
export const TABLE_HEAD =
  "flex flex-col gap-3 border-b border-border-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between";
export const TABLE_HEAD_TITLE = "text-s font-bold";
export const TABLE_HEAD_DESC = "mt-1 text-xs text-muted";
/** 액션 슬롯 — secondary + primary 순서로 둔다 */
export const TABLE_HEAD_ACTIONS = "flex shrink-0 flex-wrap items-center gap-2";

/** 표 본문만 가로 스크롤 (헤더·페이저는 고정) */
export const TABLE_SCROLL = "overflow-x-auto";
export const TABLE = "w-full border-collapse text-s";

/** 테이블 헤더 행 — 컬럼명은 작고 muted */
export const THEAD_ROW = "border-b border-border-soft bg-background text-left";
export const TH = "px-3 py-2.5 text-xs font-bold text-muted";
export const TH_NUM = `${TH} text-right`;
/** 정렬 가능한 컬럼 — 라벨 뒤에 SORT_MARK 를 붙인다 */
export const TH_SORT = `${TH} cursor-pointer select-none transition-colors hover:text-foreground`;
/** 정렬 방향 표시 */
export const SORT_MARK = "↓";

/** 데이터 행 — 헤어라인 구분 */
export const TR = "border-b border-border-soft last:border-b-0";
export const TR_HOVER = `${TR} transition-colors hover:bg-foreground/[0.03]`;
export const TD = "px-3 py-2.5 align-middle";
/** 첫 열 = 식별자, 굵게 */
export const TD_ID = `${TD} font-bold`;
/** 숫자는 tabular-nums 우측 정렬 */
export const TD_NUM = `${TD} text-right tabular-nums`;
export const TD_MUTED = `${TD} text-muted`;
/** 행 우측 끝의 상세 링크 셀 */
export const TD_LINK = `${TD} text-right`;
export const ROW_LINK =
  "inline-flex items-center gap-1.5 text-xs font-bold transition-colors hover:text-muted-strong";
/** 비어 있는 표의 안내 셀 */
export const TD_EMPTY = "px-3 py-10 text-center text-s text-muted";

/** 값 없음은 —, 포함은 ✓ (텍스트로 "포함" 이라 쓰지 않는다) */
export const NONE = "—";
export const YES = "✓";

/* 표 아래 페이지네이션 — 좌 Prev / 중앙 페이지 번호 / 우 Next.
   실제로 페이지를 나누는 목록에서만 쓴다 (없는 곳에 껍데기를 두지 않는다). */
export const PAGER =
  "flex items-center justify-between gap-4 border-t border-border-soft px-4 py-3 text-xs";
export const PAGER_STEP =
  "font-bold text-foreground transition-colors hover:text-muted-strong disabled:cursor-not-allowed disabled:opacity-40";
export const PAGER_PAGES = "flex items-center gap-1 tabular-nums";
export function pagerPageCls(active: boolean) {
  return [
    "min-w-6 px-1.5 py-0.5 text-center transition-colors",
    active ? "font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4" : "text-muted hover:text-foreground",
  ].join(" ");
}

/* ------------------------------------------------------------- 타이포 ----- */

/** 화면 타이틀 */
export const PAGE_TITLE = "type-kr-heading text-h5-m sm:text-h5";
/** 화면 설명 — 아이브로 없이 제목 바로 아래 한 줄 */
export const PAGE_LEAD = "mt-3 max-w-3xl text-s text-muted";
/** 섹션 제목 */
export const SECTION_TITLE = "type-kr-heading text-h6-m";
/** 하위 제목 */
export const SUB_TITLE = "text-s font-bold";
/** 보조 설명 */
export const HELP = "text-xs text-muted";
/** 영문 전용 대문자 라벨 (Archivo). 국문에는 쓰지 않는다 — 한글 글립이 없다 */
export const LABEL_CAPS =
  "text-xs font-extrabold uppercase tracking-[0.08em] [font-family:Archivo,sans-serif]";

/* ------------------------------------------------------------- 알림문 ----- */

export const ERROR_NOTE = "border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger";
export const OK_NOTE = "border-l-2 border-good bg-good-soft px-3 py-2 text-s text-good";
export const INFO_NOTE = "border-l-2 border-border-soft bg-panel px-3 py-2 text-s text-muted";
export const WARN_NOTE = "border-l-2 border-foreground bg-warn-soft px-3 py-2 text-s text-muted-strong";
