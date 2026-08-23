"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { ARENA_MAX_AUDIENCE } from "@/lib/content/rateFacts";
import type { VenueRateContent } from "@/lib/content/pageContent";
import {
  findAddon,
  findPackage,
  isAddonAvailable,
} from "@/lib/pricing/rateTableUtils";
import type {
  AppUser,
  DateBlock,
  MarketingCooperation,
  QuoteSelection,
  RateTable,
  SafetyPledge,
  WeekDemand,
} from "@/lib/pricing/types";
import { DEFAULT_VENUE_ID } from "@/lib/pricing/types";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from "@/lib/quotesStore";
import { useToast } from "@/components/ui/Toast";
import { ArrowRight, btnClass } from "@/components/ui/kit";
import { StepNav } from "./StepNav";
import { StepHeading } from "./StepHeading";
import { SummaryPanel } from "./SummaryPanel";
import { VenuePicker } from "./VenuePicker";
import { Step1Calendar } from "./Step1Calendar";
import { MidHallCalendar } from "./MidHallCalendar";
import { StepConfigOptions } from "./StepConfigOptions";
import { Step5Estimate } from "./Step5Estimate";
import { StepPerformanceInfo, validatePerformanceInfoStep } from "./StepPerformanceInfo";
import { StepAudience, validateAudienceStep } from "./StepAudience";
import { StepPublicInterest } from "./StepPublicInterest";
import { StepMarketingCooperation, validateMarketingCooperationStep } from "./StepMarketingCooperation";
import { StepSafetyPledge, validateSafetyPledgeStep } from "./StepSafetyPledge";
import { Step6Submit } from "./Step6Submit";

const TOTAL_STEPS = 8;

const DEFAULT_SAFETY_PLEDGE: SafetyPledge = {
  safetyStructure: false,
  legalInspection: false,
  staffSafetyTraining: false,
  followVenueGuidance: false,
  audienceSafetyMeasures: false,
  insuranceCoverage: false,
  consequenceAcknowledged: false,
  signature: "",
};

const DEFAULT_MARKETING_COOPERATION: MarketingCooperation = {
  // 가장 흔한 3개 채널을 기본 행으로 미리 채워 둔다 — 신청자가 "+ 채널 추가"부터
  // 눌러야 하는 빈 상태로 시작하지 않게 한다. 그 외 채널은 직접 추가·삭제한다.
  channels: [
    { platform: "인스타그램", handle: "", followers: "" },
    { platform: "유튜브", handle: "", followers: "" },
    { platform: "X (트위터)", handle: "", followers: "" },
  ],
  seoulArenaPromotionConsent: null,
  // 빈 목록으로 시작하면 "+ 항목 추가"부터 눌러야 해서, 입력 행 1개를 비운 채로
  // 미리 열어 둔다(2026-08-22, "항목 1개가 디폴트로 열린 형태로" 요청).
  sponsorships: [{ brandName: "", campaignSummary: "" }],
  ticketSalesDataConsent: false,
  pollstarConsent: false,
  executionPlan: { targetDefinition: "", mediaMix: "", budget: "", timeline: "" },
};

// 중형공연장 단독(패키지 없음)일 때는 STEP 2(구성·옵션)의 내용이 달라질 뿐, 별도
// 단계로 나누지 않는다(2-25, 확정).
function isMidHallOnly(selection: Pick<QuoteSelection, "venueId" | "bookingMode">): boolean {
  return selection.venueId === "medium-hall" && selection.bookingMode === "SINGLE";
}

// 오늘 기준 다음 달을 기본값으로 — 과거 임의의 연도로 고정돼 있으면 신청자가 매번
// 달력을 여러 달 넘겨야 하고, 자신이 신청한 주차의 경합 현황도 바로 보이지 않는다.
function defaultWeek(): QuoteSelection["week"] {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1, weekOfMonth: 1 };
}


const INITIAL_SELECTION: QuoteSelection = {
  venueId: "arena",
  bookingMode: "SINGLE",
  packageId: null,
  week: defaultWeek(),
  excludedDays: [],
  extraDays: 0,
  dayTags: {},
  dayShowCounts: {},
  expectedAudience: 8000,
  secondaryAudience: 1500,
  midHallDays: {},
  midHallExtraSetupHours: 0,
  midHallExtraLoadOutHours: 0,
  expectedRevenue: 0,
  addons: [],
  performanceInfo: INITIAL_PERFORMANCE_INFO,
  midHallPerformanceInfo: null,
  safetyPledge: DEFAULT_SAFETY_PLEDGE,
  marketingCooperation: DEFAULT_MARKETING_COOPERATION,
};

