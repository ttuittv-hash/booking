"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQueryTab } from "./useQueryTab";
import type { ScreenTextContent, VenueRateContent, WizardStepTexts } from "@/lib/content/pageContent";
import { WizardTextContext, type WizardTextApi } from "@/lib/content/wizardText";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { packagesForVenue } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  AGE_RATING_LABEL,
  ANCILLARY_BUSINESS_PLAN_LABEL,
  APPLICANT_COMPANY_TYPE_LABEL,
  EVENT_TYPE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type MarketingCooperation,
  type QuoteSelection,
  type RateTable,
  type SafetyPledge,
} from "@/lib/pricing/types";
import { VenuePicker } from "@/components/wizard/VenuePicker";
import { StepConfigOptions } from "@/components/wizard/StepConfigOptions";
import {
  StepApplicantDetails,
  StepAttachments,
  StepCredibility,
  StepEventBasics,
} from "@/components/wizard/StepPerformanceInfo";
import { StepAudience } from "@/components/wizard/StepAudience";
import { StepPublicInterest } from "@/components/wizard/StepPublicInterest";
import { StepMarketingCooperation } from "@/components/wizard/StepMarketingCooperation";
import { StepSafetyPledge } from "@/components/wizard/StepSafetyPledge";
import { Step5Estimate } from "@/components/wizard/Step5Estimate";
import { Step6Submit } from "@/components/wizard/Step6Submit";
import { ContentFormShell } from "./fields";
import { HELP } from "./adminUi";
import {
  STEP3_DEFAULT_SLOT_ORDER,
  STEP3_SLOT_LABELS,
  STEP6_DEFAULT_SLOT_ORDER,
  STEP6_SLOT_LABELS,
} from "@/lib/content/wizardSlots";

// [2026-08-25] "읽기전용 모드로 실제 스텝 전체 화면을 보여주되, 리드 문구만 수정 가능"
// (2단계 제안) — 각 STEP의 실제 컴포넌트를 그대로(mock 데이터 + no-op 핸들러로) 렌더링해
// 진짜 화면처럼 보여주고, 편집 가능한 제목·리드는 실제 컴포넌트의 title/lead 자리에
// "그 값 자체"로 편집용 input/textarea를 끼워 넣는다 — 별도 박스에 같은 문구를 한 번 더
// 보여주지 않는다("신청자정보 및 규모에 신청자정보가 두개 있는 중복 표기" 지적으로
// 2026-08-25 수정. 처음엔 실제 헤딩 위에 편집 박스를 따로 뒀었는데, 같은 문구가 위아래
// 두 번 보여 중복으로 느껴졌다). title/lead prop 타입을 각 스텝 컴포넌트에서 string →
// ReactNode로 넓혀서(컴포넌트 소스에서 문자열을 그대로 렌더하던 자리 그대로이므로 실제
// 위저드 동작은 바뀌지 않는다) 가능해졌다. 실제 컴포넌트는 <fieldset disabled>로만 감싸
// 클릭·입력을 막는다. STEP 1의 달력(Step1Calendar/MidHallCalendar)만 예외로 생략했다 —
// 문구 편집과 무관하고 weekDemand/dateBlocks 같은 실 데이터가 있어야 의미 있게 그려지는
// 조회 전용 캘린더라, 여기 재현하는 비용에 비해 얻는 게 없다.
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
  coPromotionConsent: null,
  coSponsorshipConsent: null,
  ticketSalesDataConsent: false,
  pollstarConsent: false,
  executionPlan: { targetDefinition: "", mediaMix: "", budget: "", timeline: "" },
};

function defaultWeek(): QuoteSelection["week"] {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1, weekOfMonth: 1 };
}

// [버그 수정 2026-09-06] "대관자 정보 등록 계정값에서 정보 매핑해서 노출해야지" —
// 「신청자 정보」 미리보기가 대관신청사명·사업자등록번호·대표자명을 전부 빈칸("—")으로
// 보여줘서, 실제 화면에서도 계정 정보가 안 불러와지는 것처럼 보였다. 실제 화면
// (WizardShell.tsx)은 로그인 계정의 회사 정보를 그대로 채워 넣는데(applicantPrefill),
// 이 미리보기는 로그인 계정이 없어 항상 빈 INITIAL_PERFORMANCE_INFO만 썼다. 안전관리
// 서약서 미리보기가 이미 쓰던 예시 회사명("(주)와이지엔터테인먼트")과 짝을 맞춘
// 예시 값으로 채워 실제 화면과 같은 모습을 보여준다 — 저장되는 문구와는 무관하다.
const SAMPLE_APPLICANT_COMPANY_NAME = "(주)와이지엔터테인먼트";

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
    performanceInfo: {
      ...INITIAL_PERFORMANCE_INFO,
      applicantCompanyName: SAMPLE_APPLICANT_COMPANY_NAME,
      applicantBusinessRegistrationNumber: "214-87-00000",
      applicantRepresentativeName: "홍길동",
    },
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
  "block w-full min-w-0 border-0 border-b border-dashed border-transparent bg-transparent p-0 outline-none focus:border-accent";

