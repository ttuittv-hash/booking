// 알림톡 템플릿 — 기획서 B2 회원가입 계열 (2026-08-25 DKT 검증 서버의 정본과 동기화).
//
// 문안을 코드에 두는 이유: 심사 통과분만 골라 켜야 하고, 변수 목록이 코드와
// 어긋나면 빈 값이 그대로 발송된다. 심사 상태·활성 여부는 DB(message_templates)로
// 관리하고, 여기서는 "무엇을 어떤 변수로 렌더링하는가"만 정의한다.
//
// 카카오 쪽 정본은 DKT 유저웹에 등록된 CTSELARNA0_0000x 9종이다(팀에서 기획 문안으로
// 등록). 알림톡은 본문이 등록 템플릿과 글자 단위로 같아야 발송되므로, body·강조문구·
// 버튼을 그쪽과 맞춘다. 내부 코드(MB-xx)는 이력·멱등키에 쓰이므로 그대로 두고
// kakaoTemplateCode 로 매핑한다. 문안을 고칠 때는 유저웹(또는 MNG API)에서도 같이 고칠 것.

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
  /** DKT 에 등록된 카카오 템플릿 코드. 없으면 알림톡을 보내지 않는다(인앱만). */
  kakaoTemplateCode?: string;
  /** 강조표기형(TEXT) 템플릿의 핵심 문구·보조 문구 — 등록값과 같아야 한다. */
  emphasis?: { title: string; subtitle: string };
}

