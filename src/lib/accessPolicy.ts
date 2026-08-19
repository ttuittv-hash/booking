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
//   시설 소개            → /venue, /venue/*
//   대관안내             → /guide, /guide/*, /packages
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

  { prefix: "/venue", label: "시설 소개", allow: OPEN_ALL },
  { prefix: "/guide", label: "대관안내", allow: LOGIN_ONLY },
  { prefix: "/packages", label: "대관 패키지", allow: LOGIN_ONLY },
  { prefix: "/notices", label: "대관현황", allow: LOGIN_ONLY },
  { prefix: "/faq", label: "FAQ", allow: OPEN_ALL },
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

/** 화면(내비게이션)에서 잠금 표시를 하기 위한 목록. */
export function menuAccessList(state: AccountState) {
  return RULES.map((r) => ({ prefix: r.prefix, label: r.label, open: r.allow[state] === "OPEN" }));
}
