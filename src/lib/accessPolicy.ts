// 접근권한 매트릭스 (기획서 A15).
//
// 계정 상태 4단계로 갈린다:
//   GUEST     비로그인
//   PENDING   로그인 · 승인 대기
//   REJECTED  로그인 · 미승인
//   APPROVED  로그인 · 승인 완료
//
// ── 메뉴 매핑에 대한 전제 ─────────────────────────────────────────────────
// 기획서 A15 의 표는 화면설계서(26.07.22) 메뉴명 기준인데, 현재 사이트는
// 새 디자인의 메뉴트리(Your Stage / Book It / Know It / Host It)를 쓴다.
// 두 구조가 달라 아래처럼 대응시켰다. 기획 확정 시 이 표만 고치면 된다.
//
//   기획서 메뉴          → 현재 경로
//   시설 제원            → /features
//   대관 절차             → /guide, /guide/*
//   대관현황(공고 목록)  → /notices, /notices/*
//   대관신청             → /apply, /apply/*
//   대관신청내역         → /mypage, /mypage/[id]
//   공연검인/수정        → (미구현)
//   판매현황/정산        → (미구현)
//   마이                 → /mypage/profile, /mypage/withdraw, /mypage/inquiries

export type AccountState = "GUEST" | "PENDING" | "REJECTED" | "APPROVED";

/** 열람 가능 여부. 기획서 표의 "열람 / 차단 / 가능" 을 그대로 옮긴다. */
export type AccessLevel = "OPEN" | "BLOCKED";

interface MenuRule {
  /** 경로 접두사 */
  prefix: string;
  label: string;
  /** 상태별 허용 여부 */
  allow: Record<AccountState, AccessLevel>;
}

const OPEN_ALL: Record<AccountState, AccessLevel> = {
  GUEST: "OPEN",
  PENDING: "OPEN",
  REJECTED: "OPEN",
  APPROVED: "OPEN",
};

/** 비로그인은 막고, 로그인만 하면 승인 전에도 열람할 수 있다. */
const LOGIN_ONLY: Record<AccountState, AccessLevel> = {
  GUEST: "BLOCKED",
  PENDING: "OPEN",
  REJECTED: "OPEN",
  APPROVED: "OPEN",
};

/** 승인 완료여야 쓸 수 있다. */
const APPROVED_ONLY: Record<AccountState, AccessLevel> = {
  GUEST: "BLOCKED",
  PENDING: "BLOCKED",
  REJECTED: "BLOCKED",
  APPROVED: "OPEN",
};

// 순서가 중요하다 — 더 긴 접두사를 먼저 둬서 /mypage/profile 이 /mypage 보다 먼저 잡히게 한다.
const RULES: MenuRule[] = [
  // 마이 — 승인 대기 상태에서도 본인 정보 수정은 가능해야 한다(기획서 A15).
  { prefix: "/mypage/profile", label: "회원정보 수정", allow: LOGIN_ONLY },
  { prefix: "/mypage/withdraw", label: "회원 탈퇴", allow: LOGIN_ONLY },
  { prefix: "/mypage/inquiries", label: "1:1 문의", allow: LOGIN_ONLY },
  // 신청 내역은 승인 완료여야 본다.
  { prefix: "/mypage", label: "대관신청내역", allow: APPROVED_ONLY },

  { prefix: "/apply", label: "대관신청", allow: APPROVED_ONLY },

  // 2026-08 IA 재구성(Notion 확정안)으로 경로가 바뀌었다.
  // /venue·/packages 는 사라지고, 공개 소개는 /seoularena 가, 상세 스펙은 /features 가 맡는다.
  { prefix: "/seoularena", label: "서울아레나", allow: OPEN_ALL },
  // 시설 제원은 Your Stage(서울아레나 소개) 묶음이라 로그인만 하면 열린다.
  { prefix: "/features", label: "시설 제원", allow: LOGIN_ONLY },

  /*
    [개정 2026-09-02] 승인 완료 전에는 Your Stage 와 마이페이지만 본다.

    1차로 대관료·대관 규약·대관 자료를 올렸고("승인 반려된 계정에서도 대관료가 그대로
    보인다" QA), 2차로 대관 절차·공지사항까지 올렸다. 대관 업무에 관한 내용은 심사를
    통과한 대관사에게만 준다는 것이 확정된 선이다.

    열어 두는 것:
      · 서울아레나 소개(/seoularena) · 시설 제원(/features)  — Your Stage
      · 회원정보 수정 · 탈퇴 · 1:1 문의                        — 마이페이지

    [개정 2026-09-02] FAQ 도 승인 완료 전용으로 내린다.

    "비로그인에게도 공개라 대기 상태만 막을 이유가 없다"고 열어 뒀는데, FAQ 내용
    자체가 신청·정산·시설 운영 같은 대관 업무 안내다(QA 지적). 승인 전에는 서울아레나
    소개 · 시설 제원 · 1:1 문의만 남는다 — 궁금한 것은 1:1 문의로 받는다.
  */
  { prefix: "/guide", label: "대관 절차", allow: APPROVED_ONLY },
  { prefix: "/rates", label: "대관료", allow: APPROVED_ONLY },
  { prefix: "/rules", label: "대관 규약", allow: APPROVED_ONLY },
  { prefix: "/documents", label: "대관 자료", allow: APPROVED_ONLY },
  { prefix: "/notices", label: "공지사항", allow: APPROVED_ONLY },
  { prefix: "/faq", label: "FAQ", allow: APPROVED_ONLY },
];

export function accountStateOf(
  user: { role: string; approvalStatus: string } | null | undefined,
): AccountState {
  if (!user) return "GUEST";
  // 운영자는 이 매트릭스의 대상이 아니다(백오피스는 별도 게이트).
  if (user.role === "ADMIN") return "APPROVED";
  if (user.approvalStatus === "APPROVED") return "APPROVED";
  if (user.approvalStatus === "REJECTED") return "REJECTED";
  return "PENDING";
}

export function findRule(pathname: string): MenuRule | undefined {
  return RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
}

/** 이 경로를 이 상태로 볼 수 있는가. 규칙이 없는 경로는 공개로 본다(홈·약관 등). */
export function canAccess(pathname: string, state: AccountState): boolean {
  const rule = findRule(pathname);
  if (!rule) return true;
  return rule.allow[state] === "OPEN";
}

/** 막혔을 때 어디로 보낼지. 상태에 따라 안내가 달라야 한다. */
export function redirectFor(state: AccountState, pathname: string): string {
  if (state === "GUEST") return `/login?next=${encodeURIComponent(pathname)}`;
  if (state === "REJECTED") return "/pending?state=rejected";
  return "/pending";
}

