"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  SPECIAL_VENUE_ID,
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
import { StepAudience, StepCompetitionOption } from "@/components/wizard/StepAudience";
import { StepPublicInterest } from "@/components/wizard/StepPublicInterest";
import { StepMarketingCooperation } from "@/components/wizard/StepMarketingCooperation";
import { StepSafetyPledge } from "@/components/wizard/StepSafetyPledge";
import { Step5Estimate } from "@/components/wizard/Step5Estimate";
import { Step6Submit } from "@/components/wizard/Step6Submit";
import { ContentFormShell } from "./fields";
import { HELP } from "./adminUi";
import { STEP3_DEFAULT_SLOT_ORDER, STEP3_SLOT_LABELS } from "@/lib/content/wizardSlots";

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

/**
 * [신규 2026-09-07] "미입력 필수항목... 기능 적용이 어려운 경우, 미입력 항목을
 * 안내하는 문구를 운영자 백오피스에서 수정할 수 있도록" — 빨간 테두리·자동 스크롤은
 * 구현했지만(WizardShell.tsx flashFieldError), 안내 문구 자체도 여기서 고칠 수 있게
 * 같이 둔다. validatePerformanceInfoStep 등은 컴포넌트가 아니라 렌더 중에 호출되지
 * 않으므로(버튼 클릭 시점에만 평가) AttrFieldsPanel처럼 자동 수집이 안 된다 —
 * 검증 함수의 return문과 하나씩 맞춘 고정 목록을 수동으로 들고 있는다. */