/** 실제 헤딩 자리에 그대로 끼워 넣는 편집 입력 — 값이 곧 실제로 보이는 텍스트다. */
function EditableTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={EDITABLE_INPUT}
      style={{ font: "inherit", color: "inherit" }}
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
      style={{ font: "inherit", color: "inherit", lineHeight: "inherit" }}
    />
  );
}

/** 실제 스텝 컴포넌트를 클릭 불가 상태로 감싼다 — 소스는 건드리지 않는다.
 *  <fieldset disabled>는 못 쓴다 — HTML disabled는 CSS로 되살릴 수 없어서, 이 안에
 *  끼워 넣는 편집용 input/textarea까지 함께 막혀버린다(실제로 이렇게 했다가 편집이
 *  안 되는 버그가 났었다). 대신 pointer-events-none을 쓰고, 편집용 입력에만
 *  pointer-events-auto로 되살린다(각 사용처의 [&_input]/[&_textarea] 클래스). */
function LivePreview({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none select-none">{children}</div>;
}

/** t()가 편집 모드에서 반환하는 값 — 실제로 보이는 텍스트 노드 그 자리를 그대로
 * 편집 입력으로 바꿔치기한다. contentEditable + onBlur 커밋을 쓰는 이유: 값을 매
 * 타이핑마다 state로 올리면(controlled input) 리렌더 때 커서 위치가 튄다 — 여기서는
 * blur(포커스 아웃)할 때만 한 번 커밋해서 그 문제를 피한다. pointer-events-auto를
 * 직접 달아서 LivePreview의 pointer-events-none을 이 노드에서만 되살린다.
 *
 * onClick에서 preventDefault를 거는 이유: 안전관리 서약서 체크박스 항목처럼 이
 * 텍스트가 <label>(체크박스와 함께) 안에 있는 경우, "라벨 클릭 = 연결된 입력
 * 활성화"는 그 click 이벤트가 label까지 버블링됐을 때 브라우저가 처리하는
 * **기본 동작**이다 — stopPropagation(리스너 전파 차단)으로도, mousedown에
 * preventDefault를 거는 것으로도 안 막혔고(둘 다 실제로 시도해서 체크박스가
 * 계속 포커스를 가져가는 걸 확인함), click 이벤트 자체에 preventDefault를 걸어야
 * 막혔다 — 같은 이벤트가 버블링되는 동안 어느 시점에서든 preventDefault를 부르면
 * 그 이벤트가 나중에 label에 도달했을 때의 기본 동작이 취소된다.
 * contentEditable의 포커스·캐럿 배치는 mousedown 시점에 이미 끝나 있어(클릭은
 * mousedown 다음에 온다) 이 preventDefault와 무관하게 정상 동작한다. */
function InlineEditText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onClick={(e) => e.preventDefault()}
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) onChange(next);
      }}
      className="inline whitespace-pre-wrap break-words border-b border-dashed border-border-soft pointer-events-auto outline-none focus:border-accent"
    >
      {value}
    </span>
  );
}

/** t()를 통하지 않고 tStr()로만 노출되는 문구(placeholder·aria-label 등 DOM
 * 속성값 — 화면에 상시 보이는 자리가 없어 그 위치에 편집 입력을 끼워 넣을 수 없다)를
 * 모아 보여주는 보충 패널. 컴포넌트 트리를 하나하나 손으로 나열하지 않고, 렌더링
 * 중 tStr() 호출 자체가 자기 key·fallback을 이 Map에 등록하게 해서 자동으로
 * 모은다 — 나중에 어떤 컴포넌트가 새 tStr()을 추가해도 이 목록에 자동으로 잡힌다. */
