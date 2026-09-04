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
  /**
   * 버튼. path 는 인앱·이메일 링크(환경별 호스트를 붙인다).
   * kakaoUrl 은 카카오 템플릿에 등록된 웹링크 그대로 — 알림톡 요청은 등록값과 글자 단위로
   * 같아야 하며(이름·타입·링크), 다르거나 빼면 3027 NoMatchedTemplateButtonException 이다.
   */
  button?: { name: string; path: string; kakaoUrl?: string; kakaoUrlPc?: string };
  /** DKT 에 등록된 카카오 템플릿 코드. 없으면 알림톡을 보내지 않는다(인앱만). */
  kakaoTemplateCode?: string;
  /** 강조표기형(TEXT) 템플릿의 핵심 문구·보조 문구 — 등록값과 같아야 한다. */
  emphasis?: { title: string; subtitle: string };
  /**
   * 카카오 템플릿에 두 번째 이후 버튼이 등록된 경우(ARENA_0002 처럼 버튼 2개). 알림톡 요청은
   * 등록된 버튼 전부를 순서대로 실어야 하므로 첫 버튼(button) 뒤에 이어 붙인다. 인앱·메일은
   * 첫 버튼만 쓴다. kakaoUrl 에는 #{변수} 를 쓸 수 있다(발송 때 variables 로 채운다 — 0006·0016).
   */
  kakaoExtraButtons?: { name: string; kakaoUrl: string; kakaoUrlPc?: string }[];
}

/** 카카오 템플릿(CTSELARNA0_00002·3·5·6·8·9)에 등록된 웹링크 — 운영 신청자 화면 고정값. */
const KAKAO_PARTNER_URL = "https://partner.seoularena.net/";

