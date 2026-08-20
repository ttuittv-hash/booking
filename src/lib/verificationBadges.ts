// 운영자 승인 화면의 검증 배지 (기획서 A9).
//
// 운영자가 판단에 쓰는 근거를 7개 항목으로 고정한다. 화면마다 다르게 계산하면
// 목록에서 본 배지와 상세에서 본 배지가 어긋난다 — 판정 로직은 여기 한 곳에만 둔다.

import type { AppUser, Company } from "./pricing/types";

/** ✓ 통과 · ! 확인 필요 · — 해당 없음 */
export type BadgeState = "PASS" | "WARN" | "NONE";

export interface VerificationBadge {
  key: string;
  label: string;
  state: BadgeState;
  detail: string;
}

export interface BadgeInput {
  user: Pick<AppUser, "email" | "identityVerifiedAt" | "companyRole">;
  company: Company | null;
  /** 같은 DI 로 이미 가입한 다른 계정이 있는가 */
  duplicated: boolean;
}

/** 종합 판정 — 7개 항목이 모두 통과여야 자동 승인 대상이다. */
export function overallVerdict(badges: VerificationBadge[]): "AUTO" | "REVIEW" {
  return badges.some((b) => b.state === "WARN") ? "REVIEW" : "AUTO";
}

export function buildVerificationBadges(input: BadgeInput): VerificationBadge[] {
  const { user, company, duplicated } = input;
  const v = company?.verification ?? null;

  // 1. 휴대폰 본인인증
  const identity: VerificationBadge = {
    key: "identity",
    label: "휴대폰 본인인증",
    state: user.identityVerifiedAt ? "PASS" : "WARN",
    detail: user.identityVerifiedAt ? "확인 완료" : "미인증",
  };

  // 2. 사업자 진위확인
  const brn: VerificationBadge = {
    key: "brn",
    label: "사업자 진위확인",
    state: v?.status === "VERIFIED" ? "PASS" : "WARN",
    detail:
      v?.status === "VERIFIED"
        ? "국세청 조회 일치"
        : v?.status === "NOT_FOUND"
          ? "조회되지 않음"
          : "미확인",
  };

  // 3. 사업자 상태 — 휴업(7)·폐업(8)·부도(6)는 계약 상대로 부적격이다.
  const badStatus = v?.compStatus && ["6", "7", "8"].includes(v.compStatus);
  const compStatus: VerificationBadge = {
    key: "compStatus",
    label: "사업자 상태",
    state: !v?.compStatus ? "NONE" : badStatus ? "WARN" : "PASS",
    detail: v?.compStatusLabel ?? "정보 없음",
  };

  // 4. 상호·대표자 일치 — 표기 차이가 흔해 차단하지 않고 기록만 한다.
  const mismatch = (v?.message ?? "").includes("불일치");
  const nameMatch: VerificationBadge = {
    key: "nameMatch",
    label: "상호·대표자 일치",
    state: !v ? "NONE" : mismatch ? "WARN" : "PASS",
    detail: mismatch ? (v?.message ?? "불일치") : v ? "입력값과 일치" : "정보 없음",
  };

  // 5. 이메일 도메인 — 회사 도메인인지. 무료 메일이면 확인이 필요하다는 신호일 뿐 차단은 아니다.
  const domain = user.email.split("@")[1] ?? "";
  const freeMail = ["gmail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com"];
  const emailDomain: VerificationBadge = {
    key: "emailDomain",
    label: "이메일 도메인",
    state: domain && !freeMail.includes(domain) ? "PASS" : "WARN",
    detail: domain ? (freeMail.includes(domain) ? `무료 메일(${domain})` : `회사 도메인(${domain})`) : "정보 없음",
  };

  // 6. 중복 가입 — DI 기준
  const dup: VerificationBadge = {
    key: "duplicate",
    label: "중복 가입",
    state: duplicated ? "WARN" : "PASS",
    detail: duplicated ? "같은 명의의 계정이 이미 있음" : "없음",
  };

  // 7. 이상 신호 — 같은 사업자번호로 단시간에 여러 건이 들어오는 등.
  //    현재는 회사 상태가 미승인/휴폐업인 경우만 잡는다.
  const abnormal: VerificationBadge = {
    key: "abnormal",
    label: "이상 신호",
    state: company && (company.status === "REJECTED" || company.status === "SUSPENDED") ? "WARN" : "PASS",
    detail:
      company?.status === "REJECTED"
        ? "이전에 미승인 처리된 회사"
        : company?.status === "SUSPENDED"
          ? "휴·폐업 처리된 회사"
          : "없음",
  };

  return [identity, brn, compStatus, nameMatch, emailDomain, dup, abnormal];
}