function AttrFieldsPanel({
  fields,
  overrides,
  onChangeString,
}: {
  fields: Map<string, string>;
  overrides: Record<string, string>;
  onChangeString: (key: string, value: string) => void;
}) {
  if (fields.size === 0) return null;
  return (
    <div className="mt-6 border border-dashed border-border-soft bg-panel/60 p-3">
      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
        ✎ 속성 문구(placeholder 등) — 화면에 항상 보이는 자리가 없어 여기 따로 모았습니다
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[...fields.entries()].map(([key, fallback]) => (
          <label key={key} className="block">
            <input
              type="text"
              value={overrides[key] || fallback}
              onChange={(e) => onChangeString(key, e.target.value)}
              className={`${EDITABLE_INPUT} border-border-soft px-2 py-1`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** t()/tStr() 호출을 자동으로 편집 가능하게 만드는 경계. 이 안에서 렌더되는 실제
 * 컴포넌트 트리(StepConfigOptions 등)가 부르는 t()/tStr()은 개별 필드를 일일이
 * 나열하지 않아도 전부 자동으로 여기 연결된다 — 나중에 컴포넌트에 새 t() 호출이
 * 추가돼도 이 경계 코드는 손댈 필요가 없다.
 * tStr() 등록이 AttrFieldsPanel에서 보이는 이유: children이 먼저 렌더되며
 * fields Map을 채우고, Provider의 다음 형제인 AttrFieldsPanel은 React가 트리 순서대로
 * 렌더링하므로 같은 렌더 패스 안에서 이미 채워진 Map을 그대로 읽는다. */
function EditableSubtree({
  overrides,
  onChangeString,
  children,
}: {
  overrides: Record<string, string>;
  onChangeString: (key: string, value: string) => void;
  children: ReactNode;
}) {
  const fields = new Map<string, string>();
  const api: WizardTextApi = {
    t: (key, fallback) => (
      <InlineEditText
        key={key}
        value={overrides[key] || fallback}
        onChange={(v) => onChangeString(key, v)}
      />
    ),
    tStr: (key, fallback) => {
      fields.set(key, fallback);
      return overrides[key] || fallback;
    },
  };
  return (
    <WizardTextContext.Provider value={api}>
      {children}
      <AttrFieldsPanel fields={fields} overrides={overrides} onChangeString={onChangeString} />
    </WizardTextContext.Provider>
  );
}

interface RenderCtx {
  wizardSteps: WizardStepTexts;
  setStep: (patch: Partial<WizardStepTexts>) => void;
  wizardStrings: Record<string, string>;
  setString: (key: string, value: string) => void;
  rateTable: RateTable;
  liveHallRateContent: VenueRateContent;
  mocks: ReturnType<typeof useMockSelections>;
  /**
   * [신규 2026-09-06] "실제 위저드 화면처럼 보면서 수정하기에 반영해" — 필드 순서·
   * 노출 온오프도 이 화면(위저드 미리보기)에서 바로 옆에 두고 편집한다. 값 자체는
   * PageContentForms.tsx의 "위저드 항목 순서 · 노출" 섹션과 같은
   * ScreenTextContent.wizardFieldOrders/wizardDisabledFields를 공유한다.
   */
  fieldOrders: Record<string, string[]>;
  disabledFields: string[];
  setFieldOrder: (groupId: string, order: string[]) => void;
  setFieldDisabled: (fieldId: string, disabled: boolean) => void;
  /**
   * [신규 2026-09-06] "슬롯별 순서 조정" — 신청자 정보/공연 정보/기타 같은 큰 슬롯
   * 자체의 순서(예: STEP3의 "대관 정보"/"예상 관객 및 사업규모"/"자료 첨부"). 위
   * fieldOrders(슬롯 "안" 항목들의 순서·노출)와는 다른 층위다 — 슬롯 자체는 순서만
   * 조정하고(온오프는 두지 않는다), key는 wizardSlots.ts가 정의한 slotKey("3" 등).
   */
  slotOrders: Record<string, string[]>;
  setSlotOrder: (slotsKey: string, order: string[]) => void;
  /**
   * [신규 2026-09-06] "운영툴에서 수량제한 숫자까지는 입력 가능해야함" — 02 구성·옵션
   * 탭(아레나 단독/중형공연장 단독/동시 대관)의 부대시설 수량·예상매출 입력은 다른
   * 필드(문구 편집)와 달리 DB에 저장하지 않는 순수 미리보기용 로컬 상태다. 세 섹션이
   * 같은 addonId를 쓸 수 있어 섹션별로 따로 둔다. 상한(clampAddonQuantity)은
   * StepConfigOptions의 AddonRow가 onChange 시점에 이미 적용해 넘겨준다.
   */
  previewAddonQuantities: Record<PreviewAddonSection, Record<string, number>>;
  setPreviewAddonQuantity: (section: PreviewAddonSection, addonId: string, quantity: number) => void;
  previewExpectedRevenue: Record<PreviewAddonSection, number>;
  setPreviewExpectedRevenue: (section: PreviewAddonSection, value: number) => void;
}

type PreviewAddonSection = "arena" | "midHall" | "simultaneous";

/** 그룹 하나의 필드 순서·노출을 편집하는 작은 인라인 패널 — LivePreview 바로 옆에 둬서
 *  "보면서 수정"이 되게 한다(LivePreview 밖이라 pointer-events는 정상 동작한다). */
function FieldOrderPanel({
  ctx,
  groupId,
  defaultOrder,
  fieldLabels,
  title,
}: {
  ctx: RenderCtx;
  groupId: string;
  defaultOrder: string[];
  fieldLabels: Record<string, string>;
  title: string;
}) {
  const configured = ctx.fieldOrders[groupId];
  const order =
    configured && configured.length > 0
      ? [...configured.filter((k) => k in fieldLabels), ...defaultOrder.filter((k) => !configured.includes(k))]
      : [...defaultOrder];
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    ctx.setFieldOrder(groupId, next);
  };
  // [신규 2026-09-06] "체크박스 위에 항목 레이블 자체도 노출/미노출 설정 가능해야"
  // — 항목을 하나하나 끄지 않고, 이 그룹 전체(제목 포함)를 한 번에 끌 수 있게 한다.
  // 공공/공익 참여 그룹의 "그룹 노출" 토글과 같은 자리(groupId 자체를 disabledFields에
  // 넣는다)에, 각 화면 컴포넌트(StepPerformanceInfo.tsx의 visibleInGroup 등)가
  // `disabledFields?.includes(groupId)`를 먼저 확인해 그룹째 숨긴다.
  const groupDisabled = ctx.disabledFields.includes(groupId);
  return (
    <div className="border border-border-soft bg-panel/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-2xs font-bold uppercase tracking-wide text-muted">✎ {title} — 순서 · 노출</p>
        <label className="flex shrink-0 items-center gap-1.5 text-2xs font-bold whitespace-nowrap text-muted">
          <input
            type="checkbox"
            checked={!groupDisabled}
            onChange={(e) => ctx.setFieldDisabled(groupId, !e.target.checked)}
          />
          그룹 전체 노출
        </label>
      </div>
      <ul className="flex flex-col gap-1.5">
        {order.map((key, index) => {
          const fieldId = `${groupId}.${key}`;
          const disabled = ctx.disabledFields.includes(fieldId);
          return (
            <li key={key} className="flex items-center justify-between gap-3 bg-background px-2.5 py-1.5 text-s">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!disabled}
                  onChange={(e) => ctx.setFieldDisabled(fieldId, !e.target.checked)}
                />
                {fieldLabels[key] ?? key}
              </label>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="위로"
                  className="flex h-7 w-7 items-center justify-center rounded border border-border-soft text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="아래로"
                  className="flex h-7 w-7 items-center justify-center rounded border border-border-soft text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ▼
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 슬롯(신청자 정보/공연 정보/기타 같은 큰 그룹) 자체의 순서를 편집하는 패널 — 슬롯은
 *  온오프가 없고 순서만 조정한다(항목 단위 온오프는 FieldOrderPanel이 각 슬롯 안에서 맡는다). */
function SlotOrderPanel({
  ctx,
  slotsKey,
  defaultOrder,
  slotLabels,
  title,
}: {
  ctx: RenderCtx;
  slotsKey: string;
  defaultOrder: readonly string[];
  slotLabels: Record<string, string>;
  title: string;
}) {
  const configured = ctx.slotOrders[slotsKey];
  const order =
    configured && configured.length > 0
      ? [...configured.filter((k) => k in slotLabels), ...defaultOrder.filter((k) => !configured.includes(k))]
      : [...defaultOrder];
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    ctx.setSlotOrder(slotsKey, next);
  };
  return (
    <div className="border border-border-soft bg-panel/60 p-3">
      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">✎ {title} — 슬롯 순서</p>
      <ul className="flex flex-col gap-1.5">
        {order.map((key, index) => (
          <li key={key} className="flex items-center justify-between gap-3 bg-background px-2.5 py-1.5 text-s">
            <span>{slotLabels[key] ?? key}</span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="위로"
                className="flex h-7 w-7 items-center justify-center rounded border border-border-soft text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
                aria-label="아래로"
                className="flex h-7 w-7 items-center justify-center rounded border border-border-soft text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function makeFieldEditor(ctx: RenderCtx) {
  return function field(key: keyof WizardStepTexts) {
    return (
      <EditableTitle value={ctx.wizardSteps[key]} onChange={(val) => ctx.setStep({ [key]: val } as Partial<WizardStepTexts>)} />
    );
  };
}
function makeLeadEditor(ctx: RenderCtx) {
  return function lead(key: keyof WizardStepTexts) {
    return (
      <EditableLead value={ctx.wizardSteps[key]} onChange={(val) => ctx.setStep({ [key]: val } as Partial<WizardStepTexts>)} />
    );
  };
}

interface SubTab {
  label: string;
  render: (ctx: RenderCtx) => ReactNode;
}

interface StageGroup {
  label: string;
  subTabs: SubTab[];
}

const STAGE_GROUPS: StageGroup[] = [
  {
    label: "01 공간/일정",
    subTabs: [
      {
        label: "공간/일정",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          const lead = makeLeadEditor(ctx);
          return (
            <div>
              <LivePreview>
                <section>
                  <h2 className="type-kr-heading text-h5-m sm:text-h5 [&_input]:pointer-events-auto">
                    {field("venuePickerTitle")}
                  </h2>
                  <p className="measure mt-3 break-keep text-s text-muted [&_textarea]:pointer-events-auto">
                    {lead("venuePickerLead")}
                  </p>
                  <div className="mt-8">
                    <VenuePicker venueId="arena" bookingMode="SINGLE" onSelectVenue={noop} />
                  </div>
                </section>
              </LivePreview>
              <p className="mt-4 text-2xs text-muted">
                ※ 이 아래 실제 화면에는 일정 선택 달력(캘린더)이 더 있지만, 문구 편집과 무관한 조회 전용
                UI라 이 미리보기에서는 생략했습니다.
              </p>
            </div>
          );
        },
      },
    ],
  },
  {
    label: "02 구성 · 옵션",
    subTabs: [
      {
        label: "아레나 단독",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          return (
            <LivePreview>
              <div className="[&_input]:pointer-events-auto">
                <StepConfigOptions
                  rateTable={ctx.rateTable}
                  liveHallRateContent={ctx.liveHallRateContent}
                  stepText={ctx.wizardSteps}
                  selection={ctx.mocks.arena}
                  defaultPerformanceDays={4}
                  addonQuantities={ctx.previewAddonQuantities.arena}
                  expectedRevenue={ctx.previewExpectedRevenue.arena}
                  onChangeQuantity={(addonId, quantity) => ctx.setPreviewAddonQuantity("arena", addonId, quantity)}
                  onChangeRevenue={(value) => ctx.setPreviewExpectedRevenue("arena", value)}
                  onSelectPackage={noop}
                  headingOverride={{ title: field("configArenaTitle") }}
                />
              </div>
            </LivePreview>
          );
        },
      },
      {
        label: "중형공연장 단독",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          const lead = makeLeadEditor(ctx);
          return (
            <LivePreview>
              <div className="[&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
                <StepConfigOptions
                  rateTable={ctx.rateTable}
                  liveHallRateContent={ctx.liveHallRateContent}
                  stepText={ctx.wizardSteps}
                  selection={ctx.mocks.midHall}
                  defaultPerformanceDays={4}
                  addonQuantities={ctx.previewAddonQuantities.midHall}
                  expectedRevenue={ctx.previewExpectedRevenue.midHall}
                  onChangeQuantity={(addonId, quantity) => ctx.setPreviewAddonQuantity("midHall", addonId, quantity)}
                  onChangeRevenue={(value) => ctx.setPreviewExpectedRevenue("midHall", value)}
                  onSelectPackage={noop}
                  headingOverride={{ title: field("configMidHallOnlyTitle"), lead: lead("configMidHallOnlyLead") }}
                />
              </div>
            </LivePreview>
          );
        },
      },
      {
        label: "동시 대관",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          const lead = makeLeadEditor(ctx);
          return (
            <LivePreview>
              <div className="[&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
                <StepConfigOptions
                  rateTable={ctx.rateTable}
                  liveHallRateContent={ctx.liveHallRateContent}
                  stepText={ctx.wizardSteps}
                  selection={ctx.mocks.simultaneous}
                  defaultPerformanceDays={4}
                  addonQuantities={ctx.previewAddonQuantities.simultaneous}
                  expectedRevenue={ctx.previewExpectedRevenue.simultaneous}
                  onChangeQuantity={(addonId, quantity) =>
                    ctx.setPreviewAddonQuantity("simultaneous", addonId, quantity)
                  }
                  onChangeRevenue={(value) => ctx.setPreviewExpectedRevenue("simultaneous", value)}
                  onSelectPackage={noop}
                  headingOverride={{ title: field("configSimultaneousTitle"), lead: lead("configSimultaneousLead") }}
                />
              </div>
            </LivePreview>
          );
        },
      },
    ],
  },
  {
    label: "03 기본 정보",
    subTabs: [
      {
        label: "신청자 정보 및 규모",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          const lead = makeLeadEditor(ctx);
          // [신규 2026-09-06] "슬롯별 순서" — 대관 정보/예상 관객 및 사업규모/자료 첨부 3개
          // 큰 슬롯 자체의 순서. WizardShell.tsx의 step3SlotRenderers와 같은 이름·같은 규칙
          // (wizardSlots.ts)을 쓰므로, 여기서 순서를 바꾸면 실제 위저드와 항상 같은 순서로 보인다.
          const step3SlotRenderers: Record<string, ReactNode> = {
            applicantDetails: (
              <StepApplicantDetails
                key="applicantDetails"
                info={ctx.mocks.arena.performanceInfo}
                onChange={noop}
                midHallInfo={null}
                onChangeMidHallInfo={noop}
                selection={ctx.mocks.arena}
                title={field("performanceInfoTitle")}
                fieldOrders={ctx.fieldOrders}
                disabledFields={ctx.disabledFields}
              />
            ),
            eventBasics: (
              <StepEventBasics
                key="eventBasics"
                info={ctx.mocks.arena.performanceInfo}
                onChange={noop}
                midHallInfo={null}
                onChangeMidHallInfo={noop}
                selection={ctx.mocks.arena}
                fieldOrders={ctx.fieldOrders}
                disabledFields={ctx.disabledFields}
              />
            ),
            credibility: (
              <StepCredibility
                key="credibility"
                info={ctx.mocks.arena.performanceInfo}
                onChange={noop}
                midHallInfo={null}
                onChangeMidHallInfo={noop}
                selection={ctx.mocks.arena}
                castContractFiles={[]}
                onCastContractFilesChange={noop}
              />
            ),
            audience: (
              <StepAudience
                key="audience"
                info={ctx.mocks.arena.performanceInfo}
                onChange={noop}
                midHallInfo={null}
                onChangeMidHallInfo={noop}
                selection={ctx.mocks.arena}
                showHeading={false}
                title={ctx.wizardSteps.audienceTitle}
                lead={ctx.wizardSteps.audienceLead}
                fieldOrders={ctx.fieldOrders}
                disabledFields={ctx.disabledFields}
              />
            ),
          };
          const configuredStep3Order = ctx.slotOrders["3"];
          const step3Order =
            configuredStep3Order && configuredStep3Order.length > 0
              ? [
                  ...configuredStep3Order.filter((key) => key in step3SlotRenderers),
                  ...STEP3_DEFAULT_SLOT_ORDER.filter((key) => !configuredStep3Order.includes(key)),
                ]
              : [...STEP3_DEFAULT_SLOT_ORDER];
          return (
            <div className="space-y-4">
              {/* [신규 2026-09-06] "실제 위저드 화면처럼 보면서 수정하기에 반영해 ..
                  바로 아래에 노출" — 이 서브탭에 들어오면 맨 먼저 보이는 자리에 둔다,
                  아래 실제 화면(LivePreview)이 바로 이어져 바꾸는 즉시 눈으로 확인된다.
                  슬롯(큰 그룹) 순서 → 그 안 항목들의 순서·노출 순으로 바깥에서 안쪽으로 둔다. */}
              <SlotOrderPanel
                ctx={ctx}
                slotsKey="3"
                defaultOrder={STEP3_DEFAULT_SLOT_ORDER}
                slotLabels={STEP3_SLOT_LABELS}
                title="03 기본 정보 · 신청자 정보 및 규모"
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.applicantCompanyType"
                defaultOrder={Object.keys(APPLICANT_COMPANY_TYPE_LABEL)}
                fieldLabels={APPLICANT_COMPANY_TYPE_LABEL}
                title="신청 기업 유형"
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.applicantContact"
                defaultOrder={["role", "department", "name", "phone", "email"]}
                fieldLabels={{
                  role: "담당역할",
                  department: "소속",
                  name: "담당자명",
                  phone: "연락처",
                  email: "이메일 주소",
                }}
                title="담당자 정보"
              />
              {/* [신규 2026-09-06] "공연 기본정보"로 이어감 — 공연명/아티스트, 행사유형,
                  공연등급, 객석형태, 무대형태. 반복 입력 행(주최·주관·기획, 아티스트 이력 등)은
                  이미 추가·삭제가 있어 이 패턴 대상에서 뺀다. */}
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.eventBasics"
                defaultOrder={["eventName", "artist"]}
                fieldLabels={{ eventName: "공연(행사)명", artist: "아티스트 / 출연진" }}
                title="공연 기본정보 — 공연명·아티스트"
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.eventTypes"
                defaultOrder={Object.keys(EVENT_TYPE_LABEL)}
                fieldLabels={EVENT_TYPE_LABEL}
                title="행사유형"
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.ageRating"
                defaultOrder={Object.keys(AGE_RATING_LABEL)}
                fieldLabels={AGE_RATING_LABEL}
                title="공연등급"
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.seatingTypes"
                defaultOrder={Object.keys(SEATING_TYPE_LABEL)}
                fieldLabels={SEATING_TYPE_LABEL}
                title="객석형태"
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.stageTypes"
                defaultOrder={Object.keys(STAGE_TYPE_LABEL)}
                fieldLabels={STAGE_TYPE_LABEL}
                title="무대형태"
              />
              {/* [신규 2026-09-06] "예상 부대행사 옆에도 노출 미노출 여부 체크할수 있게" —
                  신청 기업 유형·행사 유형 등과 같은 순서·노출 패턴(StepAudience.tsx의
                  ANCILLARY_PLANS_GROUP_ID가 그대로 읽는다). */}
              <FieldOrderPanel
                ctx={ctx}
                groupId="audience.ancillaryBusinessPlans"
                defaultOrder={Object.keys(ANCILLARY_BUSINESS_PLAN_LABEL)}
                fieldLabels={ANCILLARY_BUSINESS_PLAN_LABEL}
                title="예상 부대행사(부대사업 계획)"
              />
              <div className="border border-border-soft bg-panel/60 p-3">
                <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
                  ✎ &ldquo;규모&rdquo; 블록 제목·리드 — 현재 실제 화면에서는 신청자 정보와 한 화면으로 합쳐져
                  이 제목이 표시되지 않습니다(계속 저장은 됩니다)
                </p>
                {field("audienceTitle")}
                <div className="mt-2">{lead("audienceLead")}</div>
              </div>
              <LivePreview>
                <div className="space-y-10 [&_input]:pointer-events-auto">
                  {step3Order.map((key) => step3SlotRenderers[key])}
                </div>
              </LivePreview>
            </div>
          );
        },
      },
      {
        label: "홍보 및 서비스 계획",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          const lead = makeLeadEditor(ctx);
          return (
            <LivePreview>
              <div className="[&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
                <StepMarketingCooperation
                  info={DEFAULT_MARKETING_COOPERATION}
                  onChange={noop}
                  planFiles={[]}
                  onPlanFilesChange={noop}
                  title={field("marketingTitle")}
                  lead={lead("marketingLead")}
                />
              </div>
            </LivePreview>
          );
        },
      },
      {
        label: "공공/공익 참여 여부",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          return (
            <LivePreview>
              <div className="[&_input]:pointer-events-auto">
                <StepPublicInterest
                  info={ctx.mocks.arena.performanceInfo}
                  onChange={noop}
                  selection={ctx.mocks.arena}
                  midHallInfo={null}
                  onChangeMidHallInfo={noop}
                  files={[]}
                  onFilesChange={noop}
                  title={field("publicInterestTitle")}
                />
              </div>
            </LivePreview>
          );
        },
      },
      {
        label: "안전관리 서약서",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          const lead = makeLeadEditor(ctx);
          const step6SlotRenderers: Record<string, ReactNode> = {
            safetyPledge: (
              <StepSafetyPledge
                key="safetyPledge"
                pledge={DEFAULT_SAFETY_PLEDGE}
                onChange={noop}
                safetyPlanFile={null}
                onSafetyPlanFileChange={noop}
                companyName="(주)와이지엔터테인먼트"
                title={field("safetyPledgeTitle")}
                lead={lead("safetyPledgeLead")}
              />
            ),
            attachments: (
              <StepAttachments key="attachments" files={[]} onFilesChange={noop} isSimultaneous={false} />
            ),
          };
          const configuredStep6Order = ctx.slotOrders["6"];
          const step6Order =
            configuredStep6Order && configuredStep6Order.length > 0
              ? [
                  ...configuredStep6Order.filter((key) => key in step6SlotRenderers),
                  ...STEP6_DEFAULT_SLOT_ORDER.filter((key) => !configuredStep6Order.includes(key)),
                ]
              : [...STEP6_DEFAULT_SLOT_ORDER];
          return (
            <div className="space-y-4">
              {/* [신규 2026-09-06] "슬롯 순서 변경은 모든 메뉴에 적용되어야 함" — 서약서
                  본문·자료 첨부 두 슬롯도 STEP3와 같은 패턴으로 순서 조정 가능하게 한다. */}
              <SlotOrderPanel
                ctx={ctx}
                slotsKey="6"
                defaultOrder={STEP6_DEFAULT_SLOT_ORDER}
                slotLabels={STEP6_SLOT_LABELS}
                title="안전관리 서약서"
              />
              <LivePreview>
                <div className="space-y-10 [&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
                  {step6Order.map((key) => step6SlotRenderers[key])}
                </div>
              </LivePreview>
            </div>
          );
        },
      },
    ],
  },
  {
    label: "04 신청서 제출",
    subTabs: [
      {
        label: "예상 대관료",
        render: (ctx) => {
          const field = makeFieldEditor(ctx);
          return (
            <LivePreview>
              <div className="[&_input]:pointer-events-auto">
                <Step5Estimate
                  rateTable={ctx.rateTable}
                  quote={ctx.mocks.arenaQuote}
                  selection={ctx.mocks.arena}
                  title={field("estimateTitle")}
                />
              </div>
            </LivePreview>
          );
        },
      },
      {
        label: "최종 제출",
        render: (ctx) => {
          const fieldNew = makeFieldEditor(ctx);
          const leadNew = makeLeadEditor(ctx);
          const fieldEdit = makeFieldEditor(ctx);
          const leadEdit = makeLeadEditor(ctx);
          return (
            <div className="space-y-8">
              <div>
                <span className="mb-3 inline-flex items-center border border-border/40 bg-panel px-2 py-0.5 text-xs font-bold text-muted">
                  새 신청 시
                </span>
                <LivePreview>
                  <div className="[&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
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
                      headingOverride={{ title: fieldNew("submitNewTitle"), lead: leadNew("submitNewLead") }}
                    />
                  </div>
                </LivePreview>
              </div>
              <div className="border-t border-dashed border-border-soft pt-8">
                <span className="mb-3 inline-flex items-center border border-border/40 bg-panel px-2 py-0.5 text-xs font-bold text-muted">
                  신청서 수정 중일 때
                </span>
                <LivePreview>
                  <div className="[&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
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
                      headingOverride={{ title: fieldEdit("submitEditingTitle"), lead: leadEdit("submitEditingLead") }}
                    />
                  </div>
                </LivePreview>
              </div>
            </div>
          );
        },
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
  // [신규 2026-09-06] 02 구성·옵션 미리보기 전용 로컬 상태 — DB에 저장하지 않는다.
  const [previewAddonQuantities, setPreviewAddonQuantities] = useState<
    Record<PreviewAddonSection, Record<string, number>>
  >({ arena: {}, midHall: {}, simultaneous: {} });
  const [previewExpectedRevenue, setPreviewExpectedRevenueState] = useState<Record<PreviewAddonSection, number>>({
    arena: 0,
    midHall: 0,
    simultaneous: 0,
  });
  const group = STAGE_GROUPS[groupIdx];
  const subTab = group.subTabs[Math.min(subIdx, group.subTabs.length - 1)];

  return (
    <ContentFormShell page="screenText" initial={content}>
      {(v, patch) => {
        function setStep(stepPatch: Partial<WizardStepTexts>) {
          patch({ wizardSteps: { ...v.wizardSteps, ...stepPatch } });
        }
        function setString(key: string, value: string) {
          patch({ wizardStrings: { ...v.wizardStrings, [key]: value } });
        }
        function setFieldOrder(groupId: string, order: string[]) {
          patch({ wizardFieldOrders: { ...v.wizardFieldOrders, [groupId]: order } });
        }
        function setFieldDisabled(fieldId: string, disabled: boolean) {
          patch({
            wizardDisabledFields: disabled
              ? [...v.wizardDisabledFields, fieldId]
              : v.wizardDisabledFields.filter((id) => id !== fieldId),
          });
        }
        function setSlotOrder(slotsKey: string, order: string[]) {
          patch({ wizardSlotOrders: { ...v.wizardSlotOrders, [slotsKey]: order } });
        }
        function setPreviewAddonQuantity(section: PreviewAddonSection, addonId: string, quantity: number) {
          setPreviewAddonQuantities((prev) => ({
            ...prev,
            [section]: { ...prev[section], [addonId]: quantity },
          }));
        }
        function setPreviewExpectedRevenue(section: PreviewAddonSection, value: number) {
          setPreviewExpectedRevenueState((prev) => ({ ...prev, [section]: value }));
        }
        const ctx: RenderCtx = {
          wizardSteps: v.wizardSteps,
          setStep,
          wizardStrings: v.wizardStrings,
          setString,
          rateTable,
          liveHallRateContent,
          mocks,
          fieldOrders: v.wizardFieldOrders,
          disabledFields: v.wizardDisabledFields,
          setFieldOrder,
          setFieldDisabled,
          slotOrders: v.wizardSlotOrders,
          setSlotOrder,
          previewAddonQuantities,
          setPreviewAddonQuantity,
          previewExpectedRevenue,
          setPreviewExpectedRevenue,
        };
        return (
          <div>
            <p className={HELP}>
              대관 위저드(/apply)와 같은 탭 구조입니다. 탭을 누르면 그 STEP의 실제 화면이 그대로
              나오고(화면은 클릭·입력이 안 됩니다), 점선 밑줄이 있는 문구는 그 자리에서 바로 고칠 수
              있습니다 — 고치는 즉시 같은 자리에 반영됩니다. placeholder처럼 화면에 상시 보이지 않는
              문구는 화면 아래 별도 칸에 모아 둡니다.
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

            <div className="mt-8 border border-dashed border-border-soft bg-panel/40 p-5">
              <EditableSubtree overrides={ctx.wizardStrings} onChangeString={ctx.setString}>
                {subTab.render(ctx)}
              </EditableSubtree>
            </div>
          </div>
        );
      }}
    </ContentFormShell>
  );
}
