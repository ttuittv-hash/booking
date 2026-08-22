// 알림톡 템플릿 — 1차 오픈(8/24) 회원가입 5종 (기획서 B2).
//
// 문안을 코드에 두는 이유: 심사 통과분만 골라 켜야 하고, 변수 목록이 코드와
// 어긋나면 빈 값이 그대로 발송된다. 심사 상태·활성 여부는 DB(message_templates)로
// 관리하고, 여기서는 "무엇을 어떤 변수로 렌더링하는가"만 정의한다.

export interface TemplateDef {
  code: string;
  title: string;
  /** 본문 — #{변수} 자리표시자를 쓴다(카카오 규격과 동일 표기). */
  body: string;
  variables: string[];
  /** 1차 오픈 대상인지 */
  release: "FIRST" | "SECOND" | "TBD";
  /** 이 메시지를 받는 사람이 쓰는 화면 — 버튼 링크의 호스트를 이걸로 정한다. */
  audience: "APPLICANT" | "ADMIN";
  button?: { name: string; path: string };
}

export const TEMPLATES: TemplateDef[] = [
  {
    code: "MB-01",
    audience: "APPLICANT",
    title: "가입 신청 접수",
    body: "회원가입이 진행 중입니다.\n가입 심사 완료 후 결과를 다시 안내드리겠습니다.",
    variables: [],
    release: "FIRST",
  },
  {
    code: "MB-02",
    audience: "APPLICANT",
    title: "가입 승인",
    body: "회원가입이 승인되었습니다.\n이제 대관시스템을 이용하실 수 있습니다.",
    variables: [],
    release: "FIRST",
    button: { name: "대관 신청하기", path: "/apply" },
  },
  {
    code: "MB-03",
    audience: "APPLICANT",
    title: "가입 반려",
    body: "회원가입이 반려되었습니다.\n사유: #{반려사유}",
    variables: ["반려사유"],
    release: "FIRST",
  },
  {
    code: "MB-04",
    audience: "APPLICANT",
    title: "합류 신청 발생",
    body: "#{신청자명}님이 귀사 담당자로 합류를 신청했습니다.\n승인해 주세요.",
    variables: ["신청자명"],
    release: "FIRST",
    button: { name: "담당자 관리", path: "/mypage/members" },
  },
  {
    code: "MB-05",
    audience: "ADMIN",
    title: "회사 신규 등록 (운영자)",
    body: "신규 회사 등록 신청이 접수되었습니다.\n회사명: #{회사명}\n신청자: #{신청자명}",
    variables: ["회사명", "신청자명"],
    release: "FIRST",
    button: { name: "심사 화면", path: "/admin/applicants" },
  },
  {
    // 대표 담당자(마스터)가 링크로 담당자를 초대할 때 — 계정이 아직 없는 수신자에게
    // 나가므로 링크를 버튼이 아니라 본문 변수로 담는다(button.path는 고정 경로만
    // 지원해 초대 토큰 같은 동적 값을 못 담는다).
    // [신규 2026-08-22] "마스터·운영자가 담당자를 추가하면 알림이 가야 한다"는
    // 요청으로 추가 — 1차 오픈 5종(기획서 B2)에는 포함되지 않았던 케이스라
    // release는 SECOND로 두되(카카오 알림톡 사전심사 대상 여부는 별도 확인 필요),
    // 발송 파이프라인 자체는 release와 무관하게 지금 바로 동작한다.
    code: "MB-06",
    audience: "APPLICANT",
    title: "담당자 초대",
    body: "#{회사명}에서 서울아레나 대관시스템 담당자로 초대했습니다.\n아래 링크에서 7일 이내에 본인 인증 후 계정 정보를 등록해주세요.\n#{초대링크}",
    variables: ["회사명", "초대링크"],
    release: "SECOND",
  },
  {
    // 운영자가 /admin/applicants/create 로 계정을 직접 만들 때 — 비밀번호는
    // 운영자가 안전한 채널로 별도 전달하므로 메시지에는 담지 않는다.
    code: "MB-07",
    audience: "APPLICANT",
    title: "계정 생성 안내",
    body: "서울아레나 운영자가 담당자 계정을 생성했습니다.\n아이디: #{아이디}\n로그인 정보는 담당자를 통해 별도로 전달받으세요.",
    variables: ["아이디"],
    release: "SECOND",
    button: { name: "로그인", path: "/login" },
  },
];

export function findTemplate(code: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.code === code);
}

/** 자리표시자 추출 — 본문과 variables 선언이 어긋나는 것을 막는다. */
export function placeholdersIn(body: string): string[] {
  return [...body.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]);
}

export class TemplateVariableError extends Error {}

/**
 * 변수를 채워 본문을 만든다.
 * 빈 값이 그대로 나가면 신뢰가 즉시 깨지므로(기획서 1-54), 누락은 발송 전에 막는다.
 */
export function renderTemplate(code: string, variables: Record<string, string>): string {
  const def = findTemplate(code);
  if (!def) throw new TemplateVariableError(`템플릿을 찾을 수 없습니다: ${code}`);

  const needed = placeholdersIn(def.body);
  const missing = needed.filter((k) => {
    const v = variables[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
  if (missing.length > 0) {
    throw new TemplateVariableError(`${code} 변수 누락: ${missing.join(", ")}`);
  }
  return def.body.replace(/#\{([^}]+)\}/g, (_, k) => String(variables[k]));
}
