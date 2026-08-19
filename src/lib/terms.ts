// 약관 본문과 버전 (기획서 A3).
//
// 동의 이력에 "언제 동의했나"만 남기면 분쟁에 대응할 수 없다. 약관은 고쳐지기 때문이다.
// 그래서 동의 시점의 버전 코드와 본문 해시를 함께 저장하고, 본문은 여기서 버전과 묶어 관리한다.
// 본문을 고칠 때는 반드시 version 도 함께 올린다 — 그래야 이전 동의가 어떤 문서였는지 남는다.

import crypto from "node:crypto";

export type TermsKind = "SERVICE" | "PRIVACY_REQUIRED" | "PRIVACY_OPTIONAL";

export interface TermsDocument {
  kind: TermsKind;
  version: string;
  title: string;
  required: boolean;
  body: string;
}

export const TERMS: TermsDocument[] = [
  {
    kind: "SERVICE",
    version: "2026-08-01",
    title: "대관 회원 이용약관",
    required: true,
    body: [
      "제1조 (목적)",
      "본 약관은 서울아레나가 제공하는 대관 견적·신청 서비스의 이용조건 및 절차, 서울아레나와 대관 신청 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.",
      "",
      "제2조 (약관의 효력 및 변경)",
      "1) 본 약관은 회원가입 화면에 게시하여 회원에게 공시함으로써 효력이 발생합니다.",
      "2) 서울아레나는 필요하다고 인정되는 경우 본 약관을 변경할 수 있으며, 변경된 약관은 공지사항을 통해 사전 고지합니다.",
      "",
      "제3조 (회원가입)",
      "1) 회원가입은 사업자등록증을 보유한 법인 또는 개인사업자를 대상으로 합니다.",
      "2) 가입 신청 시 휴대폰 본인인증과 사업자등록번호 진위확인을 거칩니다.",
      "3) 서울아레나는 심사를 거쳐 가입을 승인하며, 휴업·폐업으로 확인된 사업자는 승인하지 않습니다.",
      "",
      "제4조 (회원의 의무)",
      "1) 회원은 가입 시 사실에 부합하는 정보를 제공해야 합니다.",
      "2) 회원은 계정 정보를 타인에게 양도하거나 대여할 수 없습니다.",
      "3) 같은 회사 소속 담당자의 추가·삭제는 회사 대표 담당자가 관리합니다.",
      "",
      "제5조 (대관 신청과 계약)",
      "1) 대관 신청서 제출은 대관 계약의 청약이 아니며, 심사 승인 후 별도의 계약 체결로 확정됩니다.",
      "2) 견적 화면에 표시되는 금액은 확정 전 예상치이며 부가세는 별도입니다.",
    ].join("\n"),
  },
  {
    kind: "PRIVACY_REQUIRED",
    version: "2026-08-01",
    title: "개인정보 수집 및 이용 동의",
    required: true,
    body: [
      "1. 수집 항목",
      "  - 기업회원: 이름, 로그인 ID, 휴대폰번호, 이메일, 회사명, 대표자성명, 대표번호, 회사주소, 사업자등록번호",
      "  - 본인인증 결과: 이름, 생년월일, 성별, 내외국인 구분, 통신사, 휴대폰번호, 연계정보(CI/DI)",
      "",
      "2. 수집 및 이용 목적",
      "  - 회원 식별 및 가입 심사, 중복 가입 방지",
      "  - 대관 신청·심사·계약·정산 등 서비스 제공",
      "  - 공지사항 전달 및 민원 처리",
      "",
      "3. 보유 및 이용 기간",
      "  - 회원 탈퇴 시까지. 다만 계약·정산 관련 기록은 관계 법령에서 정한 기간 동안 보관합니다.",
      "",
      "4. 동의 거부 권리",
      "  - 동의를 거부할 권리가 있으나, 미동의 시 회원가입 및 서비스 이용이 제한됩니다.",
    ].join("\n"),
  },
  {
    kind: "PRIVACY_OPTIONAL",
    version: "2026-08-01",
    title: "마케팅 정보 수신 동의",
    required: false,
    body: [
      "대관 공고·시설 안내·행사 소식 등 마케팅 정보를 이메일·문자·알림톡으로 받아보실 수 있습니다.",
      "동의하지 않아도 회원가입 및 서비스 이용에는 제한이 없습니다.",
      "수신 동의는 마이페이지에서 언제든지 철회할 수 있습니다.",
    ].join("\n"),
  },
];

/** 동의 시점의 본문을 특정하는 해시. 본문이 한 글자라도 바뀌면 값이 달라진다. */
export function termsBodyHash(body: string): string {
  return crypto.createHash("sha256").update(body, "utf8").digest("hex");
}

export function findTerms(kind: string): TermsDocument | undefined {
  return TERMS.find((t) => t.kind === kind);
}

/** 화면에 내려줄 목록 — 본문 해시를 함께 실어 클라이언트가 무엇에 동의했는지 되짚을 수 있게 한다. */
export function termsForClient() {
  return TERMS.map((t) => ({
    kind: t.kind,
    version: t.version,
    title: t.title,
    required: t.required,
    body: t.body,
    bodyHash: termsBodyHash(t.body),
  }));
}
