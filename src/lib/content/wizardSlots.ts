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

  기본 순서는 "대관자 정보 → 공연 정보 → 기타 → 예상 관객 및 사업규모 → 대관 경합
  옵션"이다. 관리자가 아직 순서를 안 바꿨으면(ScreenTextContent.wizardSlotOrders["3"]가
  비어 있으면) 이 순서를 쓴다.

  [개정 2026-09-07] "대관 경합 시 대관료 옵션 추가 가능 범위를 별도 슬롯으로 분류하고
  탭 가장 밑으로 배치" — 예상 관객 및 사업규모(audience) 슬롯 안에서 티켓 매출 RS
  요율과 한 줄로 묶여 있던 걸 다섯 번째 슬롯(competitionOption)으로 떼어 맨 끝에 둔다.
*/
export const STEP3_DEFAULT_SLOT_ORDER = [
  "applicantDetails",
  "eventBasics",
  "credibility",
  "audience",
  "competitionOption",
] as const;

export const STEP3_SLOT_LABELS: Record<string, string> = {
  applicantDetails: "대관자 정보",
  eventBasics: "공연 정보",
  credibility: "기타 (개최 신뢰도 및 이력 확인)",
  audience: "예상 관객 및 사업규모",
  competitionOption: "대관 경합 옵션",
};

/*
  [개정 2026-09-07] "안전관리 서약서 뒤에 자료 첨부 탭 신규 생성" 요청으로 자료 첨부
  (attachments)를 안전관리 서약서 탭의 두 번째 슬롯에서 떼어 독립된 STEP 7로 승격했다
  (WizardShell.tsx step === 7 참고). 안전관리 서약서 탭에는 서약서 본문 하나만 남아
  더 이상 슬롯 순서를 조정할 대상이 없다 — STEP6 슬롯 순서 패턴 자체를 없앤다.
*/
