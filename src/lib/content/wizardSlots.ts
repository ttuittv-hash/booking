/*
  [신규 2026-09-06] "위저드 모든 슬롯을 관리자가 위/아래로 조정 가능하게" 요청 —
  STEP 3(기본 정보)를 이루는 슬롯의 key·기본 순서·표시 라벨. WizardShell.tsx(위저드
  렌더링)와 WizardTextPreview.tsx(어드민 순서 편집 UI)가 둘 다 이 값을 쓰므로, 위저드
  전체를 끌고 오지 않도록 의존성 없는 별도 파일에 둔다.

  [개정 2026-09-06] "슬롯은 굵은 줄 기준이야" — 신청자 정보/공연 기본정보/개최 신뢰도가
  원래 "대관 정보" 카드 하나로 묶여 있어 슬롯 3개(대관 정보·예상 관객·자료 첨부) 중
  하나로만 움직였다. 이제 그 3개 굵은 줄 구획 자체를 독립 슬롯(applicantDetails·
  eventBasics·credibility)으로 뜯어 "예상 관객 및 사업규모"와 나란히 4개를 자유롭게
  순서 조정한다. 자료 첨부(attachments)는 이 STEP에서 빠지고 "안전관리 서약서" 탭
  맨 마지막으로 옮겼다(WizardShell.tsx의 safetyPledge 슬롯 참고) — 더 이상 STEP3
  슬롯 목록에 없다.

  기본 순서는 "대관자 정보 → 공연 정보 → 기타 → 예상 관객 및 사업규모"다. 관리자가
  아직 순서를 안 바꿨으면(ScreenTextContent.wizardSlotOrders["3"]가 비어 있으면) 이
  순서를 쓴다.
*/
export const STEP3_DEFAULT_SLOT_ORDER = ["applicantDetails", "eventBasics", "credibility", "audience"] as const;

export const STEP3_SLOT_LABELS: Record<string, string> = {
  applicantDetails: "대관자 정보",
  eventBasics: "공연 정보",
  credibility: "기타 (개최 신뢰도 및 이력 확인)",
  audience: "예상 관객 및 사업규모",
};
