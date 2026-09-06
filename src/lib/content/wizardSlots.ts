/*
  [신규 2026-09-06] "위저드 모든 슬롯을 관리자가 위/아래로 조정 가능하게" 요청 —
  STEP 3(기본 정보)를 이루는 슬롯의 key·기본 순서·표시 라벨. WizardShell.tsx(위저드
  렌더링)와 PageContentForms.tsx(어드민 순서 편집 UI)가 둘 다 이 값을 쓰므로, 위저드
  전체를 끌고 오지 않도록 의존성 없는 별도 파일에 둔다.

  기본 순서는 "대관 정보 → 예상 관객 및 사업규모 → 자료 첨부"다(예상 관객을 대관
  정보 바로 다음, 두 번째로 둔 순서 — 2026-09-06 확정). 관리자가 아직 순서를
  안 바꿨으면(ScreenTextContent.wizardSlotOrders["3"]가 비어 있으면) 이 순서를 쓴다.
*/
export const STEP3_DEFAULT_SLOT_ORDER = ["applicantInfo", "audience", "attachments"] as const;

export const STEP3_SLOT_LABELS: Record<string, string> = {
  applicantInfo: "대관 정보 (신청자 정보 · 공연 기본정보 · 개최 신뢰도)",
  audience: "예상 관객 및 사업규모",
  attachments: "자료 첨부",
};
