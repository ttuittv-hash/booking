"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQueryTab } from "./useQueryTab";
import type { ScreenTextContent, VenueRateContent, WizardStepTexts } from "@/lib/content/pageContent";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { packagesForVenue } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import type { MarketingCooperation, QuoteSelection, RateTable, SafetyPledge } from "@/lib/pricing/types";
import { VenuePicker } from "@/components/wizard/VenuePicker";
import { StepConfigOptions } from "@/components/wizard/StepConfigOptions";
import { StepPerformanceInfo, StepAttachments } from "@/components/wizard/StepPerformanceInfo";
import { StepAudience } from "@/components/wizard/StepAudience";
import { StepPublicInterest } from "@/components/wizard/StepPublicInterest";
import { StepMarketingCooperation } from "@/components/wizard/StepMarketingCooperation";
import { StepSafetyPledge } from "@/components/wizard/StepSafetyPledge";
import { Step5Estimate } from "@/components/wizard/Step5Estimate";
import { Step6Submit } from "@/components/wizard/Step6Submit";
import { ContentFormShell } from "./fields";
import { HELP } from "./adminUi";

// [2026-08-25] "읽기전용 모드로 실제 스텝 전체 화면을 보여주되, 리드 문구만 수정 가능"
// (2단계 제안) — 각 STEP의 실제 컴포넌트를 그대로(mock 데이터 + no-op 핸들러로) 렌더링해
// 진짜 화면처럼 보여주고, 그 바로 위 작은 입력 박스에서 제목·리드를 고치면 아래 실제
// 화면이 같은 state를 읽어 바로 반영된다. 실제 컴포넌트 소스는 하나도 건드리지 않는다 —
// <fieldset disabled>로 감싸 클릭·입력만 막는다. STEP 1의 달력(Step1Calendar/
// MidHallCalendar)만 예외로 생략했다 — 문구 편집과 무관하고 weekDemand/dateBlocks 같은
// 실 데이터가 있어야 의미 있게 그려지는 조회 전용 캘린더라, 여기 재현하는 비용에 비해
// 얻는 게 없다(대신 VenuePicker까지는 실제 화면 그대로 보여준다).
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
  channels: [{ platform: "인스타그램", handle: "", followers: "" }],
  seoulArenaPromotionConsent: null,
  sponsorships: [{ brandName: "", campaignSummary: "" }],
  ticketSalesDataConsent: false,
  pollstarConsent: false,
  executionPlan: { targetDefinition: "", mediaMix: "", budget: "", timeline: "" },
};

function defaultWeek(): QuoteSelection["week"] {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1, weekOfMonth: 1 };
}

