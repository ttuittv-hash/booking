import type { PerformanceInfo } from "./types";

// 신규 신청서는 이 한 줄이 기본으로 열려 있어야 한다(2026-08-26, "디폴트로 한줄은
// 열려있어야 하고") — 완전히 빈 채로 시작하면 "여기에 뭘 적어야 하는지" 힌트가 없다.
const EMPTY_PAST_PERFORMANCE_ROW = { eventName: "", venue: "", period: "", audience: "", role: "" };

// 주최·주관·기획을 역할별로 바로 입력할 수 있게 세 행을 기본으로 열어 둔다.
const DEFAULT_ORGANIZER_ROWS: PerformanceInfo["organizers"] = [
  { role: "HOST", name: "" },
  { role: "ORGANIZER", name: "" },
  { role: "PRODUCTION", name: "" },
];

// 아티스트 이력도 기본으로 한 행씩 열려 있어야 한다(2026-08-26).
const EMPTY_ARTIST_MAIN_HISTORY_ROW = { artistName: "", agency: "", debutYear: "", achievements: "" };
const EMPTY_ARTIST_RECENT_PERFORMANCE_ROW = {
  eventName: "",
  eventDate: "",
  venue: "",
  cityCountry: "",
  showCount: "",
  seatsPerShow: "",
  audience: "",
  sellRate: "",
};

const EMPTY_TICKET_TYPE_ROW = { label: "", price: 0, expectedSalesRate: 0 };

export const INITIAL_PERFORMANCE_INFO: PerformanceInfo = {
  applicantCompanyName: "",
  applicantCompanyType: null,
  applicantBusinessRegistrationNumber: "",
  applicantRepresentativeName: "",
  applicantContactName: "",
  applicantContactPhone: "",
  operationsResponsible: { name: "", title: "", phone: "" },
  safetyResponsible: { name: "", title: "", phone: "" },
  pastPerformances: [{ ...EMPTY_PAST_PERFORMANCE_ROW }],
  eventName: "",
  artist: "",
  organizer: "",
  organizers: DEFAULT_ORGANIZER_ROWS.map((row) => ({ ...row })),
  eventScale: "",
  eventTypes: [],
  ageRating: null,
  ageLimitDetail: "",
  stageTypes: [],
  stageTypeOtherDetail: "",
  seatingTypes: [],
  seatingTypeOtherDetail: "",
  retractableSeatUse: null,
  teardownCompletionTime: "",
  ticketOpenExpectedDate: "",
  artistMainHistory: [{ ...EMPTY_ARTIST_MAIN_HISTORY_ROW }],
  artistRecentPerformances: [{ ...EMPTY_ARTIST_RECENT_PERFORMANCE_ROW }],
  expectedPaidSalesRate: 0,
  expectedPaidSalesRateMidHall: 0,
  ticketTypes: [{ ...EMPTY_TICKET_TYPE_ROW }],
  ancillaryBusinessPlans: [],
  publicInterestItems: [],
  publicInterestDetails: {},
  castContractStatus: null,
  foreignArtistNotes: "",
  sensitiveInfoMaskingAcknowledged: false,
  safetyPledgeSigned: false,
};
