import type { NotificationRule } from "@/lib/pricing/types";
const system = [
  {
    typeCode: "INVOICE_UNPAID",
    label: "세금계산서 미입금",
    description: "계약금·정산금 세금계산서가 발행됐는데 입금 확인이 안 된 상태가 이어지면, 아래 간격마다 신청자와 운영자 모두에게 재발송합니다.",
    thresholdDays: null,
    repeatIntervalDays: 5,
    messageTemplate: "{quoteId}의 {purposeLabel} 세금계산서가 미입금 상태입니다. 입금 후 입금신청을 진행해주세요.",
  },
  {
    typeCode: "TICKET_OPEN_MISSING",
    label: "티켓오픈 자료 미업로드",
    description: "등록된 티켓오픈일까지 아래 일수 이내로 남았는데 자료(포스터/상세페이지/좌석배치도)가 업로드되지 않았으면, 매일 재발송합니다.",
    thresholdDays: 30,
    repeatIntervalDays: 1,
    messageTemplate: "{quoteId}의 티켓오픈일({openDate})이 다가오는데 자료(포스터/상세페이지/좌석배치도)가 업로드되지 않았습니다.",
  },
  {
    typeCode: "FACILITY_MEETING_MISSING",
    label: "시설회의 자료 미업로드",
    description: "등록된 시설회의일까지 아래 일수 이내로 남았는데 자료(운영 매뉴얼/프로덕션 노트)가 업로드되지 않았으면, 매일 재발송합니다.",
    thresholdDays: 7,
    repeatIntervalDays: 1,
    messageTemplate: "{quoteId}의 시설회의일({meetingDate})이 다가오는데 자료(운영 매뉴얼/프로덕션 노트)가 업로드되지 않았습니다.",
  },
];
const catalog = [
  {
    typeCode: "SIGNUP_APPROVED",
    label: "회원가입 승인",
    description:
      "운영자가 /admin/applicants 에서 가입을 승인하면 나가는 안내입니다. 상태 전환과 인앱 알림은 이미 구현되어 있고, 카카오 알림톡·이메일 발송 채널은 아직 연동되지 않았습니다.",
    messageTemplate:
      "{담당자명}님, 서울아레나 대관 신청 계정 가입이 승인되었습니다. 지금부터 패키지 안내 확인, 예상 대관료 산출, 대관 신청서 작성이 모두 가능합니다.",
  },
  {
    typeCode: "SIGNUP_ON_HOLD",
    label: "회원가입 심사 보류 (신규 상태값 필요)",
    description:
      "서류·정보 보완이 필요해 판단을 미루는 상태입니다. 지금 시스템엔 없는 상태값(ApprovalStatus.ON_HOLD)이라 상태값 추가, 운영자 화면의 보류 사유 입력란, /pending 안내 문구, 신청자 재제출 경로가 함께 개발되어야 실제로 동작합니다.",
    messageTemplate:
      "{담당자명}님, 제출해 주신 가입 신청은 확인이 더 필요해 일시 보류되었습니다. 보류 사유: {보류사유}. 안내에 따라 자료를 보완해 다시 제출해 주시면 심사가 이어집니다.",
  },
  {
    typeCode: "SIGNUP_REJECTED",
    label: "회원가입 승인 불가 (거절)",
    description:
      "상태 전환과 인앱 알림은 이미 구현되어 있습니다. 다만 현재 거절 액션에는 사유를 입력하는 칸이 없어, 이 문구의 {거절사유}를 실제로 채우려면 거절 액션에 사유 입력란을 추가해야 합니다. 카카오 알림톡·이메일 발송 채널도 아직 연동 전입니다.",
    messageTemplate:
      "{담당자명}님, 제출해 주신 가입 신청은 아래 사유로 이번엔 승인이 어려운 것으로 확인되었습니다. 사유: {거절사유}. 자세한 사항은 대관운영팀으로 문의해 주세요.",
  },
];
export const notificationPreviewSeed: NotificationRule[] = [...system.map(rule => ({...rule, isSystem:true})), ...catalog.map(rule => ({...rule, isSystem:false, thresholdDays:null, repeatIntervalDays:null}))].map((rule,index) => ({...rule,id:`preview-rule-${index}`,enabled:true,createdAt:"2026-10-02T00:00:00Z",updatedAt:"2026-10-02T00:00:00Z"}));
