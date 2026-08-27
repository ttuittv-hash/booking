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

for (const [code, name, title, content] of TEMPLATES) {
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
    }),
  });
  console.log(code, res.status, (await res.text()).slice(0, 160));
}
