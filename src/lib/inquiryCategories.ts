/* ============================================================================
   1:1 문의 유형

   8/20 시점에 FAQ 에 없는 질문이 들어오는 유일한 창구다. 여기에 쌓이는 문의가 이후
   FAQ 문항의 원천이 되므로, 자유 서술 두 칸으로 받던 구조를 유형 분류가 있는 구조로 바꿨다.
   유형이 없으면 운영자가 어느 부서로 넘길지, 어느 신청 건에 관한 문의인지
   본문을 읽어야만 알 수 있다.
   ========================================================================= */

export type QuoteRequirement = "REQUIRED" | "OPTIONAL" | "NONE";

export interface InquiryCategory {
  id: string;
  label: string;
  /** 선택 시 아래에 붙는 보조 문구 */
  help: string;
  /** 관련 신청번호 필드의 필요도 */
  quote: QuoteRequirement;
  /**
   * 내 신청 내역이 열리는 9/1 이후에만 의미가 있는 유형.
   * 8/20~8/31 기간에는 선택지에서 감춘다.
   */
  openPhaseOnly?: boolean;
}

export const INQUIRY_CATEGORIES: InquiryCategory[] = [
  {
    id: "account",
    label: "계정·로그인",
    help: "회원가입 승인, 로그인, 소속 가입, 내 정보 변경에 관한 문의",
    quote: "NONE",
  },
  {
    id: "schedule",
    label: "대관 일정",
    help: "접수 기간, 희망 일정 가능 여부, 일정 변경에 관한 문의",
    quote: "OPTIONAL",
  },
  {
    id: "facility",
    label: "시설·장비",
    help: "무대 규격, 상부 리깅, 반입·하역, 전력, 보유 장비에 관한 문의",
    quote: "OPTIONAL",
  },
  {
    id: "rate",
    label: "대관료·정산",
    help: "요금 체계, 포함 항목과 추가 항목, 예상 대관료, 정산에 관한 문의",
    quote: "OPTIONAL",
  },
  {
    id: "review",
    label: "신청·심사 진행",
    help: "제출한 신청서의 심사 진행 상황, 보완 요청, 재신청에 관한 문의",
    quote: "REQUIRED",
    openPhaseOnly: true,
  },
  {
    id: "contract",
    label: "계약·서류",
    help: "계약서, 전자 날인, 세금계산서, 제출 서류 양식에 관한 문의",
    quote: "REQUIRED",
    openPhaseOnly: true,
  },
  {
    id: "etc",
    label: "기타",
    help: "위 유형에 해당하지 않는 문의",
    quote: "OPTIONAL",
  },
];

export function findInquiryCategory(id: string | null): InquiryCategory | undefined {
  return INQUIRY_CATEGORIES.find((c) => c.id === id);
}

export function inquiryCategoryLabel(id: string | null): string {
  return findInquiryCategory(id)?.label ?? "기타";
}

/** 화면에 노출할 유형 목록. 8/20 기간에는 신청 건 전제 유형을 감춘다. */
export function visibleInquiryCategories(rentalOpen: boolean): InquiryCategory[] {
  return INQUIRY_CATEGORIES.filter((c) => rentalOpen || !c.openPhaseOnly);
}