function ValidationMessagesPanel({
  ctx,
  title,
  entries,
}: {
  ctx: RenderCtx;
  title: string;
  entries: { key: string; fallback: string }[];
}) {
  return (
    <div className="border border-border-soft bg-panel/60 p-3">
      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
        ✎ {title} — 미입력 안내 문구
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map(({ key, fallback }) => (
          <label key={key} className="block">
            <input
              type="text"
              value={ctx.wizardStrings[key] || fallback}
              onChange={(e) => ctx.setString(key, e.target.value)}
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
   * [신규 2026-09-07] "체크박스 항목도 + 버튼 눌러서 바로 추가/입력 가능하고.. 체크박스
   * 항목도 수정 가능해야" — fieldOrders/disabledFields가 다루는 고정 항목 목록에
   * 완전히 새로운 항목을 추가한다. 그룹id → 커스텀 항목 key 배열(라벨은 다른 고정
   * 항목처럼 wizardStrings의 `fieldLabel.<그룹key>.<항목key>`로 별도 편집).
   */
  customOptions: Record<string, string[]>;
  setCustomOption: (groupId: string, options: string[]) => void;
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
  allowCustomOptions = false,
}: {
  ctx: RenderCtx;
  groupId: string;
  defaultOrder: string[];
  fieldLabels: Record<string, string>;
  title: string;
  /**
   * [신규 2026-09-07] "체크박스 항목도 + 버튼 눌러서 바로 추가/입력 가능하고" — 체크박스
   * 그룹(신청 기업 유형·행사유형·공연등급·객석형태·무대형태·부대사업 계획)에서만 켠다.
   * "담당자 정보"·"공연 기본정보 — 공연명·아티스트"처럼 구조가 고정된 필드 그룹은
   * 새 항목을 끼워 넣을 자리가 없어(코드가 필드마다 다른 입력을 그린다) 대상에서 뺀다.
   */
  allowCustomOptions?: boolean;
}) {
  const customKeys = allowCustomOptions ? (ctx.customOptions[groupId] ?? []) : [];
  const fullDefaultOrder = [...defaultOrder, ...customKeys];
  const configured = ctx.fieldOrders[groupId];
  const order =
    configured && configured.length > 0
      ? [...configured.filter((k) => fullDefaultOrder.includes(k)), ...fullDefaultOrder.filter((k) => !configured.includes(k))]
      : [...fullDefaultOrder];
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    ctx.setFieldOrder(groupId, next);
  };
  function addOption() {
    ctx.setCustomOption(groupId, [...customKeys, `custom-${Date.now()}`]);
  }
  function removeOption(key: string) {
    ctx.setCustomOption(
      groupId,
      customKeys.filter((k) => k !== key),
    );
  }
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
          const isCustom = customKeys.includes(key);
          return (
            <li key={key} className="flex items-center justify-between gap-3 bg-background px-2.5 py-1.5 text-s">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!disabled}
                  onChange={(e) => ctx.setFieldDisabled(fieldId, !e.target.checked)}
                />
                {fieldLabels[key] ?? key}
                {/* 라벨은 아래 실제 화면(LivePreview)에서 클릭해 바로 고친다 — 여기선
                    새로 추가된 항목임을 표시만 한다. */}
                {isCustom && <span className="text-2xs font-normal text-muted">(커스텀)</span>}
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
                {isCustom && (
                  <button
                    type="button"
                    onClick={() => removeOption(key)}
                    aria-label="삭제"
                    className="flex h-7 items-center justify-center rounded border border-border-soft px-2 text-xs text-muted hover:text-danger"
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {allowCustomOptions && (
        <button
          type="button"
          onClick={addOption}
          className="mt-2 text-2xs font-bold text-muted underline"
        >
          ＋ 항목 추가
        </button>
      )}
    </div>
  );
}

/**
 * [신규 2026-09-06] "패키지 박스 항목 추가·수정" — 위저드 미리보기(콘텐츠 관리 > 위저드
 * 미리보기)에서 바로 Rate 카드의 자유 항목(라벨·값)을 추가/편집한다. 예전엔 이 값이
 * `/admin/packages`(패키지 관리)에서만 편집됐는데, "위저드 미리보기 화면에서 바로
 * 추가/편집" 요청으로 여기에도 같은 기능을 둔다 — 두 화면 모두 같은 rate_tables
 * customCardRows를 편집하므로 어느 쪽에서 고쳐도 결과는 같다.
 *
 * customCardRows는 ScreenTextContent(wizardStrings 등)가 아니라 별도 저장소(rate_tables)에
 * 있어 ContentFormShell의 patch/저장으로 묶이지 않는다 — PackagesForm.tsx와 같은 방식으로
 * `/api/admin/packages`에 PUT하고 router.refresh()로 rateTable prop을 새로 받는다.
 * 이 API는 패키지 전체 배열을 받아 그대로 대체하므로(부분 패치 아님), 지금 편집하는
 * 패키지 하나만 바꾸고 나머지는 rateTable.packages를 그대로 다시 보낸다.
 */
function PackageCardRowsEditor({ rateTable }: { rateTable: RateTable }) {
  const router = useRouter();
  // Rate 카드(패키지 박스)로 렌더되는 패키지만 대상으로 한다 — 아레나 A~D + 패키지(동시
  // 대관 전용, SPECIAL_VENUE_ID). 중형공연장은 다른 카드 디자인(MidHallRateCard)이라
  // customCardRows를 읽지 않는다.
  const editablePackages = [
    ...packagesForVenue(rateTable, "arena"),
    ...packagesForVenue(rateTable, SPECIAL_VENUE_ID),
  ];
  const [activeId, setActiveId] = useState<number | null>(editablePackages[0]?.id ?? null);
  const [rowsByPackage, setRowsByPackage] = useState<Record<number, { label: string; value: string }[]>>(() =>
    Object.fromEntries(editablePackages.map((p) => [p.id, p.customCardRows.map((row) => ({ ...row }))])),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activePkg = editablePackages.find((p) => p.id === activeId) ?? editablePackages[0];
  if (!activePkg) return null;
  const rows = rowsByPackage[activePkg.id] ?? [];

  function setRows(next: { label: string; value: string }[]) {
    setRowsByPackage((prev) => ({ ...prev, [activePkg.id]: next }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const nextPackages = rateTable.packages.map((p) =>
        p.id === activePkg.id
          ? { ...p, customCardRows: rows.filter((row) => row.label.trim().length > 0) }
          : p,
      );
      const res = await fetch("/api/admin/packages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages: nextPackages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border-soft bg-panel/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xs font-bold uppercase tracking-wide text-muted">
          ✎ Rate 카드 추가 항목 (라벨 · 값)
        </p>
        <div className="flex flex-wrap gap-1">
          {editablePackages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              className={`rounded border px-2 py-1 text-2xs font-bold ${
                p.id === activePkg.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border-soft text-muted"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-muted">등록된 추가 항목이 없습니다.</p>}
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-background px-2.5 py-1.5">
            <input
              value={row.label}
              placeholder="라벨 (예: 무대 폭)"
              onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
              className="field-base w-1/2"
            />
            <input
              value={row.value}
              placeholder="값 (예: 40m)"
              onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
              className="field-base w-1/2"
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="shrink-0 text-2xs font-bold text-muted hover:text-danger"
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows([...rows, { label: "", value: "" }])}
          className="text-2xs font-bold text-muted underline"
        >
          ＋ 항목 추가
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded border border-foreground bg-foreground px-3 py-1.5 text-2xs font-bold text-background disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {message && <span className="text-2xs text-muted">{message}</span>}
      </div>
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
      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">✎ {title} — 슬롯 순서 · 노출</p>
      <ul className="flex flex-col gap-1.5">
        {order.map((key, index) => {
          // [신규 2026-09-06] "슬롯별 노출 결정도.. 슬롯명 옆에 노출 여부 체크박스" —
          // 지금까지 슬롯(큰 그룹)은 순서만 조정할 수 있었다(FieldOrderPanel의 그룹
          // 노출과 달리 슬롯 자체를 끄는 방법이 없었다). "slot.{slotsKey}.{key}" id로
          // wizardDisabledFields에 넣어 STEP 3/6 렌더링에서 슬롯째 건너뛴다
          // (WizardShell.tsx의 step3SlotOrder/step6SlotOrder 필터 참고).
          const slotFieldId = `slot.${slotsKey}.${key}`;
          const slotDisabled = ctx.disabledFields.includes(slotFieldId);
          return (
            <li key={key} className="flex items-center justify-between gap-3 bg-background px-2.5 py-1.5 text-s">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!slotDisabled}
                  onChange={(e) => ctx.setFieldDisabled(slotFieldId, !e.target.checked)}
                />
                {slotLabels[key] ?? key}
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

// [신규 2026-09-07] ValidationMessagesPanel용 고정 목록 — StepPerformanceInfo.tsx의
// validatePerformanceInfoStep·StepAudience.tsx의 validateAudienceStep이 돌려주는
// fieldKey·fallback 문구와 하나씩 맞춘다(그 두 함수를 고칠 때 여기도 같이 고칠 것).
const STEP3_VALIDATION_MESSAGES: { key: string; fallback: string }[] = [
  { key: "validationMessage.performanceInfo.applicantCompanyType", fallback: "신청 기업 유형을 선택해 주세요." },
  {
    key: "validationMessage.performanceInfo.applicantCompanyType.other",
    fallback: '신청 기업 유형 "기타" 상세를 입력해 주세요.',
  },
  { key: "validationMessage.performanceInfo.applicantContact", fallback: "담당자 정보를 1건 이상 입력해 주세요." },
  { key: "validationMessage.performanceInfo.applicantContact.role", fallback: "담당역할을 입력해 주세요." },
  { key: "validationMessage.performanceInfo.applicantContact.name", fallback: "담당자 성명을 입력해 주세요." },
  { key: "validationMessage.performanceInfo.applicantContact.phone", fallback: "담당자 연락처를 입력해 주세요." },
  { key: "validationMessage.performanceInfo.eventBasics.eventName", fallback: "공연(행사)명을 입력해 주세요." },
  { key: "validationMessage.performanceInfo.eventBasics.artist", fallback: "아티스트 / 출연진을 입력해 주세요." },
  {
    key: "validationMessage.performanceInfo.eventBasics.organizer",
    fallback: "주최 · 주관 · 기획을 하나 이상 입력해 주세요.",
  },
  { key: "validationMessage.performanceInfo.eventTypes", fallback: "행사유형을 하나 이상 선택해 주세요." },
  { key: "validationMessage.performanceInfo.ageRating", fallback: "공연등급을 선택해 주세요." },
  { key: "validationMessage.performanceInfo.ageRating.limitDetail", fallback: "연령제한 상세를 입력해 주세요." },
  {
    key: "validationMessage.performanceInfo.eventBasics.ticketOpenExpectedDate",
    fallback: "티켓 오픈 예정일을 입력해 주세요.",
  },
  { key: "validationMessage.performanceInfo.seatingTypes", fallback: "객석형태를 하나 이상 선택해 주세요." },
  {
    key: "validationMessage.performanceInfo.seatingTypes.other",
    fallback: '객석형태 "기타" 상세를 입력해 주세요.',
  },
  { key: "validationMessage.performanceInfo.retractableSeatUse", fallback: "수납식 객석 사용여부를 선택해 주세요." },
  {
    key: "validationMessage.performanceInfo.retractableSeatUse.floors",
    fallback: "수납식 객석을 사용하시면 1층·3층 각각 사용여부를 선택해 주세요.",
  },
  { key: "validationMessage.performanceInfo.stageTypes", fallback: "무대형태를 하나 이상 선택해 주세요." },
  {
    key: "validationMessage.performanceInfo.stageTypes.other",
    fallback: '무대형태 "기타" 상세를 입력해 주세요.',
  },
  {
    key: "validationMessage.performanceInfo.credibility.castContractStatus",
    fallback: "주요 출연진 계약 상태를 선택해 주세요.",
  },
  {
    key: "validationMessage.performanceInfo.credibility.masking",
    fallback: "출연 계약 증빙 마스킹 제출 허용에 동의해 주세요.",
  },
  {
    key: "validationMessage.performanceInfo.credibility.safetyPledgeSigned",
    fallback: "안전규정 준수 확약서 작성 완료에 동의해 주세요.",
  },
  { key: "validationMessage.audience.ancillaryBusinessPlans", fallback: "부대사업 계획을 하나 이상 선택해 주세요." },
  {
    key: "validationMessage.audience.ancillaryBusinessPlans.other",
    fallback: '부대사업 계획 "기타" 상세를 입력해 주세요.',
  },
];

// [신규 2026-09-07] StepSafetyPledge.tsx의 validateSafetyPledgeStep과 짝.
const STEP6_VALIDATION_MESSAGES: { key: string; fallback: string }[] = [
  { key: "validationMessage.safetyPledge.items", fallback: "안전관리 서약 항목을 모두 체크해 주세요." },
  { key: "validationMessage.safetyPledge.signature", fallback: "서명란에 서명해 주세요." },
];

// [신규 2026-09-07] 안전관리계획서 업로드가 STEP6에서 STEP7(자료 첨부)로 옮겨가며
// validateAttachmentsStep과 짝을 이루는 안내 문구도 함께 옮겼다.
const STEP7_VALIDATION_MESSAGES: { key: string; fallback: string }[] = [
  { key: "validationMessage.attachments.safetyPlanFile", fallback: "공연·행사 안전관리계획서를 업로드해 주세요." },
];

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
            <div className="space-y-4">
              {/* [신규 2026-09-06] "rate 카드 항목 셋팅 설정하는 슬롯을 추가해줘" — 패키지
                  카드(Rate A/B/C/D 박스) 안 수용인원·권장 무대·권장 객석·대관료 4행의
                  순서·노출을 다른 슬롯과 같은 패턴으로 편집한다. 할인율·총금액 행은
                  패키지의 discountRatio에 따라 조건부로 붙는 파생 행이라 대상에서 뺀다. */}
              <FieldOrderPanel
                ctx={ctx}
                groupId="configOptions.packageCard"
                defaultOrder={["audienceCapacity", "recommendedStage", "recommendedSeating", "baseFee"]}
                fieldLabels={{
                  audienceCapacity: "수용인원",
                  recommendedStage: "권장 무대",
                  recommendedSeating: "권장 객석",
                  baseFee: "대관료",
                }}
                title="Rate 카드(패키지 박스) 항목"
              />
              <PackageCardRowsEditor rateTable={ctx.rateTable} />
              {/* [신규 2026-09-07] "저 부분(예상 관객·셋업·공연 요약 줄) 삭제하고 싶은데
                  안 됨" — 아래 「✎ 속성 문구」 칸은 줄 안의 단어만 바꿀 수 있고 줄 자체를
                  끌 수는 없었다. 다른 슬롯과 같은 노출 On/off 패턴을 그대로 써서 줄 전체를
                  껐다 켰다 할 수 있게 한다(위저드 미리보기·실제 신청 화면 모두 반영). */}
              <div className="flex items-center justify-between gap-3 border border-border-soft bg-panel/60 p-3">
                <p className="text-2xs font-bold uppercase tracking-wide text-muted">
                  ✎ &ldquo;아레나&rdquo; 제목 아래 요약 줄(패키지·예상 관객·셋업·공연)
                </p>
                <label className="flex shrink-0 items-center gap-1.5 text-2xs font-bold whitespace-nowrap text-muted">
                  <input
                    type="checkbox"
                    checked={!ctx.disabledFields.includes("configOptions.arenaSummaryLead")}
                    onChange={(e) => ctx.setFieldDisabled("configOptions.arenaSummaryLead", !e.target.checked)}
                  />
                  노출
                </label>
              </div>
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
                    fieldOrders={ctx.fieldOrders}
                    disabledFields={ctx.disabledFields}
                  />
                </div>
              </LivePreview>
            </div>
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
                  fieldOrders={ctx.fieldOrders}
                  disabledFields={ctx.disabledFields}
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
                  fieldOrders={ctx.fieldOrders}
                  disabledFields={ctx.disabledFields}
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
                customOptions={ctx.customOptions}
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
                customOptions={ctx.customOptions}
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
                customOptions={ctx.customOptions}
              />
            ),
            competitionOption: (
              <StepCompetitionOption key="competitionOption" info={ctx.mocks.arena.performanceInfo} onChange={noop} />
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
                allowCustomOptions
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
                allowCustomOptions
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.ageRating"
                defaultOrder={Object.keys(AGE_RATING_LABEL)}
                fieldLabels={AGE_RATING_LABEL}
                title="공연등급"
                allowCustomOptions
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.seatingTypes"
                defaultOrder={Object.keys(SEATING_TYPE_LABEL)}
                fieldLabels={SEATING_TYPE_LABEL}
                title="객석형태"
                allowCustomOptions
              />
              <FieldOrderPanel
                ctx={ctx}
                groupId="performanceInfo.stageTypes"
                defaultOrder={Object.keys(STAGE_TYPE_LABEL)}
                fieldLabels={STAGE_TYPE_LABEL}
                title="무대형태"
                allowCustomOptions
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
                allowCustomOptions
              />
              <div className="border border-border-soft bg-panel/60 p-3">
                <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted">
                  ✎ &ldquo;규모&rdquo; 블록 제목·리드 — 현재 실제 화면에서는 신청자 정보와 한 화면으로 합쳐져
                  이 제목이 표시되지 않습니다(계속 저장은 됩니다)
                </p>
                {field("audienceTitle")}
                <div className="mt-2">{lead("audienceLead")}</div>
              </div>
              <ValidationMessagesPanel ctx={ctx} title="03 기본 정보 · 신청자 정보 및 규모" entries={STEP3_VALIDATION_MESSAGES} />
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
          return (
            <div className="space-y-4">
              <ValidationMessagesPanel ctx={ctx} title="안전관리 서약서" entries={STEP6_VALIDATION_MESSAGES} />
              <LivePreview>
                <div className="[&_input]:pointer-events-auto [&_textarea]:pointer-events-auto">
                  <StepSafetyPledge
                    pledge={DEFAULT_SAFETY_PLEDGE}
                    onChange={noop}
                    companyName="(주)와이지엔터테인먼트"
                    title={field("safetyPledgeTitle")}
                    lead={lead("safetyPledgeLead")}
                  />
                </div>
              </LivePreview>
            </div>
          );
        },
      },
      {
        // [신규 2026-09-07] "안전관리 서약서 뒤에 자료 첨부 탭 신규 생성" — 서약서 탭의
        // 두 번째 슬롯이던 자료 첨부를 독립 탭으로 뗐다. [수정 2026-09-07] 안전관리계획서
        // 업로드도 이 탭으로 옮겨왔다.
        label: "자료 첨부",
        render: (ctx) => (
          <div className="space-y-4">
            <ValidationMessagesPanel ctx={ctx} title="자료 첨부" entries={STEP7_VALIDATION_MESSAGES} />
            <LivePreview>
              <div className="[&_input]:pointer-events-auto">
                <StepAttachments
                  files={[]}
                  onFilesChange={noop}
                  isSimultaneous={false}
                  safetyPlanFile={null}
                  onSafetyPlanFileChange={noop}
                />
              </div>
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
        // [신규 2026-09-07] "체크박스 항목도 + 버튼 눌러서 바로 추가/입력" — 그룹id →
        // 커스텀 항목 key 배열을 통째로 교체한다(항목 추가/삭제 둘 다 이 함수 하나로 처리).
        function setCustomOption(groupId: string, options: string[]) {
          patch({ wizardCustomOptions: { ...v.wizardCustomOptions, [groupId]: options } });
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
          customOptions: v.wizardCustomOptions,
          setCustomOption,
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
