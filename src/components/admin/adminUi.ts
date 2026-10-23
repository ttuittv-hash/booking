import { btnClass as adminButtonClass } from "./adminButton";
/** 관리자 시각 기준: docs/admin-design-system.md.
 * adminUi.ts는 의미 있는 클래스 이름을, adminDashboard.css는 해당 스타일을 소유한다.
 * 공통 값을 바꿀 때 화면별 Tailwind 클래스로 다시 덮어쓰지 않는다.
 * 색상은 사이트의 시맨틱 토큰을 상속하며 위저드 디자인과 독립적이다.
 */
export const FIELD = "admin-field field-base disabled:opacity-40";
export const FIELD_SM = "admin-field-sm field-base disabled:opacity-40";
export const FIELD_NUM = `${FIELD} text-right tabular-nums`;
export const FIELD_LABEL = "mb-1.5 block text-xs text-muted";
export const PANEL = "admin-panel";
export const CARD = "admin-card";

/* ------------------------------------------------------------- 버튼 ------ */
/* 실행 버튼은 adminButton.ts, 색상은 기존 kit, 치수는 AdminButton.module.css가 소유한다.
   sm=32px(모바일44), md=44px, lg=48px. 공개 사이트의 크기는 변경하지 않는다. */
export const ADD_BTN = `${adminButtonClass("secondary", "sm")} border-dashed`;
export const ADD_BTN_LG = `${adminButtonClass("secondary", "md")} border-dashed`;

/** 삭제/제거 — 파괴적 동작은 색(text-danger)으로만 신호한다 */
export const REMOVE_BTN =
  "inline-flex min-h-11 shrink-0 items-center text-xs font-bold text-danger sm:min-h-0 transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";

/**
 * 텍스트 링크형 보조 동작.
 * 모바일에서는 글자 높이(18px)만으로는 누르기 어려워 44px 을 확보하고,
 * sm 부터는 원래대로 돌아가 표가 촘촘하게 유지된다.
 */
export const LINK_BTN =
  "inline-flex min-h-11 items-center text-xs font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-muted-strong sm:min-h-0";

/** 조용한 취소 */
export const QUIET_BTN = "text-xs text-muted transition-colors hover:text-foreground";

/* ------------------------------------------------------------------ 탭 ---- */

/** 일반 탭: 56px 높이, 검정 활성 밑줄. 고정 위치는 화면 레이아웃에서 결정한다. */
export const TAB_BAR = "admin-tab-bar";
export function tabCls(active: boolean) {
  return `admin-tab${active ? " admin-tab-active" : ""}`;
}

/* 표: 공통 흰 패널 + 내부 행 구분선. 바깥 테두리는 사용하지 않는다. */

/** 바깥 컨테이너 — 관리자 공통 패널 */
export const TABLE_CARD = "admin-table-card";

/** 상단 헤더 행 — 좌: 제목 + 한 줄 설명 / 우: 액션 버튼 */
export const TABLE_HEAD =
  "admin-table-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
export const TABLE_HEAD_TITLE = "admin-table-title";
export const TABLE_HEAD_DESC = "mt-1 text-xs text-muted";
/** 액션 슬롯 — secondary + primary 순서로 둔다 */
export const TABLE_HEAD_ACTIONS = "flex shrink-0 flex-wrap items-center gap-2";

/** 표 본문만 가로 스크롤 (헤더·페이저는 고정) */
/* `contain: paint` 없이 두면 넘치는 표 폭이 문서 전체 가로 스크롤로 새어 나간다(크로미움) */
export const TABLE_SCROLL = "overflow-x-auto [contain:paint]";
export const TABLE = "admin-table w-full border-collapse text-s";

/** 테이블 헤더 행 — 컬럼명은 작고 muted */
export const THEAD_ROW = "border-b border-border-soft bg-background text-left";
export const TH = "px-3 py-2.5 text-xs font-bold text-muted";
export const TH_NUM = `${TH} text-right`;
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
  "inline-flex min-h-11 items-center gap-1.5 text-xs font-bold transition-colors hover:text-muted-strong sm:min-h-0";
/** 비어 있는 표의 안내 셀 */
export const TD_EMPTY = "px-3 py-10 text-center text-s text-muted";

/** 값 없음은 —, 포함은 ✓ (텍스트로 "포함" 이라 쓰지 않는다) */
export const NONE = "—";
/* 표 아래 페이지네이션 — 좌 Prev / 중앙 페이지 번호 / 우 Next.
   실제로 페이지를 나누는 목록에서만 쓴다 (없는 곳에 껍데기를 두지 않는다). */
/* ------------------------------------------------------------- 타이포 ----- */

/** 화면 타이틀 */
export const PAGE_TITLE = "admin-page-title";
/** 화면 설명 — 아이브로 없이 제목 바로 아래 한 줄 */
export const PAGE_LEAD = "admin-lead text-muted";
/** 섹션 제목 */
export const SECTION_TITLE = "admin-section-title";
/** 하위 제목 */
export const SUB_TITLE = "text-s font-bold";
/** 보조 설명 */
export const HELP = "text-xs text-muted";
/* ------------------------------------------------------------- 알림문 ----- */

export const ERROR_NOTE = "border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger";
export const OK_NOTE = "border-l-2 border-good bg-good-soft px-3 py-2 text-s text-good";
export const INFO_NOTE = "border-l-2 border-border-soft bg-panel px-3 py-2 text-s text-muted";
export const WARN_NOTE = "border-l-2 border-foreground bg-warn-soft px-3 py-2 text-s text-muted-strong";