export const TEMPLATES: TemplateDef[] = [
  {
    // 2026-09-03 팀 요청: 정본 ARENA_0001(회원가입 신청완료)로 전환 — 구 00001 은 "담당자 등록 완료" 문안으로 떴다.
    code: "MB-01",
    kakaoTemplateCode: "ARENA_0001",
    audience: "APPLICANT",
    title: "가입 신청 접수",
    body: "#{신청자명}님, 안녕하세요.\n회원가입이 정상 접수되어 심사가 진행 중입니다. \n\n심사가 완료되면 안내해드리겠습니다.",
    variables: ["신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 신청 완료", subtitle: "서울아레나 대관시스템" },
  },
  {
    // 이미 등록된 회사에 합류 신청한 경우 — 정본에 별도 코드가 없어 ARENA_0001 을 같이 쓴다(문안 동일).
    code: "MB-01J",
    kakaoTemplateCode: "ARENA_0001",
    audience: "APPLICANT",
    title: "기업 합류 신청 접수",
    body: "#{신청자명}님, 안녕하세요.\n회원가입이 정상 접수되어 심사가 진행 중입니다. \n\n심사가 완료되면 안내해드리겠습니다.",
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
    button: { name: "서울아레나 대관시스템 가기", path: "/", kakaoUrl: KAKAO_PARTNER_URL },
  },
  {
    // 2026-09-03: 정본 ARENA_0002 로 전환 — 버튼 2개(대관시스템 / 1:1 문의), 둘 다 PC 링크 등록.
    code: "MB-03",
    kakaoTemplateCode: "ARENA_0002",
    audience: "APPLICANT",
    title: "가입 반려",
    body: "#{신청자명}님, 안녕하세요.\n제출해 주신 가입 신청은 아래 사유로 승인이 반려되었습니다.\n\n▪︎사유\n#{거절사유}",
    variables: ["신청자명", "거절사유"],
    release: "FIRST",
    emphasis: { title: "회원가입 반려 안내", subtitle: "서울아레나 대관시스템" },
    button: { name: "대관시스템 바로가기", path: "/", kakaoUrl: KAKAO_PARTNER_URL, kakaoUrlPc: KAKAO_PARTNER_URL },
    kakaoExtraButtons: [
      {
        name: "1:1 문의 바로가기",
        kakaoUrl: "https://partner.seoularena.net/mypage/inquiries/new",
        kakaoUrlPc: "https://partner.seoularena.net/mypage/inquiries/new",
      },
    ],
  },
  {
    // 2026-09-03: 정본 ARENA_0005 로 전환(변수 대표담당자·신청자명, 버튼 → 담당자 관리).
    code: "MB-04",
    kakaoTemplateCode: "ARENA_0005",
    audience: "APPLICANT",
    // 본문은 카카오 등록값이라 고치지 않는다 — 승인 주체가 운영진으로 바뀐 것은
    // 화면(담당자 관리)에서 안내한다 (2026-09-04).
    title: "합류 신청 발생 (대표 담당자에게)",
    body: "#{대표담당자}님, 안녕하세요.\n귀사에 소속된 #{신청자명}님이 가입을 신청했습니다.\n\n신청 내용을 확인하고 승인해주세요.",
    variables: ["대표담당자", "신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 승인 요청", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "신청 내용 확인하기",
      path: "/mypage/members",
      kakaoUrl: "https://partner.seoularena.net/mypage/members",
      kakaoUrlPc: "https://partner.seoularena.net/mypage/members",
    },
  },
  {
    // 신규 회사 등록 신청 → 운영자 (2026-09-01 팀 요청, 카카오 ARENA_0013 승인분 연동).
    // 버튼·본문은 bo 백오피스 심사 화면 기준.
    code: "MB-05",
    kakaoTemplateCode: "ARENA_0013",
    audience: "ADMIN",
    title: "회사 신규 등록 (운영자)",
    body: "#{운영자명}님, 안녕하세요. \n신규 회사등록 신청이 접수되었습니다. \n\n아래 링크에서 신청 내용을 확인해주세요.",
    variables: ["운영자명"],
    release: "FIRST",
    emphasis: { title: "신규 회사 등록 신청 접수", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "신청 내용 확인하기",
      path: "/admin/applicants",
      kakaoUrl: "https://bo.seoularena.net/admin/applicants",
      kakaoUrlPc: "https://bo.seoularena.net/admin/applicants",
    },
  },
  {
    // 대표 담당자가 링크로 담당자를 초대할 때 — 계정이 없는 수신자.
    // 2026-09-03: 정본 ARENA_0006 으로 전환 — 초대 링크는 본문이 아니라 버튼 URL 의 변수(#{초대링크},
    // 등록값 "https://partner.seoularena.net/#{초대링크}")로 실린다. 값은 호스트 뒤 경로("register?invite=…").
    code: "MB-06",
    kakaoTemplateCode: "ARENA_0006",
    audience: "APPLICANT",
    title: "담당자 초대",
    body: "#{담당자명}님, 안녕하세요. \n#{회사명}에서 서울아레나 대관시스템 담당자로 초대했습니다. \n\n아래 링크에서 3일 이내에 본인 인증 후 계정 정보를 등록해주세요.",
    variables: ["담당자명", "회사명", "초대링크"],
    release: "FIRST",
    emphasis: { title: "대관 담당자 초대", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "초대 링크 바로가기",
      path: "/register",
      kakaoUrl: "https://partner.seoularena.net/#{초대링크}",
      kakaoUrlPc: "https://partner.seoularena.net/#{초대링크}",
    },
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
    button: { name: "대관시스템 바로가기", path: "/", kakaoUrl: KAKAO_PARTNER_URL },
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
    button: { name: "대관시스템 바로가기", path: "/", kakaoUrl: KAKAO_PARTNER_URL },
  },
  {
    // 대표 담당자 권한을 넘겨받은 사람에게
    // 2026-09-03: 정본 ARENA_0007 로 전환(변수 수임자명, 버튼 → 로그인, PC 링크).
    code: "MB-09",
    kakaoTemplateCode: "ARENA_0007",
    audience: "APPLICANT",
    title: "대표 담당자 권한 위임 (받는 사람)",
    body: "#{수임자명}님, 안녕하세요.\n서울아레나 대관시스템의 대표담당자 권한을 위임받으셨습니다. \n\n이제 회원 승인 권한을 이용하실 수 있습니다.",
    variables: ["수임자명"],
    release: "FIRST",
    emphasis: { title: "대표 담당자 권한 위임 완료", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "대관시스템 로그인 하기",
      path: "/login",
      kakaoUrl: "https://partner.seoularena.net/login",
      kakaoUrlPc: "https://partner.seoularena.net/login",
    },
  },
  {
    // 권한을 넘긴 이전 대표 담당자에게
    // 2026-09-03: 정본 ARENA_0008 로 전환(변수 이전대표담당자·대표담당자명, 버튼 없음).
    code: "MB-10",
    kakaoTemplateCode: "ARENA_0008",
    audience: "APPLICANT",
    title: "대표 담당자 권한 이관 (넘긴 사람)",
    body: "#{이전대표담당자}님, 안녕하세요. \n대표 담당자 권한이 #{대표담당자명}님에게 이관되었습니다. \n\n변경된 권한은 즉시 적용됩니다.",
    variables: ["이전대표담당자", "대표담당자명"],
    release: "FIRST",
    emphasis: { title: "대표 담당자 권한 이관 완료", subtitle: "서울아레나 대관시스템" },
  },
  // ── 2026-09-01 팀 요청 신규 연동 (카카오 ARENA_ 세트, 본문은 등록값과 글자 단위 동일) ──
  {
    // 가입 승인 → 신청자 본인. 최초 가입자(대표 지정) 승인 시 ARENA-0004 와 순차 발송.
    code: "ARENA-0003",
    kakaoTemplateCode: "ARENA_0003",
    audience: "APPLICANT",
    title: "가입 승인",
    body: "#{신청자명}님, 안녕하세요.\n서울아레나 대관시스템 회원가입이 승인되었습니다.\n\n이제 로그인하여 대관 신청·조회 서비스를 이용하실 수 있습니다.",
    variables: ["신청자명"],
    release: "FIRST",
    emphasis: { title: "회원가입 승인 완료", subtitle: "서울아레나 대관시스템" },
    button: { name: "대관시스템 바로가기", path: "/login", kakaoUrl: "https://partner.seoularena.net/login" },
  },
  {
    // 최초 가입자가 대표 담당자로 등록될 때 → 그 사람에게.
    code: "ARENA-0004",
    kakaoTemplateCode: "ARENA_0004",
    audience: "APPLICANT",
    title: "대표 담당자 등록 완료",
    body: "#{신청자명}님, 안녕하세요. \n#{회사명}의 대표 담당자로 등록되었습니다. \n\n이제 회원 승인 권한을 이용하실 수 있습니다.",
    variables: ["신청자명", "회사명"],
    release: "FIRST",
    emphasis: { title: "대표 담당자 등록 완료", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "대관시스템 바로가기",
      path: "/mypage/members",
      kakaoUrl: "https://partner.seoularena.net/mypage/members",
      kakaoUrlPc: "https://partner.seoularena.net/mypage/members",
    },
  },
  {
    // 대표 담당자가 담당자를 소속 해제할 때 → 해제 대상자에게.
    // ARENA_0012 는 2026-09-01 기준 카카오 검수 중(I) — 승인되면 자동으로 발송된다.
    code: "ARENA-0012",
    kakaoTemplateCode: "ARENA_0012",
    audience: "APPLICANT",
    title: "소속 해제",
    body: "#{신청자명}님, 안녕하세요.\n#{회사명}의 대표 담당자 요청으로 담당자 소속이 해제되었습니다.\n\n해당 회사의 대관 업무를 더 이상 이용하실 수 없습니다.",
    variables: ["신청자명", "회사명"],
    release: "FIRST",
    emphasis: { title: "소속 해제 안내", subtitle: "서울아레나 대관시스템" },
  },
  {
    // 1:1 문의 등록 완료 → 등록자 본인. (버튼 없음)
    code: "ARENA-0010",
    kakaoTemplateCode: "ARENA_0010",
    audience: "APPLICANT",
    title: "1:1 문의 등록",
    body: "#{등록자명}님, 안녕하세요. \n1:1 문의 등록이 완료되었습니다. \n\n답변이 등록되면 안내드리겠습니다.",
    variables: ["등록자명"],
    release: "FIRST",
    emphasis: { title: "1:1 문의 등록 완료", subtitle: "서울아레나 대관시스템" },
  },
  {
    // 1:1 문의 답변 등록 완료 → 문의 등록자에게.
    code: "ARENA-0009",
    kakaoTemplateCode: "ARENA_0009",
    audience: "APPLICANT",
    title: "1:1 문의 답변 완료",
    body: "#{등록자명}님, 안녕하세요. \n1:1문의에 답변이 등록되었습니다.",
    variables: ["등록자명"],
    release: "FIRST",
    emphasis: { title: "1:1문의 답변 완료", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "1:1 문의 바로가기",
      path: "/mypage/inquiries",
      kakaoUrl: "https://partner.seoularena.net/mypage/inquiries",
      kakaoUrlPc: "https://partner.seoularena.net/mypage/inquiries",
    },
  },
  // ── 2026-09-04 팀 재등록분(링크 오류로 0002·0003 대체, 카카오 검수 대기) ──
  // 승인(kep O) 전에는 카카오가 거절하므로 코드는 그대로 두고, 승인되면 배포 없이
  //   BIZTALK_TEMPLATE_OVERRIDES=ARENA-0003=ARENA_0017,MB-03=ARENA_0018
  // 로 전환한다 — dispatch 가 덮어쓴 카카오 코드에 맞는 아래 정의(본문·강조·버튼)를 골라 쓴다.
  {
    code: "ARENA-0017",
    kakaoTemplateCode: "ARENA_0017",
    audience: "APPLICANT",
    title: "가입 승인 (재등록분)",
    body: "#{신청자명}님, 안녕하세요.\n서울아레나 대관시스템 회원가입이 승인되었습니다. \n\n이제 로그인하여 대관 신청·조회 서비스를 이용하실 수 있습니다.",
    variables: ["신청자명"],
    release: "TBD",
    emphasis: { title: "회원가입 승인 완료", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "대관시스템 바로가기",
      path: "/login",
      kakaoUrl: "https://partner.seoularena.net/login",
      kakaoUrlPc: "https://partner.seoularena.net/login",
    },
  },
  {
    code: "ARENA-0018",
    kakaoTemplateCode: "ARENA_0018",
    audience: "APPLICANT",
    title: "가입 반려 (재등록분)",
    body: "#{신청자명}님, 안녕하세요. \n제출해 주신 가입 신청은 아래 사유로 승인이 반려되었습니다. \n\n▪︎사유\n#{거절사유}",
    variables: ["신청자명", "거절사유"],
    release: "TBD",
    emphasis: { title: "회원가입 반려 안내", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "대관시스템 바로가기",
      path: "/login",
      kakaoUrl: "https://partner.seoularena.net/login",
      kakaoUrlPc: "https://partner.seoularena.net/login",
    },
    kakaoExtraButtons: [
      {
        name: "1:1 문의 바로가기",
        kakaoUrl: "https://partner.seoularena.net/inquiry",
        kakaoUrlPc: "https://partner.seoularena.net/inquiry",
      },
    ],
  },
  // ── 2026-09-03 팀 요청 신규 3종 (카카오 승인 O, 본문·버튼은 등록값과 글자 단위 동일) ──
  {
    // 1:1 문의 접수 → 운영자 전원. 인앱은 호출부의 notifyAdmins 가 이미 남긴다.
    code: "ARENA-0014",
    kakaoTemplateCode: "ARENA_0014",
    audience: "ADMIN",
    title: "1:1 문의 접수 (운영자)",
    body: "#{운영자명}님, 안녕하세요. \n새로운 1:1문의가 접수되었습니다.\n\n문의 내용을 확인하신 후 답변을 등록해 주세요.",
    variables: ["운영자명"],
    release: "FIRST",
    emphasis: { title: "1:1문의 접수", subtitle: "서울아레나 대관시스템" },
    button: {
      name: "1:1문의 바로가기",
      path: "/admin/inquiries",
      kakaoUrl: "https://bo.seoularena.net/admin/inquiries",
      kakaoUrlPc: "https://bo.seoularena.net/admin/inquiries",
    },
  },
  {
    // 운영자가 소속 담당자를 지운(권한 해제) 경우 → 그 사람에게. 버튼 없음.
    code: "ARENA-0015",
    kakaoTemplateCode: "ARENA_0015",
    audience: "APPLICANT",
    title: "담당자 권한 해제 (운영자 처리)",
    body: "#{신청자명}님, 안녕하세요. \n운영자에 의해 #{회사명}의 담당자 권한이 해제되었습니다. \n\n소속 해제 이후에는 해당 회사의 대관 업무를 이용하실 수 없습니다.",
    variables: ["신청자명", "회사명"],
    release: "FIRST",
    emphasis: { title: "담당자 권한 해제 안내", subtitle: "서울아레나 대관시스템" },
  },
  {
    // 비회원 1:1 문의 답변 완료 — 로그인이 없으므로 버튼이 그 문의 하나를 여는 링크(#{1:1문의링크},
    // 등록값 "https://partner.seoularena.net/#{1:1문의링크}", 값은 "inquiry/{id}?t={토큰}"). 모바일 링크만 등록됨.
    code: "ARENA-0016",
    kakaoTemplateCode: "ARENA_0016",
    audience: "APPLICANT",
    title: "1:1 문의 답변 완료 (비회원)",
    body: "#{등록자명}님, 안녕하세요. \n1:1문의에 답변이 등록되었습니다.",
    variables: ["등록자명", "1:1문의링크"],
    release: "FIRST",
    emphasis: { title: "1:1문의 답변 완료", subtitle: "서울아레나 대관시스템" },
    button: { name: "1:1 문의 바로가기", path: "/inquiry", kakaoUrl: "https://partner.seoularena.net/#{1:1문의링크}" },
  },
];

