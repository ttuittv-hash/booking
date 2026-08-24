"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { ARENA_MAX_AUDIENCE } from "@/lib/content/rateFacts";
import {
  findAddon,
  findPackage,
  isAddonAvailable,
} from "@/lib/pricing/rateTableUtils";
import type { AppUser, DateBlock, QuoteSelection, RateTable, SafetyPledge, WeekDemand } from "@/lib/pricing/types";
import { DEFAULT_VENUE_ID } from "@/lib/pricing/types";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { clearWizardDraft, loadWizardDraft, saveWizardDraft } from "@/lib/quotesStore";
import { ArrowRight, btnClass } from "@/components/ui/kit";
import { StepNav } from "./StepNav";
import { StepHeading } from "./StepHeading";
import { SummaryPanel } from "./SummaryPanel";
import { VenuePicker } from "./VenuePicker";
import { Step1Calendar } from "./Step1Calendar";
import { MidHallCalendar } from "./MidHallCalendar";
import { StepConfigOptions } from "./StepConfigOptions";
import { Step5Estimate } from "./Step5Estimate";
import { StepPerformanceInfo } from "./StepPerformanceInfo";
import { StepAudience } from "./StepAudience";
import { StepPublicInterest } from "./StepPublicInterest";
import { StepSafetyPledge } from "./StepSafetyPledge";
import { Step6Submit } from "./Step6Submit";

const TOTAL_STEPS = 8;

const DEFAULT_SAFETY_PLEDGE: SafetyPledge = {
  fireSafety: false,
  managerDesignated: false,
  facilityInspected: false,
  incidentReporting: false,
  signature: "",
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
        // 중첩 객체는 **초기값 위에 얹는다** — 스키마가 늘어난 뒤 복원된 초안에
        // 새 필드가 없으면 배열·객체 접근에서 렌더가 터진다.
        performanceInfo: { ...initialPerformanceInfo, ...(draft.selection.performanceInfo ?? {}) },
        safetyPledge: { ...DEFAULT_SAFETY_PLEDGE, ...(draft.selection.safetyPledge ?? {}) },
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

  // [개정 2026-08-20, 재재개정] "공간 선택"과 "일정 선택"은 다시 하나의 스텝(탭)으로
  // 합치되, 화면 안에서는 "공간 선택" 슬롯과 "일정 선택" 슬롯 두 섹션으로 나눠 보여준다 —
  // 공간 슬롯에서 이용 시설을 고르면 그 아래 일정 슬롯(아레나 캘린더 / 중형 캘린더 /
  // 동시 대관 탭)이 그 선택에 따라 달라진다. 관객 규모는 여전히 구성·옵션에서 입력하고,
  // 패키지도 구성·옵션에서 직접 선택해야 하므로 그전까지는 STEP 3(신청자 정보) 이후로
  // 넘어갈 수 없다.
  const maxUnlockedStep = !selection.venueId
    ? 1
    : midHallOnly && !hasMidHallSelection
      ? 1
      : needsPackage && !selection.packageId
        ? 2
        : TOTAL_STEPS;
  // 패키지 선택 전에도 기본 공연일수를 보여줘야 하므로, 모든 패키지가 공유하는 기본값(2일)을 임시로 사용한다.
  const effectivePkg = findPackage(rateTable, effectivePackageId);
  const defaultPerformanceDays = effectivePkg?.defaultPerformanceDays ?? 2;

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
        disabled={step === 1}
        onClick={() => goTo(step - 1)}
        className={btnClass("secondary", "lg")}
      >
        <ArrowRight className="rotate-180" />
        이전
      </button>
      {step < TOTAL_STEPS && (
        <button
          type="button"
          disabled={
            (step === 1 && (!selection.venueId || (midHallOnly && !hasMidHallSelection))) ||
            (step === 2 && needsPackage && !selection.packageId)
          }
          onClick={() => goTo(step + 1)}
          className={btnClass("primary", "lg")}
        >
          다음
          <ArrowRight />
        </button>
      )}
    </div>
  );

  return (
    /*
      좌: 스텝 콘텐츠(4col) / 우: sticky 요약 패널(2col) — 페이지 그리드 위에 올린다.
      예전에는 사이드바를 360px 고정 + gap 56 으로 뒀는데, 그러면 두 칼럼의 경계가
      6칼럼 그리드와 어긋나 같은 화면 안에 축이 두 개가 됐다(정본 §7.4 = 4col + 2col).
      콘텐츠 트랙은 min-w-0 로 묶어 스텝 전환 시 폭이 변하지 않게 한다.
    */
    <div className="container-site grid-site w-full gap-y-10 py-10 sm:py-12">
      <div className="min-w-0 lg:col-span-9">
        <StepNav step={step} maxUnlockedStep={maxUnlockedStep} onJump={goTo} />

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
            selection={resolvedSelection}
            defaultPerformanceDays={defaultPerformanceDays}
            addonQuantities={addonQuantities}
            expectedRevenue={selection.expectedRevenue ?? 0}
            onChangeQuantity={setAddonQuantity}
            onChangeRevenue={(value) =>
              setSelection((prev) => ({ ...prev, expectedRevenue: value }))
            }
            onSelectPackage={selectPackage}
          />
        )}
        {step === 3 && (
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
        {step === 4 && (
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
        {step === 5 && (
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
        {step === 6 && (
          <StepSafetyPledge
            pledge={selection.safetyPledge ?? DEFAULT_SAFETY_PLEDGE}
            onChange={(safetyPledge) => setSelection((prev) => ({ ...prev, safetyPledge }))}
          />
        )}
        {step === 7 && <Step5Estimate rateTable={rateTable} quote={quote} selection={resolvedSelection} />}
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
        /*
          요약 패널은 처음부터 **실시간 견적 요약**이다 — 대관료·항목·합계를 함께 보여준다.
          한동안 STEP 1·2 에서 금액을 감췄는데, 신청자가 구성을 고르는 동안 값이 얼마나
          움직이는지 볼 수 없어 되돌렸다. "예상 금액 · 확정 아님" 고지를 함께 둔다.
        */
      />
    </div>
  );
}
