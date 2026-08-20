"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  defaultDayTags,
  effectiveDayTag,
  findAddon,
  findPackage,
  isAddonAvailable,
  recommendPackage,
} from "@/lib/pricing/rateTableUtils";
import type { AppUser, DateBlock, QuoteSelection, RateTable, WeekDemand } from "@/lib/pricing/types";
import { DEFAULT_VENUE_ID, MEDIA_TIER_LABEL } from "@/lib/pricing/types";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from "@/lib/quotesStore";
import { StepNav } from "./StepNav";
import { SummaryPanel, type SummaryPreviewRow } from "./SummaryPanel";
import { VenuePicker } from "./VenuePicker";
import { Step1Calendar } from "./Step1Calendar";
import { MidHallCalendar } from "./MidHallCalendar";
import { StepConfigOptions } from "./StepConfigOptions";
import { Step5Estimate } from "./Step5Estimate";
import { StepPerformanceInfo } from "./StepPerformanceInfo";
import { StepAudience } from "./StepAudience";
import { StepPublicInterest } from "./StepPublicInterest";
import { Step6Submit } from "./Step6Submit";

const TOTAL_STEPS = 8;

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
  venueId: null,
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
}) {
  const isEditing = !!editingQuoteId;
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
  // 신청자 정보(공연기획서 등) · 관객(객석배치도) · 공공성(연계 프로그램 계획서)은
  // 각자 다른 서류라 슬롯을 분리한다 — 제출 시점에 하나로 합쳐 업로드한다.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [audienceFiles, setAudienceFiles] = useState<File[]>([]);
  const [publicInterestFiles, setPublicInterestFiles] = useState<File[]>([]);
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
        performanceInfo: draft.selection.performanceInfo ?? initialPerformanceInfo,
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
  // [화면 뼈대 2026-08-18, 기능정의 2-16] 패키지는 카드를 눌러 고르는 게 아니라 관객
  // 규모로 자동 결정된다. state에 동기화해두지 않고 렌더마다 파생값으로 계산한다 —
  // effect에서 setState로 되먹임하면 렌더가 한 번 더 걸리고 리액트 권장 패턴에도
  // 어긋난다(react-hooks/set-state-in-effect). 패키지가 바뀌면 그 패키지에서 더 이상
  // 선택할 수 없는 옵션도 함께 걸러서, 화면에는 안 보이는데 견적에는 남는 일이 없게 한다.
  const effectivePackageId = midHallOnly
    ? null
    : recommendPackage(rateTable, selection.expectedAudience, "arena");
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

  // [개정 2026-08-20] "공간 선택"(이용 시설)과 "일정 선택"(캘린더)을 다시 별개 슬롯으로
  // 나눴다 — 공간을 먼저 고르면 STEP 2의 하위 일정 슬롯(아레나 캘린더 / 중형 캘린더 /
  // 동시 대관 탭)이 그 선택에 따라 달라진다. 관객 규모는 여전히 구성·옵션에서 입력한다.
  const maxUnlockedStep = !selection.venueId ? 1 : midHallOnly && !hasMidHallSelection ? 2 : TOTAL_STEPS;
  // 패키지 선택 전에도 기본 공연일수를 보여줘야 하므로, 모든 패키지가 공유하는 기본값(2일)을 임시로 사용한다.
  const effectivePkg = findPackage(rateTable, effectivePackageId);
  const defaultPerformanceDays = effectivePkg?.defaultPerformanceDays ?? 2;

  const venuePreviewRows: SummaryPreviewRow[] = [
    {
      label: "이용 시설",
      value: !selection.venueId
        ? "선택 전"
        : selection.bookingMode === "SIMULTANEOUS"
          ? "아레나 + 중형 (동시)"
          : selection.venueId === "medium-hall"
            ? "중형공연장"
            : "메인 아레나",
    },
    { label: "대관 일정", value: "다음 화면에서 선택" },
    { label: "관객 규모", value: "구성 · 옵션에서 입력" },
  ];

  const configArenaDates = resolveSelectedDates(selection);
  const configShowCount = (() => {
    if (configArenaDates.length === 0) return 0;
    const defaults = defaultDayTags(configArenaDates, defaultPerformanceDays);
    return configArenaDates.reduce((sum, d) => {
      const tag = effectiveDayTag(d, selection.dayTags, defaults);
      return tag === "PERFORMANCE" ? sum + (selection.dayShowCounts[d] ?? 1) : sum;
    }, 0);
  })();
  const midHallDayCount = Object.keys(selection.midHallDays).length;
  const schedulePreviewRows: SummaryPreviewRow[] = [
    ...(midHallOnly
      ? [{ label: "대관 일정", value: midHallDayCount > 0 ? `${midHallDayCount}일 선택` : "미선택" }]
      : [
          {
            label: "아레나 일정",
            value:
              configArenaDates.length > 0
                ? `${selection.week.year}년 ${selection.week.month}월 ${selection.week.weekOfMonth}주차 · ${configArenaDates.length}일`
                : "미선택",
          },
        ]),
    ...(selection.bookingMode === "SIMULTANEOUS"
      ? [{ label: "중형 일정", value: midHallDayCount > 0 ? `${midHallDayCount}일 선택` : "미선택" }]
      : []),
    { label: "관객 규모", value: "다음 화면(구성 · 옵션)에서 입력" },
  ];

  // [화면 뼈대 2026-08-19, 화면시나리오 STEP 2 "선택 내용"] 구성·옵션 화면에서도 견적
  // lineItems가 아니라 지금까지 정한 값(패키지·대관 주차·공연 횟수·부대시설·홍보)을
  // 큐레이션해 보여준다 — "Package N" 대신 관객 규모 등급으로 표기한다(패키지 번호 비노출
  // 확정 사항, 2026-08-18).
  const configOptionCount = selection.addons.filter(
    (a) => a.addonId !== "cleaning" && a.requestedQuantity > 0,
  ).length;
  const configPreviewRows: SummaryPreviewRow[] = [
    {
      label: "구성",
      value: effectivePkg ? `${effectivePkg.audienceTier.label} · 자동 결정` : "패키지 없음",
    },
    {
      label: "대관 주차",
      value:
        configArenaDates.length > 0
          ? `${selection.week.year}년 ${selection.week.month}월 ${selection.week.weekOfMonth}주차 · ${configArenaDates.length}일`
          : "미선택",
    },
    { label: "공연", value: configShowCount > 0 ? `총 ${configShowCount}회` : "미선택" },
    { label: "부대시설", value: `${configOptionCount}건 선택` },
    {
      label: "홍보",
      value: effectivePkg?.mediaTier ? MEDIA_TIER_LABEL[effectivePkg.mediaTier] : "미포함",
    },
  ];
  function goTo(target: number) {
    if (target < 1 || target > TOTAL_STEPS) return;
    if (target > maxUnlockedStep) return;
    setStep(target);
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
    setVenueTab("arena");
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
    const allFiles = [...pendingFiles, ...audienceFiles, ...publicInterestFiles];
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
    setSubmitting(true);
    setSubmitError(null);
    setAttachmentError(null);
    try {
      const res = await fetch(isEditing ? `/api/quotes/${editingQuoteId}` : "/api/quotes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: resolvedSelection }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setSessionExpired(true);
          return;
        }
        setSubmitError(data.error || (isEditing ? "신청서 수정에 실패했습니다." : "신청서 제출에 실패했습니다."));
        return;
      }
      setSubmittedId(data.quote.id);
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

  const navButtons = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        disabled={step === 1}
        onClick={() => goTo(step - 1)}
        className="rounded-sm border border-border px-5 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← 이전
      </button>
      {step < TOTAL_STEPS && (
        <button
          type="button"
          disabled={(step === 1 && !selection.venueId) || (step === 2 && midHallOnly && !hasMidHallSelection)}
          onClick={() => goTo(step + 1)}
          className="rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음 →
        </button>
      )}
    </div>
  );

  // 하단 버튼은 이 화면의 주된 진행 액션(강조된 파랑 버튼)이고, 상단은 스크롤을 줄이기
  // 위한 보조 이동 수단이라 같은 굵기로 두면 바로 아래 섹션 박스와 부딪혀 무거워 보인다
  // — 옅은 pill 버튼으로 톤을 낮추고 아래 여백을 넉넉히 둔다(2026-08-19).
  const topNavButtons = (
    <div className="flex items-center justify-between">
      <button
        type="button"
        disabled={step === 1}
        onClick={() => goTo(step - 1)}
        className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-panel hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        ← 이전
      </button>
      {step < TOTAL_STEPS && (
        <button
          type="button"
          disabled={(step === 1 && !selection.venueId) || (step === 2 && midHallOnly && !hasMidHallSelection)}
          onClick={() => goTo(step + 1)}
          className="rounded-full border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          다음 →
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <StepNav step={step} maxUnlockedStep={maxUnlockedStep} onJump={goTo} />

        <div className="mt-4 mb-6">{topNavButtons}</div>

        {step === 1 && (
          <section className="rounded border border-border bg-background p-5 sm:p-7">
            <h2 className="text-[19px] font-semibold">공간 선택</h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              먼저 이용 시설을 고르면 다음 화면에서 그 시설의 일정을 이어서 선택할 수 있습니다.
            </p>
            <div className="mt-5">
              <VenuePicker venueId={selection.venueId} bookingMode={selection.bookingMode} onSelectVenue={selectVenue} />
            </div>
          </section>
        )}
        {step === 2 && selection.bookingMode === "SIMULTANEOUS" && (
          <section className="rounded border border-border bg-background p-5 sm:p-7">
            <h2 className="text-[19px] font-semibold">일정 선택</h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              동시 대관에서는 두 공간의 일정을 탭으로 나눠 각각 선택합니다.
            </p>
            <div className="mt-5 flex gap-1 border-b border-border">
              {(["arena", "medium-hall"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setVenueTab(tab)}
                  className={[
                    "border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors",
                    venueTab === tab
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {tab === "arena" ? "아레나 일정" : "중형 일정"}
                </button>
              ))}
            </div>
            <div className="mt-6">
              {venueTab === "arena" ? (
                <Step1Calendar
                  heading="아레나 일정"
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
          </section>
        )}
        {step === 2 && midHallOnly && (
          <section className="rounded border border-border bg-background p-5 sm:p-7">
            <h2 className="text-[19px] font-semibold">일정 선택</h2>
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
          </section>
        )}
        {step === 2 && selection.bookingMode === "SINGLE" && selection.venueId === "arena" && (
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
        )}
        {step === 3 && (
          <StepConfigOptions
            rateTable={rateTable}
            selection={resolvedSelection}
            defaultPerformanceDays={defaultPerformanceDays}
            addonQuantities={addonQuantities}
            expectedRevenue={selection.expectedRevenue ?? 0}
            onChangeQuantity={setAddonQuantity}
            onChangeRevenue={(value) =>
              setSelection((prev) => ({ ...prev, expectedRevenue: value }))
            }
            onChangeAudience={(value) => setSelection((prev) => ({ ...prev, expectedAudience: value }))}
            onChangeSecondaryAudience={(value) =>
              setSelection((prev) => ({ ...prev, secondaryAudience: value }))
            }
          />
        )}
        {step === 4 && <Step5Estimate rateTable={rateTable} quote={quote} selection={resolvedSelection} />}
        {step === 5 && (
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
        )}
        {step === 6 && (
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
          />
        )}
        {step === 7 && (
          <StepPublicInterest
            selection={resolvedSelection}
            midHallInfo={selection.midHallPerformanceInfo}
            onChangeMidHallInfo={(midHallPerformanceInfo) =>
              setSelection((prev) => ({ ...prev, midHallPerformanceInfo }))
            }
            files={publicInterestFiles}
            onFilesChange={setPublicInterestFiles}
          />
        )}
        {step === 8 && (
          <Step6Submit
            rateTable={rateTable}
            quote={quote}
            selection={resolvedSelection}
            isLoggedIn={!!currentUser && !sessionExpired}
            isEditing={isEditing}
            submitting={submitting}
            submittedId={submittedId}
            error={submitError}
            attachmentError={attachmentError}
            fileCount={pendingFiles.length + audienceFiles.length + publicInterestFiles.length}
            onSubmit={submit}
          />
        )}

        <div className="mt-6">{navButtons}</div>
      </div>

      <SummaryPanel
        quote={quote}
        revealPrice={step >= 4}
        previewRows={step === 1 ? venuePreviewRows : step === 2 ? schedulePreviewRows : step === 3 ? configPreviewRows : undefined}
      />
    </div>
  );
}