export function findTemplate(code: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.code === code) ?? QUOTE_TEMPLATES.find((t) => t.code === code);
}

/** 카카오 템플릿 코드로 정의 찾기 — 환경변수로 코드를 갈아탄 경우(0002→0018 등) 그 문안을 쓰기 위해. */
export function findTemplateByKakaoCode(kakaoCode: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.kakaoTemplateCode === kakaoCode) ?? QUOTE_TEMPLATES.find((t) => t.kakaoTemplateCode === kakaoCode);
}

/** 자리표시자 추출 — 본문과 variables 선언이 어긋나는 것을 막는다. */
export function placeholdersIn(body: string): string[] {
  return [...body.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]);
}

export class TemplateVariableError extends Error {}

/** 본문 + 카카오 버튼 URL 의 자리표시자 — 등록 링크에 변수가 있는 템플릿(0006·0016)까지 선언과 대조한다. */
export function templatePlaceholders(def: TemplateDef): string[] {
  const urls = [
    def.button?.kakaoUrl,
    def.button?.kakaoUrlPc,
    ...(def.kakaoExtraButtons ?? []).flatMap((b) => [b.kakaoUrl, b.kakaoUrlPc]),
  ];
  return [...new Set([...placeholdersIn(def.body), ...urls.flatMap((u) => (u ? placeholdersIn(u) : []))])];
}