function pruneUnavailableAddons(
  rateTable: RateTable,
  selection: QuoteSelection,
  packageId: number | null,
): QuoteSelection["addons"] {
  const pkg = findPackage(rateTable, packageId);
  if (!pkg) return [];
  return selection.addons.filter((selected) => {
    const addon = findAddon(rateTable, selected.addonId);
    return addon ? isAddonAvailable(addon, pkg) : false;
  });
}

export function WizardShell({
  rateTable,
  currentUser,
  weekDemand,
  dateBlocks,
  editingQuoteId,
  initialSelection,
  startFresh,
  applicantPrefill,
  liveHallRateContent,
}: {
  rateTable: RateTable;
  currentUser: AppUser | null;
  weekDemand: WeekDemand[];
  dateBlocks: DateBlock[];
  editingQuoteId?: string;
  initialSelection?: QuoteSelection;
  startFresh?: boolean;
  applicantPrefill?: {
    companyName: string;
    businessRegistrationNumber: string;
    contactName: string;
    contactPhone: string;
  };
  // 중형공연장 구성·옵션 탭의 Live Hall RATE 카드 — /admin/rates에서 관리자가
  // 편집하는 것과 같은 콘텐츠(RatesContent.liveHall)를 그대로 재사용한다
  // (2026-08-23, "어드민에서 중형공연장 패키지 내역에 이런 구조를 반영해줘").
  liveHallRateContent: VenueRateContent;
}) {
  const isEditing = !!editingQuoteId;
  const toast = useToast();
  const [step, setStep] = useState(1);
  // [화면 뼈대 2026-08-19, STEP 3-1 "신청자 정보"] 신규 신청서에 한해 회원정보로 미리
  // 채운다 — 기존 신청서 수정(initialSelection.performanceInfo 존재)이나 임시저장
  // 복원 시에는 이미 저장된 값을 그대로 쓰고 덮어쓰지 않는다.
  const initialPerformanceInfo: QuoteSelection["performanceInfo"] = applicantPrefill
    ? {
        ...INITIAL_PERFORMANCE_INFO,
        applicantCompanyName: applicantPrefill.companyName,
        applicantBusinessRegistrationNumber: applicantPrefill.businessRegistrationNumber,
        applicantContactName: applicantPrefill.contactName,
        applicantContactPhone: applicantPrefill.contactPhone,
      }
    : INITIAL_PERFORMANCE_INFO;
  // File은 JSON 직렬화가 안 되므로 selection과 분리해 별도 상태로 두고
  // localStorage 임시저장 대상에서도 제외한다 (새로고침 시 다시 선택 필요).
  // 신청자 정보(공연기획서 등) · 관객(객석배치도) · 공공성(연계 프로그램 계획서) · 안전관리
  // (안전관리계획서·출연자 계약서)는 각자 다른 서류라 슬롯을 분리한다 — 제출 시점에
  // 하나로 합쳐 업로드한다.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [audienceFiles, setAudienceFiles] = useState<File[]>([]);
  const [publicInterestFiles, setPublicInterestFiles] = useState<File[]>([]);
  // 안전관리계획서 · 출연자 계약서는 목업상 필수 단일 슬롯 2개다 — 다른 단계처럼 자유
  // 목록이 아니라 슬롯당 파일 1개(재선택 시 교체)로 둔다.
  const [safetyPlanFile, setSafetyPlanFile] = useState<File | null>(null);
  const [castContractFile, setCastContractFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<QuoteSelection>(
    initialSelection
      ? {
          ...INITIAL_SELECTION,
          ...initialSelection,
          venueId: initialSelection.venueId ?? DEFAULT_VENUE_ID,
          bookingMode: initialSelection.bookingMode ?? "SINGLE",
          secondaryAudience: initialSelection.secondaryAudience ?? INITIAL_SELECTION.secondaryAudience,
          dayShowCounts: initialSelection.dayShowCounts ?? {},
          midHallDays: initialSelection.midHallDays ?? {},
          performanceInfo: initialSelection.performanceInfo ?? initialPerformanceInfo,
        }
      : { ...INITIAL_SELECTION, performanceInfo: initialPerformanceInfo },
  );
  // 동시 대관 캘린더 탭 + 중형 캘린더 월 이동은 신청서 selection과 별개의 화면 상태다.
  const [venueTab, setVenueTab] = useState<"arena" | "medium-hall">("arena");
  const [midHallMonth, setMidHallMonth] = useState(() => {
    const w = defaultWeek();
    return { year: w.year, month: w.month };
  });
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  // 최종 제출(서명까지 완료)한 뒤에는 "수정하기"를 눌러야만 이전 단계로 돌아갈 수 있다
  // (2026-08-22, "수정버튼 누르기 전에는 그 전단계로 못넘어감"). 매 제출 성공마다 다시
  // 잠긴다 — editUnlocked로 이번 제출 이후 잠금이 풀렸는지만 추적한다.
  const [editUnlocked, setEditUnlocked] = useState(false);
  // 배너 문구("접수되었습니다" vs "수정되었습니다")는 이번 세션에서 이미 한 번 제출한
  // 적이 있었는지로 갈린다 — submittedId 자체는 재제출 후에도 계속 값이 있어 이걸로는
  // 구분할 수 없어 별도로 기억한다.
  const [lastActionWasEdit, setLastActionWasEdit] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // 위저드 진행 중(입력에 시간이 걸리는 동안) 세션이 만료될 수 있으므로,
  // 최초 렌더의 currentUser 값과 별개로 제출 시점에 401을 감지해 로그인 안내로 전환한다.
  const [sessionExpired, setSessionExpired] = useState(false);

  // 로그인 리다이렉트 등으로 페이지를 이탈했다가 돌아와도 입력값을 복원한다.
  // (기존 신청서 수정 중에는 새 신청서용 임시저장 내용을 불러오지 않는다.
  //  "대관 신청 시작하기"처럼 새 신청을 명시적으로 시작하는 진입점에서는
  //  이전에 남아있던 임시저장 내용을 무시하고 공간 선택부터 새로 시작한다.)
  useEffect(() => {
    if (isEditing) return;
    if (startFresh) {
      clearWizardDraft();
      return;
    }
    // localStorage는 리액트 외부 저장소이므로 마운트 시 1회만 복원한다.
    const draft = loadWizardDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection({
        ...INITIAL_SELECTION,
        ...draft.selection,
        dayTags: draft.selection.dayTags ?? {},
        dayShowCounts: draft.selection.dayShowCounts ?? {},
        venueId: draft.selection.venueId ?? null,
        bookingMode: draft.selection.bookingMode ?? "SINGLE",
        secondaryAudience: draft.selection.secondaryAudience ?? INITIAL_SELECTION.secondaryAudience,
        midHallDays: draft.selection.midHallDays ?? {},
        // 중첩 객체는 **초기값 위에 얹는다** — 스키마가 늘어난 뒤 복원된 초안에
        // 새 필드가 없으면 배열·객체 접근에서 렌더가 터진다.
        // 대관신청사명·사업자등록번호는 더 이상 이 화면에서 입력하지 않고 계정에서
        // 읽기 전용으로 보여주는 값이다 — 예전에 저장된 임시저장본에 빈 문자열로
        // 남아있으면 그 빈 값이 계정 값을 덮어써 화면에 "—"만 보이고 고칠 방법이
        // 없었다("기업정보가 있는데도 대관신청 위저드에서는 그냥 - 이렇게 나옴",
        // 2026-08-22) — 이 두 값만은 임시저장본을 무시하고 항상 계정 값을 쓴다.
        performanceInfo: {
          ...initialPerformanceInfo,
          ...(draft.selection.performanceInfo ?? {}),
          applicantCompanyName: initialPerformanceInfo.applicantCompanyName,
          applicantBusinessRegistrationNumber: initialPerformanceInfo.applicantBusinessRegistrationNumber,
        },
        // 동시 대관에서 "공간별로 다르게 입력"한 사본에도 같은 문제가 있어 똑같이 덮어쓴다.
        midHallPerformanceInfo: draft.selection.midHallPerformanceInfo
          ? {
              ...draft.selection.midHallPerformanceInfo,
              applicantCompanyName: initialPerformanceInfo.applicantCompanyName,
              applicantBusinessRegistrationNumber: initialPerformanceInfo.applicantBusinessRegistrationNumber,
            }
          : (draft.selection.midHallPerformanceInfo ?? null),
        safetyPledge: { ...DEFAULT_SAFETY_PLEDGE, ...(draft.selection.safetyPledge ?? {}) },
        marketingCooperation: {
          ...DEFAULT_MARKETING_COOPERATION,
          ...(draft.selection.marketingCooperation ?? {}),
          channels: Array.isArray(draft.selection.marketingCooperation?.channels)
            ? draft.selection.marketingCooperation.channels
            : DEFAULT_MARKETING_COOPERATION.channels,
          sponsorships: Array.isArray(draft.selection.marketingCooperation?.sponsorships)
            ? draft.selection.marketingCooperation.sponsorships
            : DEFAULT_MARKETING_COOPERATION.sponsorships,
          // 이 필드가 없던 시점(2026-08-23 이전)에 저장된 임시저장본을 열어도
          // 깨지지 않게 기본값과 병합한다.
          executionPlan: {
            ...DEFAULT_MARKETING_COOPERATION.executionPlan,
            ...(draft.selection.marketingCooperation?.executionPlan ?? {}),
          },
        },
        addons: Array.isArray(draft.selection.addons) ? draft.selection.addons : [],
        excludedDays: Array.isArray(draft.selection.excludedDays) ? draft.selection.excludedDays : [],
      });
      setStep(draft.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEditing || submittedId) return;
    saveWizardDraft({ step, selection });
  }, [step, selection, submittedId, isEditing]);

  const midHallOnly = isMidHallOnly(selection);
  // [개정 2026-08-20] 패키지는 이제 관객 규모로 자동 결정하지 않고, 구성·옵션 화면에서
  // 4개 카드 중 하나를 직접 클릭해 고른다 — selection.packageId가 그 선택을 그대로
  // 담는다(중형 단독일 때만 패키지 자체가 없으므로 null로 강제한다). 패키지가 바뀌면
  // 그 패키지에서 더 이상 선택할 수 없는 옵션도 함께 걸러서, 화면에는 안 보이는데
  // 견적에는 남는 일이 없게 한다.
  const effectivePackageId = midHallOnly ? null : selection.packageId;
  const needsPackage = !midHallOnly;
  const effectiveAddons = useMemo(
    () => pruneUnavailableAddons(rateTable, selection, effectivePackageId),
    [rateTable, selection, effectivePackageId],
  );
  const resolvedSelection: QuoteSelection = useMemo(
    () => ({ ...selection, packageId: effectivePackageId, addons: effectiveAddons }),
    [selection, effectivePackageId, effectiveAddons],
  );

  const quote = useMemo(() => calculateQuote(resolvedSelection, rateTable), [resolvedSelection, rateTable]);
  const hasMidHallSelection = Object.keys(selection.midHallDays).length > 0;
  // [개정 2026-08-22] STEP 1(공간/일정) 요약 패널에는 항목을 보여주지 않는다. 아레나는
  // 패키지가 없으면 calculateQuote가 애초에 라인아이템을 만들지 않아 자연히 비어 있는데,
  // 중형(DAILY)은 패키지 없이 캘린더 선택(selection.midHallDays)만으로 바로 금액이 잡혀서
  // 같은 화면에서 공간에 따라 있다/없다가 갈렸다. STEP 2(구성·옵션)에 들어가기 전까지는
  // 두 공간 모두 동일하게 "공간과 일정을 선택하면 예상 금액이 표시됩니다" 자리표시자만
  // 보이게 맞춘다 — 실제 계산(quote)은 그대로 두고 요약 패널에 넘기는 표시용 값만 비운다.
  const summaryQuote = step === 1 ? { ...quote, lineItems: [], subtotal: 0, vat: 0, total: 0 } : quote;

  // [개정 2026-08-20, 재재개정] "공간 선택"과 "일정 선택"은 다시 하나의 스텝(탭)으로
  // 합치되, 화면 안에서는 "공간 선택" 슬롯과 "일정 선택" 슬롯 두 섹션으로 나눠 보여준다 —
  // 공간 슬롯에서 이용 시설을 고르면 그 아래 일정 슬롯(아레나 캘린더 / 중형 캘린더 /
  // 동시 대관 탭)이 그 선택에 따라 달라진다. 관객 규모는 여전히 구성·옵션에서 입력하고,
  // 패키지도 구성·옵션에서 직접 선택해야 하므로 그전까지는 STEP 3(신청자 정보) 이후로
  // 넘어갈 수 없다.
  // [개정 2026-08-22] "신청자 정보"·"규모"의 필수값을 채우지 않으면 그 다음 단계로도
  // 못 넘어가게 한다("다음" 버튼뿐 아니라 스텝 탭을 직접 눌러 건너뛰는 것도 막는다) —
  // 자료 첨부만 선택이고 나머지는 필수라는 요청(2026-08-22)의 연장.
  // [개정 2026-08-23] "신청자 정보"·"규모" 탭을 STEP 3 하나로 합쳤다 — 두 화면의
  // 필수값을 한 게이트에서 같이 검사한다.
  const step3Blocked =
    validatePerformanceInfoStep(selection.performanceInfo, selection.midHallPerformanceInfo ? "아레나" : undefined) ??
    (selection.midHallPerformanceInfo && validatePerformanceInfoStep(selection.midHallPerformanceInfo, "중형공연장")) ??
    validateAudienceStep(selection.performanceInfo, selection.midHallPerformanceInfo ? "아레나" : undefined) ??
    (selection.midHallPerformanceInfo && validateAudienceStep(selection.midHallPerformanceInfo, "중형공연장"));
  // 홍보 및 서비스 노출 동의(STEP 5)·안전관리 서약(STEP 6)도 필수라 그 다음 단계로
  // 못 넘어가게 막는다(2026-08-22, "무조건 필수"). STEP 4(공공/공익 참여 여부)는
  // 선택 항목이라 별도 게이트가 없다 — 통과 여부와 무관하게 STEP 5까지는 열린다.
  const step5Blocked = validateMarketingCooperationStep(
    selection.marketingCooperation ?? DEFAULT_MARKETING_COOPERATION,
  );
  const step6Blocked = validateSafetyPledgeStep(selection.safetyPledge ?? DEFAULT_SAFETY_PLEDGE, {
    safetyPlanFile,
    castContractFile,
  });
  const maxUnlockedStep = !selection.venueId
    ? 1
    : midHallOnly && !hasMidHallSelection
      ? 1
      : needsPackage && !selection.packageId
        ? 2
        : step3Blocked
          ? 3
          : step5Blocked
            ? 5
            : step6Blocked
              ? 6
              : TOTAL_STEPS;
  // 패키지 선택 전에도 기본 공연일수를 보여줘야 하므로, 모든 패키지가 공유하는 기본값(2일)을 임시로 사용한다.
  const effectivePkg = findPackage(rateTable, effectivePackageId);
  const defaultPerformanceDays = effectivePkg?.defaultPerformanceDays ?? 2;
  // 최종 제출까지 마치면 "수정하기"를 누르기 전까지 다른 단계로 이동할 수 없다.
  const submissionLocked = !!submittedId && !editUnlocked;

  function goTo(target: number) {
    if (target < 1 || target > TOTAL_STEPS) return;
    if (target > maxUnlockedStep) return;
    if (submissionLocked && target !== step) return;
    setStep(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestEdit() {
    setEditUnlocked(true);
    setStep(1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // [화면 뼈대 2026-08-18, 기능정의 2-5/2-13] 이용 시설을 바꾸면 요금 체계가 달라 이월할
  // 수 없으므로 STEP 1-2 · 2의 입력값을 전부 초기화한다(패키지 · 일정 · 옵션 모두).
  function selectVenue(id: string, bookingMode: QuoteSelection["bookingMode"]) {
    setSelection((prev) =>
      prev.venueId === id && prev.bookingMode === bookingMode
        ? prev
        : {
            ...prev,
            venueId: id,
            bookingMode,
            packageId: null,
            addons: [],
            midHallDays: {},
            midHallExtraSetupHours: 0,
            midHallExtraLoadOutHours: 0,
          },
    );
    setVenueTab(bookingMode === "SIMULTANEOUS" ? "arena" : id === "medium-hall" ? "medium-hall" : "arena");
    setSubmittedId(null);
  }

  // [개정 2026-08-20] 구성·옵션 화면에서 관객 규모 입력창을 없애고 패키지 카드만 남겼다 —
  // 청소비 등에 쓰는 expectedAudience는 이제 고른 패키지의 관객 등급에서 대표값을 끌어와
  // 자동으로 채운다(패키지 4처럼 상한이 없는 등급은 아레나 최대 수용인원으로 갈음한다 —
  // 숫자는 `ARENA_MAX_AUDIENCE` 한 곳에서만 정한다).
  function selectPackage(packageId: number) {
    const pkg = findPackage(rateTable, packageId);
    setSelection((prev) =>
      prev.packageId === packageId
        ? prev
        : {
            ...prev,
            packageId,
            expectedAudience: pkg
              ? Math.min(pkg.audienceTier.max, ARENA_MAX_AUDIENCE)
              : prev.expectedAudience,
          },
    );
    setSubmittedId(null);
  }

  // "Custom" 카드는 rateTable.packages에 없는 자리표시자라 selectPackage로는 고를 수
  // 없다 — 그런데 이미 실제 패키지를 고른 상태에서 Custom을 누르면 packageId가 그대로
  // 남아 카드 두 개가 동시에 선택된 것처럼 보였다(2026-08-22 리포트). Custom을 누르면
  // 기존 패키지 선택을 지운다.
  function clearPackage() {
    setSelection((prev) => (prev.packageId === null ? prev : { ...prev, packageId: null }));
    setSubmittedId(null);
  }

  function setAddonQuantity(addonId: string, quantity: number) {
    setSelection((prev) => {
      const rest = prev.addons.filter((a) => a.addonId !== addonId);
      return {
        ...prev,
        addons: quantity > 0 ? [...rest, { addonId, requestedQuantity: quantity }] : rest,
      };
    });
    setSubmittedId(null);
  }

  async function uploadPendingFiles(quoteId: string) {
    const allFiles = [
      ...pendingFiles,
      ...audienceFiles,
      ...publicInterestFiles,
      ...(safetyPlanFile ? [safetyPlanFile] : []),
      ...(castContractFile ? [castContractFile] : []),
    ];
    if (allFiles.length === 0) return;
    const failed: string[] = [];
    for (const file of allFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/quotes/${quoteId}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) failed.push(file.name);
      } catch {
        failed.push(file.name);
      }
    }
    if (failed.length > 0) {
      setAttachmentError(
        `다음 파일은 업로드에 실패했습니다: ${failed.join(", ")}. 신청 내역 상세에서 다시 첨부해주세요.`,
      );
    } else {
      setPendingFiles([]);
      setAudienceFiles([]);
      setPublicInterestFiles([]);
    }
  }

  async function submit() {
    if (!currentUser) return;
    // 이번 세션에서 이미 한 번 제출해 신청서가 생성돼 있으면("수정하기"로 되돌아와
    // 다시 제출하는 경우 포함), 새로 만들지 않고 같은 신청서를 갱신한다(PUT) — 그래야
    // 접수번호가 그대로 유지된다.
    const isUpdate = isEditing || !!submittedId;
    const targetId = editingQuoteId ?? submittedId;
    setSubmitting(true);
    setSubmitError(null);
    setAttachmentError(null);
    try {
      const res = await fetch(isUpdate ? `/api/quotes/${targetId}` : "/api/quotes", {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: resolvedSelection }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setSessionExpired(true);
          return;
        }
        setSubmitError(data.error || (isUpdate ? "신청서 수정에 실패했습니다." : "신청서 제출에 실패했습니다."));
        return;
      }
      setSubmittedId(data.quote.id);
      setLastActionWasEdit(isUpdate);
      setEditUnlocked(false);
      await uploadPendingFiles(data.quote.id);
      if (!isEditing) clearWizardDraft();
    } catch {
      setSubmitError("네트워크 오류로 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const addonQuantities = Object.fromEntries(
    selection.addons.map((a) => [a.addonId, a.requestedQuantity]),
  );

  /*
    폼 하단 버튼은 **양 끝**에 둔다 — 이전(좌·아웃라인) / 다음(우·검정 채움), 높이 48.
    버튼 줄은 **화면당 하나**다. 예전엔 스크롤을 줄이려고 상단에도 옅은 알약 버튼을 뒀는데,
    같은 동작이 두 모양으로 보여 어느 쪽이 진짜 진행인지 헷갈렸다.
    다음 버튼이 없는 마지막 단계에서도 이전 버튼이 왼쪽에 그대로 남는다.
  */
  const navButtons = (
    <div className="mt-10 flex items-center justify-between gap-3 border-t border-border/25 pt-6">
      <button
        type="button"
        disabled={step === 1 || submissionLocked}
        onClick={() => goTo(step - 1)}
        className={btnClass("secondary", "lg")}
      >
        <ArrowRight className="rotate-180" />
        이전
      </button>
      {step < TOTAL_STEPS && (
        <button
          type="button"
          onClick={() => {
            // 버튼을 잠그지 않는다 — 눌러도 반응이 없으면 고장으로 보인다(고객 신고 패턴).
            if (step === 1 && !selection.venueId) {
              toast.error("먼저 대관하실 시설을 선택해 주세요.");
              return;
            }
            if (step === 1 && midHallOnly && !hasMidHallSelection) {
              toast.error("대관 일정을 선택해 주세요.");
              return;
            }
            if (step === 2 && needsPackage && !selection.packageId) {
              toast.error("패키지를 선택해 주세요.");
              return;
            }
            if (step === 3 && step3Blocked) {
              toast.error(step3Blocked);
              return;
            }
            if (step === 5 && step5Blocked) {
              toast.error(step5Blocked);
              return;
            }
            if (step === 6 && step6Blocked) {
              toast.error(step6Blocked);
              return;
            }
            goTo(step + 1);
          }}
          className={btnClass("primary", "lg")}
        >
          다음
          <ArrowRight />
        </button>
      )}
    </div>
  );

  return (
    // 좌: 스텝 콘텐츠 / 우: sticky 요약 패널.
    // 콘텐츠 트랙은 minmax(0,1fr) + min-w-0 로 묶어 스텝 전환 시 폭이 변하지 않게 한다.
    <div className="container-site grid w-full grid-cols-1 gap-10 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
      <div className="min-w-0">
        <StepNav step={step} maxUnlockedStep={maxUnlockedStep} locked={submissionLocked} onJump={goTo} />

        {step === 1 && (
          <section>
            <StepHeading title="공간 선택" lead="아레나, 중형공연장, 동시 대관 중 이용할 공간을 선택하세요." />
            <div className="mt-8">
              <VenuePicker venueId={selection.venueId} bookingMode={selection.bookingMode} onSelectVenue={selectVenue} />
            </div>

            {selection.venueId && (
              /* 한 단계 안의 두 번째 블록 — 박스로 싸지 않고 굵은 헤어라인으로만 나눈다
                 (신청자 정보의 "자료 첨부"와 같은 규칙) */
              <div className="mt-10 border-t-2 border-foreground pt-5">
                <h3 className="type-kr-heading text-h6-m">일정 선택</h3>
                {selection.bookingMode === "SIMULTANEOUS" && (
                  <p className="mt-1.5 text-s text-muted">
                    동시 대관에서는 두 공간의 일정을 탭으로 나눠 각각 선택합니다.
                  </p>
                )}
                {/* [개정 2026-08-21] 아레나만/중형만/동시 대관 세 경우 모두 같은 탭 구조를
                    쓴다 — 선택하지 않은 공간의 탭은 감춰지지 않고 비활성(disabled)으로만
                    남아, 캘린더 슬롯 디자인 자체가 공간 선택에 따라 달라 보이지 않게 한다. */}
                <div className="mt-5 flex gap-1 border-b border-border">
                  {(["arena", "medium-hall"] as const).map((tab) => {
                    const enabled = selection.bookingMode === "SIMULTANEOUS" || selection.venueId === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        disabled={!enabled}
                        onClick={() => enabled && setVenueTab(tab)}
                        className={[
                          "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
                          venueTab === tab && enabled
                            ? "border-foreground text-foreground"
                            : enabled
                              ? "border-transparent text-muted hover:text-foreground"
                              : "cursor-not-allowed border-transparent text-muted/40",
                        ].join(" ")}
                      >
                        {tab === "arena" ? "아레나 일정" : "중형 일정"}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6">
                  {venueTab === "arena" ? (
                    <Step1Calendar
                      week={selection.week}
                      excludedDays={selection.excludedDays}
                      extraDays={selection.extraDays}
                      dayTags={selection.dayTags}
                      dayShowCounts={selection.dayShowCounts}
                      defaultPerformanceDays={defaultPerformanceDays}
                      weekDemand={weekDemand}
                      dateBlocks={dateBlocks}
                      onChangeWeek={(week) => setSelection((prev) => ({ ...prev, week }))}
                      onChangeExcludedDays={(excludedDays) =>
                        setSelection((prev) => ({ ...prev, excludedDays }))
                      }
                      onChangeExtraDays={(extraDays) =>
                        setSelection((prev) => ({ ...prev, extraDays }))
                      }
                      onChangeDayTags={(dayTags) => setSelection((prev) => ({ ...prev, dayTags }))}
                      onChangeDayShowCounts={(dayShowCounts) =>
                        setSelection((prev) => ({ ...prev, dayShowCounts }))
                      }
                    />
                  ) : (
                    <MidHallCalendar
                      year={midHallMonth.year}
                      month={midHallMonth.month}
                      days={selection.midHallDays}
                      extraSetupHours={selection.midHallExtraSetupHours}
                      extraLoadOutHours={selection.midHallExtraLoadOutHours}
                      dateBlocks={dateBlocks}
                      rateConfig={rateTable.midHall}
                      onChangeMonth={(year, month) => setMidHallMonth({ year, month })}
                      onChangeDays={(midHallDays) => setSelection((prev) => ({ ...prev, midHallDays }))}
                      onChangeExtraSetupHours={(value) =>
                        setSelection((prev) => ({ ...prev, midHallExtraSetupHours: value }))
                      }
                      onChangeExtraLoadOutHours={(value) =>
                        setSelection((prev) => ({ ...prev, midHallExtraLoadOutHours: value }))
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </section>
        )}
        {step === 2 && (
          <StepConfigOptions
            rateTable={rateTable}
            liveHallRateContent={liveHallRateContent}
            selection={resolvedSelection}
            defaultPerformanceDays={defaultPerformanceDays}
            addonQuantities={addonQuantities}
            expectedRevenue={selection.expectedRevenue ?? 0}
            onChangeQuantity={setAddonQuantity}
            onChangeRevenue={(value) =>
              setSelection((prev) => ({ ...prev, expectedRevenue: value }))
            }
            onSelectPackage={selectPackage}
            onClearPackage={clearPackage}
            onChangeMidHallExtraSetupHours={(value) =>
              setSelection((prev) => ({ ...prev, midHallExtraSetupHours: value }))
            }
            onChangeMidHallExtraLoadOutHours={(value) =>
              setSelection((prev) => ({ ...prev, midHallExtraLoadOutHours: value }))
            }
          />
        )}
        {step === 3 && (
          <>
            <StepPerformanceInfo
              info={selection.performanceInfo}
              onChange={(performanceInfo) => setSelection((prev) => ({ ...prev, performanceInfo }))}
              midHallInfo={selection.midHallPerformanceInfo}
              onChangeMidHallInfo={(midHallPerformanceInfo) =>
                setSelection((prev) => ({ ...prev, midHallPerformanceInfo }))
              }
              selection={resolvedSelection}
              files={pendingFiles}
              onFilesChange={setPendingFiles}
            />
            {/* [2026-08-23] "신청자 정보 및 규모" — 두 탭을 하나로 합쳤다("신청자 정보
                탭을 신청자 정보 및 규모로 변경하고, 규모 탭 내역을 합쳐"). 규모(StepAudience)
                는 자기 제목을 생략하고 신청자 정보 아래로 이어 붙는다. */}
            <StepAudience
              info={selection.performanceInfo}
              onChange={(performanceInfo) => setSelection((prev) => ({ ...prev, performanceInfo }))}
              midHallInfo={selection.midHallPerformanceInfo}
              onChangeMidHallInfo={(midHallPerformanceInfo) =>
                setSelection((prev) => ({ ...prev, midHallPerformanceInfo }))
              }
              selection={resolvedSelection}
              files={audienceFiles}
              onFilesChange={setAudienceFiles}
              showHeading={false}
            />
          </>
        )}
        {step === 4 && (
          <StepPublicInterest
            info={selection.performanceInfo}
            onChange={(performanceInfo) => setSelection((prev) => ({ ...prev, performanceInfo }))}
            selection={resolvedSelection}
            midHallInfo={selection.midHallPerformanceInfo}
            onChangeMidHallInfo={(midHallPerformanceInfo) =>
              setSelection((prev) => ({ ...prev, midHallPerformanceInfo }))
            }
            files={publicInterestFiles}
            onFilesChange={setPublicInterestFiles}
          />
        )}
        {step === 5 && (
          <StepMarketingCooperation
            info={selection.marketingCooperation ?? DEFAULT_MARKETING_COOPERATION}
            onChange={(marketingCooperation) => setSelection((prev) => ({ ...prev, marketingCooperation }))}
          />
        )}
        {step === 6 && (
          <StepSafetyPledge
            pledge={selection.safetyPledge ?? DEFAULT_SAFETY_PLEDGE}
            onChange={(safetyPledge) => setSelection((prev) => ({ ...prev, safetyPledge }))}
            safetyPlanFile={safetyPlanFile}
            onSafetyPlanFileChange={setSafetyPlanFile}
            castContractFile={castContractFile}
            onCastContractFileChange={setCastContractFile}
          />
        )}
        {step === 7 && <Step5Estimate rateTable={rateTable} quote={quote} selection={resolvedSelection} />}
        {step === 8 && (
          <Step6Submit
            rateTable={rateTable}
            quote={quote}
            selection={resolvedSelection}
            isLoggedIn={!!currentUser && !sessionExpired}
            isEditing={isEditing || !!submittedId}
            confirmationVisible={submissionLocked}
            justEdited={lastActionWasEdit}
            submitting={submitting}
            submittedId={submittedId}
            error={submitError}
            attachmentError={attachmentError}
            fileCount={
              pendingFiles.length +
              audienceFiles.length +
              publicInterestFiles.length +
              (safetyPlanFile ? 1 : 0) +
              (castContractFile ? 1 : 0)
            }
            onSubmit={submit}
            onRequestEdit={requestEdit}
          />
        )}

        <div className="mt-6">{navButtons}</div>
      </div>

      <SummaryPanel
        quote={summaryQuote}
        /*
          요약 패널은 **실시간 견적 요약**이다 — 대관료·항목·합계를 함께 보여준다.
          한동안 STEP 1·2 에서 금액을 감췄는데, 신청자가 구성을 고르는 동안 값이 얼마나
          움직이는지 볼 수 없어 되돌렸다. "예상 금액 · 확정 아님" 고지를 함께 둔다.
          단, STEP 1(공간/일정 선택)만은 계속 비워 둔다 — summaryQuote 참고.
        */
      />
    </div>
  );
}
