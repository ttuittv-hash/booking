// DKT MNG API 로 알림톡 템플릿을 등록한다(클러스터 안에서 실행 — ACL).
//   kubectl -n arena-dev exec -i deploy/arena -- node scripts/biztalk-register-templates.mjs RT-02 RT-03 ...
// 인자 없이 실행하면 아래 목록 전부를 등록한다. 이미 있는 코드는 DKT 가 거절하므로 안전하다.
// 본문은 src/lib/message/templates.ts 의 QUOTE_TEMPLATES 와 글자 단위로 같아야 한다.

const SUB = "서울아레나 대관시스템";
const TEMPLATES = [
  ["RT-01", "대관_신청접수", "대관 신청 접수 완료", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}가 정상 접수되었습니다.\n\n운영자 심사 후 결과를 다시 안내드리겠습니다."],
  ["RT-02", "대관_심사결과", "대관 심사 결과 안내", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 심사 결과를 안내드립니다.\n\n▪︎ 심사 결과: #{심사결과}\n▪︎ 안내: #{안내}\n\n자세한 내용은 대관시스템에서 확인해 주세요."],
  ["RT-03", "대관_계약금액확정", "계약금액 확정", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 계약금액이 확정되었습니다.\n\n▪︎ 계약금액: #{금액}원\n\n계약 절차 안내는 대관시스템에서 확인해 주세요."],
  ["RT-04", "대관_계약서날인요청", "계약서 날인 요청", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 계약서에 공연장측 날인이 완료되었습니다.\n\n대관시스템에서 계약서를 확인하시고 날인을 진행해 주세요."],
  ["RT-05", "대관_세금계산서발행", "세금계산서 발행 안내", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 #{구분} 세금계산서가 발행되었습니다.\n\n입금 후 대관시스템에서 입금신청을 진행해 주세요."],
  ["RT-06", "대관_입금확인", "입금 확인", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 #{구분} 입금이 확인되었습니다.\n\n감사합니다."],
  ["RT-07", "대관_보증금입금확인", "보증금 입금 확인", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 보증금 입금이 확인되었습니다.\n\n감사합니다."],
  ["RT-08", "대관_최종정산확정", "최종 정산금액 확정", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}의 최종 정산금액이 확정되었습니다.\n\n▪︎ 정산금액: #{금액}원\n\n자세한 내역은 대관시스템에서 확인해 주세요."],
  ["RT-09", "대관_부속합의등록", "부속합의 등록 안내", "#{신청자명}님, 안녕하세요.\n대관 신청서 #{신청번호}에 부속합의가 등록되었습니다.\n\n▪︎ 내용: #{내용}\n▪︎ 금액 변동: #{금액변동}원\n\n자세한 내역은 대관시스템에서 확인해 주세요."],
];

// dev 링크 버튼 달린 신규본(2026-08-28). 기존 CTSELARNA0_0000x 는 운영 링크(partner.seoularena.net)로
// 승인돼 있어 손대지 않는다 — 승인되면 BIZTALK_TEMPLATE_OVERRIDES / BIZTALK_BUTTON_URL 로 갈아탄다.
const DEV_URL = "https://partner.dev.seoularena.net/";
const DEV_BUTTON_TEMPLATES = [
  ["MB-02-DEV", "회원가입_승인완료(dev)", "회원가입 승인 완료", "서울아레나 대관시스템 가기", "#{신청자명}님, 안녕하세요.\n서울아레나 대관 신청 계정 가입이 승인되었습니다. \n\n이제 대관시스템에 로그인하여 대관 신청·조회를 이용하실 수 있습니다."],
  ["MB-03-DEV", "회원가입_반려안내(dev)", "회원가입 반려 안내", "1:1 문의", "#{신청자명}님, 안녕하세요.\n제출해 주신 가입 신청은 아래 사유로 승인이 반려되었습니다.\n\n▪︎사유\n#{거절사유}"],
  ["MB-04-DEV", "회원가입_기업합류승인요청(dev)", "회원가입 승인 요청", "신청 내용 확인", "#{마스터}님, 안녕하세요. \n귀사 소속된 #{신청자명}님이 가입을 신청하였습니다.\n\n신청 내용을 확인하고 승인해주세요."],
  ["MB-07-DEV", "회원가입_담당자등록완료(dev)", "담당자 등록 완료", "대관시스템 바로가기", "#{신청자명}님, 안녕하세요.\n#{회사명}의 담당자로 등록되었습니다. \n\n이제 대관 신청 및 관련 업무를 진행하실 수 있습니다."],
  ["MB-08-DEV", "회원가입_담당자등록완료_초대(dev)", "담당자 등록 완료", "대관시스템 바로가기", "#{신청자명}님, 안녕하세요.\n#{마스터}님의 초대로 #{회사명}의 담당자로 등록되었습니다. \n\n이제 서울아레나 대관시스템을 이용하실 수 있습니다."],
  ["MB-09-DEV", "회원가입_권한위임완료(dev)", "마스터 권한 위임 완료", "링크 바로가기", "#{신청자명}님, 안녕하세요.\n서울아레나 대관 신청 시스템의 마스터 권한을 위임받으셨습니다. \n\n이제 회원·대관 관리 권한을 사용하실 수 있습니다."],
];

const base = (process.env.BIZTALK_BASE_URL || "").replace(/\/$/, "");
if (!base || !process.env.BIZTALK_CLIENT_ID || !process.env.BIZTALK_SENDER_KEY) {
  console.error("BIZTALK_* 환경변수가 없다 — 클러스터 파드 안에서 실행할 것");
  process.exit(1);
}
const wanted = new Set(process.argv.slice(2));
const tok = await fetch(`${base}/mng/v1/oauth/token`, {
  method: "POST",
  headers: {
    Authorization: `Basic ${process.env.BIZTALK_CLIENT_ID} ${process.env.BIZTALK_CLIENT_SECRET}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
}).then((r) => r.json());
const headers = { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };

const ALL = [
  ...TEMPLATES.map(([code, name, title, content]) => ({ code, name, title, content, button: null })),
  ...DEV_BUTTON_TEMPLATES.map(([code, name, title, btn, content]) => ({ code, name, title, content, button: btn })),
];
for (const { code, name, title, content, button } of ALL) {
  if (wanted.size > 0 && !wanted.has(code)) continue;
  const res = await fetch(`${base}/mng/v1/template/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      senderKey: process.env.BIZTALK_SENDER_KEY,
      templateCode: code,
      templateName: name,
      templateContent: content,
      templateMessageType: "BA",
      templateEmphasizeType: "TEXT",
      templateTitle: title,
      templateSubtitle: SUB,
      categoryCode: "001001",
      securityFlag: false,
      ...(button ? { buttons: [{ ordering: 1, name: button, linkType: "WL", linkMo: DEV_URL }] } : {}),
    }),
  });
  console.log(code, res.status, (await res.text()).slice(0, 160));
}