/** 카카오 버튼 URL 의 #{변수} 를 채운다 — 누락은 본문과 같이 발송 전에 막는다(빈 링크가 나가면 안 된다). */
export function fillUrlVariables(url: string, variables: Record<string, string>): string {
  const missing = placeholdersIn(url).filter((k) => String(variables[k] ?? "").trim() === "");
  if (missing.length > 0) throw new TemplateVariableError(`버튼 링크 변수 누락: ${missing.join(", ")}`);
  return url.replace(/#\{([^}]+)\}/g, (_, k) => String(variables[k]));
}

/**
 * 변수를 채워 본문을 만든다.
 * 빈 값이 그대로 나가면 신뢰가 즉시 깨지므로(기획서 1-54), 누락은 발송 전에 막는다.
 */
/**
 * 신청서(대관) 이벤트 알림 — RT 계열. 2026-08-28 CBT 에 MNG API 로 등록(코드 = 우리 코드 그대로).
 * 본문은 등록값과 글자 단위로 같아야 한다. 버튼 없음(강조표기형 TEXT).
 */
const RT_SUBTITLE = "서울아레나 대관시스템";
export const QUOTE_TEMPLATES: TemplateDef[] = [
  {
    code: "RT-01",
    kakaoTemplateCode: "RT-01",
    audience: "APPLICANT",
    title: "대관 신청 접수",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}가 정상 접수되었습니다.\n\n운영자 심사 후 결과를 다시 안내드리겠습니다.",
    variables: ["신청자명", "신청번호"],
    release: "FIRST",
    emphasis: { title: "대관 신청 접수 완료", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-02",
    kakaoTemplateCode: "RT-02",
    audience: "APPLICANT",
    title: "대관 심사 결과",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 심사 결과를 안내드립니다.\n\n▪︎ 심사 결과: #{심사결과}\n▪︎ 안내: #{안내}\n\n자세한 내용은 대관시스템에서 확인해 주세요.",
    variables: ["신청자명", "신청번호", "심사결과", "안내"],
    release: "FIRST",
    emphasis: { title: "대관 심사 결과 안내", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-03",
    kakaoTemplateCode: "RT-03",
    audience: "APPLICANT",
    title: "계약금액 확정",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 계약금액이 확정되었습니다.\n\n▪︎ 계약금액: #{금액}원\n\n계약 절차 안내는 대관시스템에서 확인해 주세요.",
    variables: ["신청자명", "신청번호", "금액"],
    release: "FIRST",
    emphasis: { title: "계약금액 확정", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-04",
    kakaoTemplateCode: "RT-04",
    audience: "APPLICANT",
    title: "계약서 날인 요청",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 계약서에 공연장측 날인이 완료되었습니다.\n\n대관시스템에서 계약서를 확인하시고 날인을 진행해 주세요.",
    variables: ["신청자명", "신청번호"],
    release: "FIRST",
    emphasis: { title: "계약서 날인 요청", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-05",
    kakaoTemplateCode: "RT-05",
    audience: "APPLICANT",
    title: "세금계산서 발행",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 #{구분} 세금계산서가 발행되었습니다.\n\n입금 후 대관시스템에서 입금신청을 진행해 주세요.",
    variables: ["신청자명", "신청번호", "구분"],
    release: "FIRST",
    emphasis: { title: "세금계산서 발행 안내", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-06",
    kakaoTemplateCode: "RT-06",
    audience: "APPLICANT",
    title: "입금 확인",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 #{구분} 입금이 확인되었습니다.\n\n감사합니다.",
    variables: ["신청자명", "신청번호", "구분"],
    release: "FIRST",
    emphasis: { title: "입금 확인", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-07",
    kakaoTemplateCode: "RT-07",
    audience: "APPLICANT",
    title: "보증금 입금 확인",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 보증금 입금이 확인되었습니다.\n\n감사합니다.",
    variables: ["신청자명", "신청번호"],
    release: "FIRST",
    emphasis: { title: "보증금 입금 확인", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-08",
    kakaoTemplateCode: "RT-08",
    audience: "APPLICANT",
    title: "최종 정산금액 확정",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 최종 정산금액이 확정되었습니다.\n\n▪︎ 정산금액: #{금액}원\n\n자세한 내역은 대관시스템에서 확인해 주세요.",
    variables: ["신청자명", "신청번호", "금액"],
    release: "FIRST",
    emphasis: { title: "최종 정산금액 확정", subtitle: RT_SUBTITLE },
  },
  {
    code: "RT-09",
    kakaoTemplateCode: "RT-09",
    audience: "APPLICANT",
    title: "부속합의 등록",
    body: "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}에 부속합의가 등록되었습니다.\n\n▪︎ 내용: #{내용}\n▪︎ 금액 변동: #{금액변동}원\n\n자세한 내역은 대관시스템에서 확인해 주세요.",
    variables: ["신청자명", "신청번호", "내용", "금액변동"],
    release: "FIRST",
    emphasis: { title: "부속합의 등록 안내", subtitle: RT_SUBTITLE },
  },
];

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