function buildBaseSelection(rateTable: RateTable): QuoteSelection {
  const arenaPkg = packagesForVenue(rateTable, "arena")[0] ?? null;
  return {
    venueId: "arena",
    bookingMode: "SINGLE",
    packageId: arenaPkg?.id ?? null,
    week: defaultWeek(),
    excludedDays: [],
    extraDays: 0,
    dayTags: {},
    dayShowCounts: {},
    expectedAudience: arenaPkg ? Math.round((arenaPkg.audienceTier.min + arenaPkg.audienceTier.max) / 2) : 8000,
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
}

function useMockSelections(rateTable: RateTable) {
  return useMemo(() => {
    const arena = buildBaseSelection(rateTable);
    const firstDate = resolveSelectedDates(arena)[0] ?? null;
    const midHallDays = firstDate ? { [firstDate]: { role: "PERFORMANCE" as const, shows: 1 } } : {};

    const midHall: QuoteSelection = { ...arena, venueId: "medium-hall", packageId: null, midHallDays };
    const simultaneous: QuoteSelection = { ...arena, bookingMode: "SIMULTANEOUS", midHallDays };

    return {
      arena,
      midHall,
      simultaneous,
      arenaQuote: calculateQuote(arena, rateTable),
      midHallQuote: calculateQuote(midHall, rateTable),
    };
  }, [rateTable]);
}

const noop = () => {};

const EDITABLE_INPUT =
  "block w-full min-w-0 border-0 border-b border-dashed border-border-soft bg-transparent p-0 text-s outline-none focus:border-accent";

function EditableTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${EDITABLE_INPUT} font-bold`}
    />
  );
}

function EditableLead({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className={`${EDITABLE_INPUT} resize-none`}
    />
  );
}

/** 실제 화면 바로 위에 붙는 작은 편집 박스 — 여기서 고치면 바로 아래 실제 화면이 반영된다. */
function EditBox({
  wizardSteps,
  setStep,
  titleKey,
  leadKey,
  note,
}: {
  wizardSteps: WizardStepTexts;
  setStep: (patch: Partial<WizardStepTexts>) => void;
  titleKey: keyof WizardStepTexts;
  leadKey?: keyof WizardStepTexts;
  note?: string;
}) {
  return (
    <div className="border border-border-soft bg-panel/60 p-3">
      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">✎ 문구 수정 — 아래에 바로 반영</p>
      <EditableTitle
        value={wizardSteps[titleKey]}
        onChange={(val) => setStep({ [titleKey]: val } as Partial<WizardStepTexts>)}
      />
      {leadKey && (
        <div className="mt-2">
          <EditableLead
            value={wizardSteps[leadKey]}
            onChange={(val) => setStep({ [leadKey]: val } as Partial<WizardStepTexts>)}
          />
        </div>
      )}
      {note && <p className="mt-2 text-2xs text-muted">{note}</p>}
    </div>
  );
}

/** 실제 스텝 컴포넌트를 클릭·입력 불가 상태로 감싼다 — 소스는 건드리지 않는다. */
function LivePreview({ children }: { children: ReactNode }) {
  return (
    <fieldset disabled style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} className="select-none">
      {children}
    </fieldset>
  );
}

interface SubTab {
  label: string;
  render: (ctx: RenderCtx) => ReactNode;
}

interface StageGroup {
  label: string;
  subTabs: SubTab[];
}

interface RenderCtx {
  wizardSteps: WizardStepTexts;
  setStep: (patch: Partial<WizardStepTexts>) => void;
  rateTable: RateTable;
  liveHallRateContent: VenueRateContent;
  mocks: ReturnType<typeof useMockSelections>;
}

function ConfigOptionsPreview({ ctx, selection }: { ctx: RenderCtx; selection: QuoteSelection }) {
  return (
    <LivePreview>
      <StepConfigOptions
        rateTable={ctx.rateTable}
        liveHallRateContent={ctx.liveHallRateContent}
        stepText={ctx.wizardSteps}
        selection={selection}
        defaultPerformanceDays={4}
        addonQuantities={{}}
        expectedRevenue={0}
        onChangeQuantity={noop}
        onChangeRevenue={noop}
        onSelectPackage={noop}
        onClearPackage={noop}
      />
    </LivePreview>
  );
}

const STAGE_GROUPS: StageGroup[] = [
  {
    label: "01 공간/일정",
    subTabs: [
      {
        label: "공간/일정",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="venuePickerTitle" leadKey="venuePickerLead" />
            <LivePreview>
              <section>
                <h2 className="type-kr-heading text-h5-m sm:text-h5">{ctx.wizardSteps.venuePickerTitle}</h2>
                <p className="measure mt-3 break-keep text-s text-muted">{ctx.wizardSteps.venuePickerLead}</p>
                <div className="mt-8">
                  <VenuePicker venueId="arena" bookingMode="SINGLE" onSelectVenue={noop} />
                </div>
              </section>
            </LivePreview>
            <p className="text-2xs text-muted">
              ※ 이 아래 실제 화면에는 일정 선택 달력(캘린더)이 더 있지만, 문구 편집과 무관한 조회 전용
              UI라 이 미리보기에서는 생략했습니다.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    label: "02 구성 · 옵션",
    subTabs: [
      {
        label: "아레나 단독",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox
              wizardSteps={ctx.wizardSteps}
              setStep={ctx.setStep}
              titleKey="configArenaTitle"
              note="리드 문구는 고른 패키지 정보로 자동 생성돼 여기서 따로 편집하지 않습니다."
            />
            <ConfigOptionsPreview ctx={ctx} selection={ctx.mocks.arena} />
          </div>
        ),
      },
      {
        label: "중형공연장 단독",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox
              wizardSteps={ctx.wizardSteps}
              setStep={ctx.setStep}
              titleKey="configMidHallOnlyTitle"
              leadKey="configMidHallOnlyLead"
            />
            <ConfigOptionsPreview ctx={ctx} selection={ctx.mocks.midHall} />
          </div>
        ),
      },
      {
        label: "동시 대관",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox
              wizardSteps={ctx.wizardSteps}
              setStep={ctx.setStep}
              titleKey="configSimultaneousTitle"
              leadKey="configSimultaneousLead"
            />
            <ConfigOptionsPreview ctx={ctx} selection={ctx.mocks.simultaneous} />
          </div>
        ),
      },
    ],
  },
  {
    label: "03 기본 정보",
    subTabs: [
      {
        label: "신청자 정보 및 규모",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="performanceInfoTitle" note="신청자 정보 블록 제목" />
            <EditBox
              wizardSteps={ctx.wizardSteps}
              setStep={ctx.setStep}
              titleKey="audienceTitle"
              leadKey="audienceLead"
              note="규모 블록 — 현재 실제 화면에서는 신청자 정보와 한 화면으로 합쳐져 이 제목이 표시되지 않습니다(데이터는 계속 저장됩니다)."
            />
            <LivePreview>
              <div className="space-y-10">
                <StepPerformanceInfo
                  info={ctx.mocks.arena.performanceInfo}
                  onChange={noop}
                  midHallInfo={null}
                  onChangeMidHallInfo={noop}
                  selection={ctx.mocks.arena}
                  title={ctx.wizardSteps.performanceInfoTitle}
                />
                <StepAudience
                  info={ctx.mocks.arena.performanceInfo}
                  onChange={noop}
                  midHallInfo={null}
                  onChangeMidHallInfo={noop}
                  selection={ctx.mocks.arena}
                  showHeading={false}
                  title={ctx.wizardSteps.audienceTitle}
                  lead={ctx.wizardSteps.audienceLead}
                />
                <StepAttachments files={[]} onFilesChange={noop} isSimultaneous={false} />
              </div>
            </LivePreview>
          </div>
        ),
      },
      {
        label: "공공/공익 참여 여부",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="publicInterestTitle" />
            <LivePreview>
              <StepPublicInterest
                info={ctx.mocks.arena.performanceInfo}
                onChange={noop}
                selection={ctx.mocks.arena}
                midHallInfo={null}
                onChangeMidHallInfo={noop}
                files={[]}
                onFilesChange={noop}
                title={ctx.wizardSteps.publicInterestTitle}
              />
            </LivePreview>
          </div>
        ),
      },
      {
        label: "홍보 및 서비스 계획",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="marketingTitle" leadKey="marketingLead" />
            <LivePreview>
              <StepMarketingCooperation
                info={DEFAULT_MARKETING_COOPERATION}
                onChange={noop}
                title={ctx.wizardSteps.marketingTitle}
                lead={ctx.wizardSteps.marketingLead}
              />
            </LivePreview>
          </div>
        ),
      },
      {
        label: "안전관리 서약서",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="safetyPledgeTitle" leadKey="safetyPledgeLead" />
            <LivePreview>
              <StepSafetyPledge
                pledge={DEFAULT_SAFETY_PLEDGE}
                onChange={noop}
                safetyPlanFile={null}
                onSafetyPlanFileChange={noop}
                castContractFile={null}
                onCastContractFileChange={noop}
                title={ctx.wizardSteps.safetyPledgeTitle}
                lead={ctx.wizardSteps.safetyPledgeLead}
              />
            </LivePreview>
          </div>
        ),
      },
    ],
  },
  {
    label: "04 신청서 제출",
    subTabs: [
      {
        label: "예상 대관료",
        render: (ctx) => (
          <div className="space-y-4">
            <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="estimateTitle" />
            <LivePreview>
              <Step5Estimate
                rateTable={ctx.rateTable}
                quote={ctx.mocks.arenaQuote}
                selection={ctx.mocks.arena}
                title={ctx.wizardSteps.estimateTitle}
              />
            </LivePreview>
          </div>
        ),
      },
      {
        label: "최종 제출",
        render: (ctx) => (
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center border border-border/40 bg-panel px-2 py-0.5 text-xs font-bold text-muted">
                새 신청 시
              </span>
              <EditBox wizardSteps={ctx.wizardSteps} setStep={ctx.setStep} titleKey="submitNewTitle" leadKey="submitNewLead" />
              <LivePreview>
                <Step6Submit
                  rateTable={ctx.rateTable}
                  quote={ctx.mocks.arenaQuote}
                  selection={ctx.mocks.arena}
                  isLoggedIn={true}
                  isEditing={false}
                  stepText={ctx.wizardSteps}
                  submitting={false}
                  submittedId={null}
                  error={null}
                  onSubmit={noop}
                />
              </LivePreview>
            </div>
            <div className="space-y-4 border-t border-dashed border-border-soft pt-8">
              <span className="inline-flex items-center border border-border/40 bg-panel px-2 py-0.5 text-xs font-bold text-muted">
                신청서 수정 중일 때
              </span>
              <EditBox
                wizardSteps={ctx.wizardSteps}
                setStep={ctx.setStep}
                titleKey="submitEditingTitle"
                leadKey="submitEditingLead"
              />
              <LivePreview>
                <Step6Submit
                  rateTable={ctx.rateTable}
                  quote={ctx.mocks.arenaQuote}
                  selection={ctx.mocks.arena}
                  isLoggedIn={true}
                  isEditing={true}
                  stepText={ctx.wizardSteps}
                  submitting={false}
                  submittedId={null}
                  error={null}
                  onSubmit={noop}
                />
              </LivePreview>
            </div>
          </div>
        ),
      },
    ],
  },
];

const STEP_VALUES = ["1", "2", "3", "4"] as const;

export function WizardTextPreview({
  content,
  rateTable,
  liveHallRateContent,
}: {
  content: ScreenTextContent;
  rateTable: RateTable;
  liveHallRateContent: VenueRateContent;
}) {
  // STEP 탭은 다른 운영 화면과 같이 URL(?step=1~4)에 싣는다 — 새로고침·링크 공유 유지.
  const [stepParam, setStepParam] = useQueryTab("step", STEP_VALUES, "1");
  const groupIdx = Math.min(Number(stepParam) - 1, STAGE_GROUPS.length - 1);
  const setGroupIdx = (i: number) => setStepParam(STEP_VALUES[i] ?? "1");
  const [subIdx, setSubIdx] = useState(0);
  const mocks = useMockSelections(rateTable);
  const group = STAGE_GROUPS[groupIdx];
  const subTab = group.subTabs[Math.min(subIdx, group.subTabs.length - 1)];

  return (
    <ContentFormShell page="screenText" initial={content}>
      {(v, patch) => {
        function setStep(stepPatch: Partial<WizardStepTexts>) {
          patch({ wizardSteps: { ...v.wizardSteps, ...stepPatch } });
        }
        const ctx: RenderCtx = { wizardSteps: v.wizardSteps, setStep, rateTable, liveHallRateContent, mocks };
        return (
          <div>
            <p className={HELP}>
              대관 위저드(/apply)와 같은 탭 구조입니다. 탭을 누르면 그 STEP의 실제 화면이 그대로
              나오고(클릭·입력은 안 됩니다), 화면 위 작은 박스에서 제목·리드를 고치면 바로 아래
              실제 화면에 반영됩니다.
            </p>

            <nav className="mt-5 border-b border-border/25">
              <ol className="flex w-full min-w-0 items-center gap-1 overflow-x-auto">
                {STAGE_GROUPS.map((g, i) => (
                  <li key={g.label} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setGroupIdx(i);
                        setSubIdx(0);
                      }}
                      aria-current={i === groupIdx ? "step" : undefined}
                      className={[
                        "flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-s font-bold transition-colors",
                        i === groupIdx
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {g.label}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>

            {group.subTabs.length > 1 && (
              <ol className="mt-3 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto pb-1">
                {group.subTabs.map((s, i) => (
                  <li key={s.label} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setSubIdx(i)}
                      aria-current={i === subIdx ? "step" : undefined}
                      className={[
                        "flex h-9 items-center rounded-full border px-4 text-xs font-bold transition-colors",
                        i === subIdx
                          ? "border-foreground bg-inverse-bg text-inverse-fg"
                          : "border-border-soft text-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-8 border border-dashed border-border-soft bg-panel/40 p-5">{subTab.render(ctx)}</div>
          </div>
        );
      }}
    </ContentFormShell>
  );
}