export const TEMPLATES: TemplateDef[] = [
  {
    code: "MB-01",
    kakaoTemplateCode: "CTSELARNA0_00001",
    audience: "APPLICANT",
    title: "가입 신청 접수",
    body: "#{신청자명}님, 안녕하세요. \n회원가입이 정상 접수되어 심사가 진행중입니다.",
    variables: ["신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 신청 완료", subtitle: "서울아레나 대관시스템" },
  },
  {
    // 이미 등록된 회사에 합류 신청한 경우 — 본문은 00001 과 같지만 카카오 쪽에 별도 코드로 있다.
    code: "MB-01J",
    kakaoTemplateCode: "CTSELARNA0_00004",
    audience: "APPLICANT",
    title: "기업 합류 신청 접수",
    body: "#{신청자명}님, 안녕하세요. \n회원가입이 정상 접수되어 심사가 진행중입니다.",
    variables: ["신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 신청 완료", subtitle: "서울아레나 대관시스템" },
  },
  {
    code: "MB-02",
    kakaoTemplateCode: "CTSELARNA0_00002",
    audience: "APPLICANT",
    title: "가입 승인",
    body: "#{신청자명}님, 안녕하세요.\n서울아레나 대관 신청 계정 가입이 승인되었습니다. \n\n이제 대관시스템에 로그인하여 대관 신청·조회를 이용하실 수 있습니다.",
    variables: ["신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 승인 완료", subtitle: "서울아레나 대관시스템" },
    button: { name: "서울아레나 대관시스템 가기", path: "/" },
  },
  {
    code: "MB-03",
    kakaoTemplateCode: "CTSELARNA0_00003",
    audience: "APPLICANT",
    title: "가입 반려",
    body: "#{신청자명}님, 안녕하세요.\n제출해 주신 가입 신청은 아래 사유로 승인이 반려되었습니다.\n\n▪︎사유\n#{거절사유}",
    variables: ["신청자명", "거절사유"],
    release: "FIRST",
    emphasis: { title: "회원가입 반려 안내", subtitle: "서울아레나 대관시스템" },
    button: { name: "1:1 문의", path: "/" },
  },
  {
    code: "MB-04",
    kakaoTemplateCode: "CTSELARNA0_00005",
    audience: "APPLICANT",
    title: "합류 신청 발생 (대표 담당자에게)",
    body: "#{마스터}님, 안녕하세요. \n귀사 소속된 #{신청자명}님이 가입을 신청하였습니다.\n\n신청 내용을 확인하고 승인해주세요.",
    variables: ["마스터", "신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 승인 요청", subtitle: "서울아레나 대관시스템" },
    button: { name: "신청 내용 확인", path: "/" },
  },
  {
    // 운영자에게 가는 알림 — 카카오 정본에 운영자용 템플릿이 없다. 인앱으로만 나간다.
    code: "MB-05",
    audience: "ADMIN",
    title: "회사 신규 등록 (운영자)",
    body: "신규 회사 등록 신청이 접수되었습니다.\n회사명: #{회사명}\n신청자: #{신청자명}",
    variables: ["회사명", "신청자명"],
    release: "FIRST",
    button: { name: "심사 화면", path: "/admin/applicants" },
  },
  {
    // 대표 담당자가 링크로 담당자를 초대할 때 — 계정이 없는 수신자라 링크를 본문 변수로 담는다.
    // 카카오 정본에는 없는 문안이라 별도 등록(MB-06, 검수 대기)해 두었다.
    code: "MB-06",
    kakaoTemplateCode: "MB-06",
    audience: "APPLICANT",
    title: "담당자 초대",
    body: "#{회사명}에서 서울아레나 대관시스템 담당자로 초대했습니다.\n아래 링크에서 7일 이내에 본인 인증 후 계정 정보를 등록해주세요.\n#{초대링크}",
    variables: ["회사명", "초대링크"],
    release: "SECOND",
  },
  {
    // 운영자가 계정을 직접 만들어 준 경우 — 정본의 "담당자 등록 완료(초기)"를 쓴다.
    code: "MB-07",
    kakaoTemplateCode: "CTSELARNA0_00009",
    audience: "APPLICANT",
    title: "담당자 등록 완료 (계정 생성)",
    body: "#{신청자명}님, 안녕하세요.\n#{회사명}의 담당자로 등록되었습니다. \n\n이제 대관 신청 및 관련 업무를 진행하실 수 있습니다.",
    variables: ["신청자명", "회사명"],
    release: "SECOND",
    emphasis: { title: "담당자 등록 완료", subtitle: "서울아레나 대관시스템" },
    button: { name: "대관시스템 바로가기", path: "/" },
  },
  {
    // 초대 링크로 합류를 마쳤을 때
    code: "MB-08",
    kakaoTemplateCode: "CTSELARNA0_00008",
    audience: "APPLICANT",
    title: "담당자 등록 완료 (초대)",
    body: "#{신청자명}님, 안녕하세요.\n#{마스터}님의 초대로 #{회사명}의 담당자로 등록되었습니다. \n\n이제 서울아레나 대관시스템을 이용하실 수 있습니다.",
    variables: ["신청자명", "마스터", "회사명"],
    release: "SECOND",
    emphasis: { title: "담당자 등록 완료", subtitle: "서울아레나 대관시스템" },
    button: { name: "대관시스템 바로가기", path: "/" },
  },
  {
    // 대표 담당자 권한을 넘겨받은 사람에게
    code: "MB-09",
    kakaoTemplateCode: "CTSELARNA0_00006",
    audience: "APPLICANT",
    title: "대표 담당자 권한 위임 (받는 사람)",
    body: "#{신청자명}님, 안녕하세요.\n서울아레나 대관 신청 시스템의 마스터 권한을 위임받으셨습니다. \n\n이제 회원·대관 관리 권한을 사용하실 수 있습니다.",
    variables: ["신청자명"],
    release: "SECOND",
    emphasis: { title: "마스터 권한 위임 완료", subtitle: "서울아레나 대관시스템" },
    button: { name: "링크 바로가기", path: "/" },
  },
  {
    // 권한을 넘긴 이전 대표 담당자에게
    code: "MB-10",
    kakaoTemplateCode: "CTSELARNA0_00007",
    audience: "APPLICANT",
    title: "대표 담당자 권한 이관 (넘긴 사람)",
    body: "#{마스터}님, 안녕하세요.\n마스터 권한이 #{신청자명}님에게 이관되었습니다. \n\n변경된 권한은 즉시 적용됩니다.",
    variables: ["마스터", "신청자명"],
    release: "SECOND",
    emphasis: { title: "마스터 권한 이관 완료", subtitle: "서울아레나 대관시스템" },
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
