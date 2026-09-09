"use client";

import { toggleClass, ROW_REMOVE_BTN } from "@/components/ui/kit";
import { useDialog } from "@/components/ui/Dialog";

import { Fragment, useState, type ReactNode } from "react";
import { useWizardText } from "@/lib/content/wizardText";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { FilePicker } from "@/components/ui/FilePicker";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import {
  AGE_RATING_LABEL,
  APPLICANT_COMPANY_TYPE_LABEL,
  CAST_CONTRACT_STATUS_LABEL,
  EVENT_TYPE_LABEL,
  ORGANIZER_ROLE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type AgeRating,
  type ApplicantCompanyType,
  type ArtistMainHistoryRecord,
  type ArtistRecentPerformanceRecord,
  type CastContractStatus,
  type ContactPersonRecord,
  type EventType,
  type OrganizerEntry,
  type OrganizerRole,
  type PastPerformanceRecord,
  type PerformanceInfo,
  type QuoteSelection,
  type SeatingType,
  type StageType,
  type StepValidationResult,
} from "@/lib/pricing/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
const APPLICANT_COMPANY_TYPES = Object.keys(APPLICANT_COMPANY_TYPE_LABEL) as ApplicantCompanyType[];
const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[];
const SEATING_TYPES = Object.keys(SEATING_TYPE_LABEL) as SeatingType[];
const AGE_RATINGS = Object.keys(AGE_RATING_LABEL) as AgeRating[];
const CAST_CONTRACT_STATUSES = Object.keys(CAST_CONTRACT_STATUS_LABEL) as CastContractStatus[];
const ORGANIZER_ROLES = Object.keys(ORGANIZER_ROLE_LABEL) as OrganizerRole[];

// organizers(역할별 반복 행)이 바뀔 때마다 organizer(단일 텍스트)를 자동으로 합성한다 —
// 인쇄본·관리자 화면·채점 로직이 이미 organizer 문자열을 그대로 읽고 있어 하위호환을
// 이렇게 유지한다(2026-08-26).
function deriveOrganizerSummary(organizers: OrganizerEntry[]): string {
  return organizers
    .filter((o) => o.name.trim())
    .map((o) => `${ORGANIZER_ROLE_LABEL[o.role]} ${o.name.trim()}`)
    .join(" / ");
}

// 신청서 제출(POST /api/quotes)이 성공한 뒤 /api/quotes/[id]/attachments로 업로드되므로,
// 서버 쪽 검증 기준(src/app/api/quotes/[id]/attachments/route.ts)과 동일하게 맞춘다.
// [개정 2026-08-26] "첨부 용량은 500메가까지 가능하게함" — 서버 쪽 한도
// (api/quotes/[id]/attachments/route.ts)도 함께 올렸다.
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/haansofthwp",
  "application/x-hwp",
  "application/zip",
]);

// 신청자 정보 단계(STEP 3)의 필수값 검증 — 자료 첨부만 선택이고 나머지 슬롯은 전부
// 필수다(2026-08-22, "그 외 슬롯은 필수값으로 해서... 다음단계로 안넘어가게"). 대관사
// 최근 3년간 공연 실적(반복 입력)과 해외 아티스트 추가사항은 신규 업체·국내 공연에는
// 해당 사항이 없을 수 있어 필수에서 뺀다. venueLabel을 주면 동시 대관에서 아레나/중형
// 중 어느 쪽이 비었는지 메시지에 알려준다.
// [신규 2026-09-06] "각 항목들 노출 On/off 가능해야" — 필드를 꺼도 필수값 검사에서
// 막히면 안 되므로, 꺼진 필드는 여기서도 건너뛴다. id는 "그룹id.필드key" 형식
// (ScreenTextContent.wizardDisabledFields와 같은 값을 그대로 넘긴다).
export function validatePerformanceInfoStep(
  info: PerformanceInfo,
  venueLabel?: string,
  disabledFields: string[] = [],
  // [신규 2026-09-07] "체크박스 항목도 + 버튼으로 추가" — 관리자가 새로 추가한 커스텀
  // 항목(ScreenTextContent.wizardCustomOptions)까지 포함해야 "고를 항목이 하나도 없을
  // 때만 필수 검사를 건너뛴다"는 계산이 맞는다. 그룹id → 커스텀 항목 key 배열.
  customOptions: Record<string, string[]> = {},
  // [신규 2026-09-07] "미입력 필수항목 빨간색 표시 + 자동 스크롤" — 안내 문구를
  // 운영자 백오피스에서 고칠 수 있어야 해서, 문구 하나하나를 하드코딩 대신
  // tStr(key, fallback)로 조회한다. 검증 함수는 컴포넌트가 아니라 훅을 직접 못 쓰므로,
  // WizardShell.tsx가 useWizardText()로 얻은 tStr을 그대로 넘겨준다.
  tStr: (key: string, fallback: string) => string = (_key, fallback) => fallback,
): StepValidationResult | null {
  const prefix = venueLabel ? `${venueLabel} ` : "";
  const isDisabled = (id: string) => disabledFields.includes(id);
  // [신규 2026-09-07] fieldKey는 그 필드를 감싼 DOM의 data-field-key와 매칭되고,
  // 안내 문구는 그 값을 그대로 `validationMessage.<fieldKey>` 키로 써서 조회한다 —
  // 하나의 id가 "어디로 스크롤할지"와 "무슨 문구를 보여줄지"를 함께 결정한다.
  function issue(fieldKey: string, fallback: string): StepValidationResult {
    return { fieldKey, message: `${prefix}${tStr(`validationMessage.${fieldKey}`, fallback)}` };
  }
  // [버그 수정 2026-09-06] "슬롯 전체를 숨겨도 필수 검사에서 막힘" — 위 필드 단위
  // isDisabled/visibleInGroup 검사와 별개로, WizardShell의 STEP3 슬롯 자체를 통째로
  // 껐을 때(slot.3.<key>, SlotOrderPanel의 새 체크박스) 그 슬롯 컴포넌트
  // (StepApplicantDetails/StepEventBasics/StepCredibility)가 아예 렌더되지 않으므로,
  // 그 슬롯이 담당하는 필드들의 필수 검사도 함께 건너뛴다 — 안 그러면 화면에 없는
  // 항목을 입력하라고 막다른 길로 몬다.
  const isSlotDisabled = (key: string) => disabledFields.includes(`slot.3.${key}`);

  // 대관신청사명·사업자등록번호는 더 이상 이 화면에서 입력하지 않고 가입 계정에서
  // 그대로 가져와 읽기 전용으로 보여준다(2026-08-22) — 계정 데이터라 여기서 필수값
  // 검사를 하지 않는다(비어 있다면 계정 쪽 문제다).
  // [버그 수정 2026-09-06] "체크박스 노출/숨김이 필수 항목으로 처리되어 있음" —
  // 어드민이 항목(또는 그룹 전체)을 숨겨도 이 검사는 disabledFields를 몰라 계속
  // 필수로 요구했다. 화면에 실제로 고를 수 있는 선택지가 하나도 안 남았을 때만
  // (visibleInGroup이 화면 렌더링과 똑같이 계산) 필수 검사를 건너뛴다 — 그룹
  // 전체를 껐을 때는 물론, 개별 항목을 모두 꺼서 결과적으로 빈 목록이 됐을 때도
  // 같은 규칙으로 걸러진다.
  if (!isSlotDisabled("applicantDetails")) {
    // [신규 2026-09-08] 대관사명·사업자등록번호가 입력칸이 되면서 비울 수 있게 됐다 —
    // 계약 주체 식별값이라 비워서는 제출할 수 없다. 대표자명은 선택.
    if (!info.applicantCompanyName.trim())
      return issue("performanceInfo.applicantCompanyName", "대관신청사명을 입력해 주세요.");
    if (!info.applicantBusinessRegistrationNumber.trim())
      return issue("performanceInfo.applicantBusinessRegistrationNumber", "사업자등록번호를 입력해 주세요.");
    if (
      visibleInGroup(
        [...APPLICANT_COMPANY_TYPES, ...(customOptions["performanceInfo.applicantCompanyType"] ?? [])],
        "performanceInfo.applicantCompanyType",
        disabledFields,
      ).length > 0 &&
      !info.applicantCompanyType
    ) {
      return issue("performanceInfo.applicantCompanyType", "신청 기업 유형을 선택해 주세요.");
    }
    if (info.applicantCompanyType === "OTHER" && !info.applicantCompanyTypeOtherDetail?.trim()) {
      return issue("performanceInfo.applicantCompanyType.other", '신청 기업 유형 "기타" 상세를 입력해 주세요.');
    }

    // [개정 2026-09-06] "담당자 정보를 한 줄짜리 반복 행으로" — 담당자·공연 운영/안전관리
    // 총괄 책임자를 합친 반복 테이블. 행마다 담당역할·성명·연락처는 필수, 소속·이메일은
    // 선택이다(ResponsiblePerson의 "소속(선택)"과 같은 이유).
    const contactPersons = info.contactPersons ?? [];
    if (!isDisabled("performanceInfo.applicantContact.role") && contactPersons.length === 0) {
      return issue("performanceInfo.applicantContact", "담당자 정보를 1건 이상 입력해 주세요.");
    }
    for (const person of contactPersons) {
      if (!isDisabled("performanceInfo.applicantContact.role") && !person.role.trim()) {
        return issue("performanceInfo.applicantContact.role", "담당역할을 입력해 주세요.");
      }
      if (!isDisabled("performanceInfo.applicantContact.name") && !person.name.trim()) {
        return issue("performanceInfo.applicantContact.name", "담당자 성명을 입력해 주세요.");
      }
      if (!isDisabled("performanceInfo.applicantContact.phone") && !person.phone.trim()) {
        return issue("performanceInfo.applicantContact.phone", "담당자 연락처를 입력해 주세요.");
      }
    }
  }

  if (!isSlotDisabled("eventBasics")) {
    if (!isDisabled("performanceInfo.eventBasics.eventName") && !info.eventName.trim())
      return issue("performanceInfo.eventBasics.eventName", "공연(행사)명을 입력해 주세요.");
    if (!isDisabled("performanceInfo.eventBasics.artist") && !info.artist.trim())
      return issue("performanceInfo.eventBasics.artist", "아티스트 / 출연진을 입력해 주세요.");
    // organizer(단일 텍스트)는 organizers(역할별 반복 행)에서 자동 합성되므로, 배열에 이름이
    // 하나라도 있으면 통과시킨다 — 합성 전 옛 신청서는 organizer 문자열만으로 판단한다.
    const hasOrganizerEntry = (info.organizers ?? []).some((o) => o.name.trim());
    if (!hasOrganizerEntry && !info.organizer.trim()) {
      return issue("performanceInfo.eventBasics.organizer", "주최 · 주관 · 기획을 하나 이상 입력해 주세요.");
    }
    if (
      visibleInGroup(
        [...EVENT_TYPES, ...(customOptions["performanceInfo.eventTypes"] ?? [])],
        "performanceInfo.eventTypes",
        disabledFields,
      ).length > 0 &&
      info.eventTypes.length === 0
    ) {
      return issue("performanceInfo.eventTypes", "행사유형을 하나 이상 선택해 주세요.");
    }
    const visibleAgeRatingsForValidation = visibleInGroup(
      [...(Object.keys(AGE_RATING_LABEL) as AgeRating[]), ...(customOptions["performanceInfo.ageRating"] ?? [])],
      "performanceInfo.ageRating",
      disabledFields,
    );
    if (visibleAgeRatingsForValidation.length > 0 && !info.ageRating) {
      return issue("performanceInfo.ageRating", "공연등급을 선택해 주세요.");
    }
    if (info.ageRating === "AGE_LIMIT" && !info.ageLimitDetail.trim()) {
      return issue("performanceInfo.ageRating.limitDetail", "연령제한 상세를 입력해 주세요.");
    }

    if (!info.ticketOpenExpectedDate.trim())
      return issue("performanceInfo.eventBasics.ticketOpenExpectedDate", "티켓 오픈 예정일을 입력해 주세요.");

    if (
      visibleInGroup(
        [...SEATING_TYPES, ...(customOptions["performanceInfo.seatingTypes"] ?? [])],
        "performanceInfo.seatingTypes",
        disabledFields,
      ).length > 0 &&
      info.seatingTypes.length === 0
    ) {
      return issue("performanceInfo.seatingTypes", "객석형태를 하나 이상 선택해 주세요.");
    }
    if (info.seatingTypes.includes("OTHER") && !info.seatingTypeOtherDetail?.trim()) {
      return issue("performanceInfo.seatingTypes.other", '객석형태 "기타" 상세를 입력해 주세요.');
    }
    // [삭제 2026-09-08] "[applicant info] 수납식 객석 > 미노출" — 화면에서 뺀 필드라
    // 필수 검증도 함께 뗐다.
    if (
      visibleInGroup(
        [...STAGE_TYPES, ...(customOptions["performanceInfo.stageTypes"] ?? [])],
        "performanceInfo.stageTypes",
        disabledFields,
      ).length > 0 &&
      info.stageTypes.length === 0
    ) {
      return issue("performanceInfo.stageTypes", "무대형태를 하나 이상 선택해 주세요.");
    }
    if (info.stageTypes.includes("OTHER") && !info.stageTypeOtherDetail?.trim()) {
      return issue("performanceInfo.stageTypes.other", '무대형태 "기타" 상세를 입력해 주세요.');
    }
  }

  // [수정 2026-09-07] "기타에서 체크한 체크박스 삭제" — 마스킹 동의·안전규정 준수
  // 확약서 작성 완료 체크박스를 뺐다(안전관리 서약은 STEP6에서 별도로 받는다).
  // 화면에서 없앤 필드를 검사에 남겨 두면 아무도 체크할 수 없어 영원히 막힌다.
  if (!isSlotDisabled("credibility")) {
    if (!info.castContractStatus)
      return issue("performanceInfo.credibility.castContractStatus", "주요 출연진 계약 상태를 선택해 주세요.");
  }

  return null;
}


function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// [신규 2026-09-06] "각 슬롯 내 항목들 순서 조정 + 노출 On/off" 그룹마다 반복되던 순서
// 계산 로직을 한 곳에 모은다 — 저장된 순서(fieldOrders[groupId])가 있으면 유효한 키만
// 앞세우고 거기 없는 신규 키는 기본 순서 뒤에 그대로 붙인다(WizardShell.tsx의
// step3SlotOrder 계산과 같은 규칙). disabledFields는 "그룹id.키" 형식 문자열 목록이다.
function resolveGroupOrder<T extends string>(configured: string[] | undefined, defaultOrder: readonly T[]): T[] {
  return configured && configured.length > 0
    ? [
        ...(configured.filter((key) => (defaultOrder as readonly string[]).includes(key)) as T[]),
        ...defaultOrder.filter((key) => !configured.includes(key)),
      ]
    : [...defaultOrder];
}
// [신규 2026-09-06] "체크박스 위에 항목 레이블 자체도 노출/미노출 설정 가능해야" —
// 항목을 하나하나 끄지 않고 그룹(제목 포함) 전체를 한 번에 끌 수 있다. 어드민
// FieldOrderPanel의 "그룹 전체 노출" 토글이 groupId 자체(접미사 없이)를
// disabledFields에 넣는다 — 여기서 그걸 먼저 확인해 그룹째 비운다(항목 하나하나
// 확인할 필요가 없다).
function visibleInGroup<T extends string>(order: T[], groupId: string, disabledFields?: string[]): T[] {
  if (disabledFields?.includes(groupId)) return [];
  return order.filter((key) => !disabledFields?.includes(`${groupId}.${key}`));
}

function formatDateLabel(iso: string): string {
  const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];
  const [, m, d] = iso.split("-").map(Number);
  return `${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}(${WEEKDAY_SHORT[new Date(iso).getDay()]})`;
}

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 06/12 #1] 대관기간은 STEP1 캘린더 결과를
// 읽기 전용으로 요약해서 보여준다 — 여기서 직접 수정하지 않고 STEP 1에서 고친다.
function arenaSummary(selection: QuoteSelection): string | null {
  const dates = resolveSelectedDates(selection);
  if (dates.length === 0) return null;
  const defaults = defaultDayTags(dates, 2); // 정확한 defaultPerformanceDays는 패키지에서 오지만 요약 표시엔 실질 영향 없음
  let setup = 0;
  let performance = 0;
  let loadOut = 0;
  for (const d of dates) {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    if (tag === "PREP") setup++;
    else if (tag === "LOAD_OUT") loadOut++;
    else performance++;
  }
  const parts = [`준비${setup}`, `공연${performance}`];
  if (loadOut > 0) parts.push(`철수${loadOut}`);
  return `${formatDateLabel(dates[0])} ~ ${formatDateLabel(dates[dates.length - 1])} · ${parts.join(" · ")}`;
}

function midHallSummary(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performance = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE").length;
  const loadOut = dates.filter((d) => selection.midHallDays[d].role === "LOAD_OUT").length;
  return `${formatDateLabel(dates[0])} ~ ${formatDateLabel(dates[dates.length - 1])} · 준비${setup} · 공연${performance}${loadOut > 0 ? ` · 철수${loadOut}` : ""}`;
}

function totalShowCount(selection: QuoteSelection): number {
  const arenaDates = resolveSelectedDates(selection);
  const defaults = defaultDayTags(arenaDates, 2);
  const arenaShows = arenaDates.reduce((sum, d) => {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    return tag === "PERFORMANCE" ? sum + (selection.dayShowCounts[d] ?? 1) : sum;
  }, 0);
  const midHallShows = Object.values(selection.midHallDays).reduce(
    (sum, d) => (d.role === "PERFORMANCE" ? sum + d.shows : sum),
    0,
  );
  return arenaShows + midHallShows;
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
  fieldKey,
}: {
  label: ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
  /** [신규 2026-09-07] "미입력 필수항목 빨간색 표시 + 자동 스크롤"용 DOM 표식 —
   *  validatePerformanceInfoStep이 돌려주는 fieldKey와 매칭된다. */
  fieldKey?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-base w-full"
        data-field-key={fieldKey}
      />
    </div>
  );
}

function ReadOnlyRow({ label, value, note }: { label: ReactNode; value: string; note?: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>
      {/* h-10 로 옆에 나란히 놓이는 입력 필드(field-base)와 높이를 맞춘다(2026-08-22) */}
      <div className="flex h-10 items-center border border-border/25 bg-panel/60 px-4 text-s text-foreground">
        {value}
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: ReactNode;
  onChange: () => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-2 border px-3.5 py-2.5 text-s transition-colors",
        checked
          ? "border-foreground bg-inverse-bg text-inverse-fg"
          : "border-border-soft bg-surface text-foreground hover:border-foreground",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

const EMPTY_PAST_PERFORMANCE: PastPerformanceRecord = {
  eventName: "",
  venue: "",
  period: "",
  audience: "",
  role: "",
};

const EMPTY_ORGANIZER_ENTRY: OrganizerEntry = { role: "HOST", name: "" };
const EMPTY_ARTIST_MAIN_HISTORY: ArtistMainHistoryRecord = {
  artistName: "",
  agency: "",
  debutYear: "",
  achievements: "",
};
const EMPTY_ARTIST_RECENT_PERFORMANCE: ArtistRecentPerformanceRecord = {
  eventName: "",
  eventDate: "",
  venue: "",
  cityCountry: "",
  showCount: "",
  seatsPerShow: "",
  audience: "",
  sellRate: "",
};

// 동시 대관에서 "각각 다르게 입력"을 켰을 때 아레나/중형 두 벌을 그리기 위해
// 신청자 정보 · 공연 기본정보 · 개최 신뢰도 카드 자체를 분리했다.
// scheduleSummary가 null이면(중형 전용 사본) 대관기간/총 공연 횟수 행은 표시하지 않는다 —
// 그 값들은 아레나 쪽(원본) 카드에 이미 한 번만 나온다.
function ApplicantDetailsFields({
  info,
  onChange,
  fieldOrders,
  disabledFields,
  customOptions,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  /**
   * [신규 2026-09-06] "각 슬롯 내에 있는 각 항목들 순서 조정·노출 On/off" — 그룹id →
   * 필드 key 순서. /admin/content 화면 문구에서 편집(ScreenTextContent.wizardFieldOrders).
   */
  fieldOrders?: Record<string, string[]>;
  /** 위와 짝 — "그룹id.필드key" 형식의 끈 필드 id 목록(ScreenTextContent.wizardDisabledFields). */
  disabledFields?: string[];
  /**
   * [신규 2026-09-07] "체크박스 항목도 + 버튼 눌러서 추가" — 그룹id → 관리자가 추가한
   * 커스텀 항목 key 배열(ScreenTextContent.wizardCustomOptions). 코드에 고정된 값
   * 목록 뒤에 이어 붙는다.
   */
  customOptions?: Record<string, string[]>;
}) {
  const { t, tStr } = useWizardText();

  // [개정 2026-09-06] "담당자 정보를 한 줄짜리 반복 행으로, 행을 추가·삭제할 수 있게" —
  // 담당자(신청 담당자)·공연 운영 총괄 책임자·안전관리 총괄 책임자로 나뉘어 있던 것을
  // 담당역할/소속/담당자 성명/연락처/이메일 5개 컬럼을 가진 반복 테이블 하나로 합쳤다.
  // 기본 2행("공연 운영 총괄"·"안전 관리 총괄")은 performanceInfoDefaults.ts에서 채운다.
  // 컬럼 순서·노출 온오프는 이전과 같은 패턴(resolveGroupOrder/visibleInGroup)을 그대로 쓴다.
  const CONTACT_GROUP_ID = "performanceInfo.applicantContact";
  const CONTACT_DEFAULT_ORDER = ["role", "department", "name", "phone", "email"] as const;
  const CONTACT_COLUMN_LABELS: Record<string, string> = {
    role: tStr("performanceInfo.applicantContactRoleLabel", "담당역할"),
    department: tStr("performanceInfo.applicantContactDepartmentLabel", "소속"),
    name: tStr("performanceInfo.applicantContactNameLabel", "담당자 성명"),
    phone: tStr("performanceInfo.applicantContactPhoneLabel", "연락처"),
    email: tStr("performanceInfo.applicantContactEmailLabel", "이메일 주소"),
  };
  const contactColumnOrder = resolveGroupOrder(fieldOrders?.[CONTACT_GROUP_ID], CONTACT_DEFAULT_ORDER);
  const visibleContactColumns = visibleInGroup(contactColumnOrder, CONTACT_GROUP_ID, disabledFields);

  // [신규 2026-09-06] 신청 기업 유형 체크박스도 같은 패턴으로 순서 조정·온오프 가능하게.
  // [개정 2026-09-07] "+ 버튼으로 항목 자체를 추가" — 고정 목록 뒤에 관리자가 만든
  // 커스텀 항목을 이어 붙인다.
  const COMPANY_TYPE_GROUP_ID = "performanceInfo.applicantCompanyType";
  const companyTypeBaseOrder = [...APPLICANT_COMPANY_TYPES, ...(customOptions?.[COMPANY_TYPE_GROUP_ID] ?? [])];
  const companyTypeOrder = resolveGroupOrder(fieldOrders?.[COMPANY_TYPE_GROUP_ID], companyTypeBaseOrder);
  const visibleCompanyTypes = visibleInGroup(companyTypeOrder, COMPANY_TYPE_GROUP_ID, disabledFields);

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  const contactPersons = info.contactPersons ?? [];

  function setContactPersons(next: ContactPersonRecord[]) {
    set("contactPersons", next);
  }

  function addContactPerson() {
    setContactPersons([...contactPersons, { role: "", department: "", name: "", phone: "", email: "" }]);
  }

  function updateContactPerson(index: number, patch: Partial<ContactPersonRecord>) {
    setContactPersons(contactPersons.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeContactPerson(index: number) {
    setContactPersons(contactPersons.filter((_, i) => i !== index));
  }

  function addPastPerformance() {
    set("pastPerformances", [...info.pastPerformances, { ...EMPTY_PAST_PERFORMANCE }]);
  }

  function updatePastPerformance(index: number, patch: Partial<PastPerformanceRecord>) {
    set(
      "pastPerformances",
      info.pastPerformances.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removePastPerformance(index: number) {
    set(
      "pastPerformances",
      info.pastPerformances.filter((_, i) => i !== index),
    );
  }

  return (
    <div className="mt-6 bg-panel p-5">
      <h3 className="type-kr-heading text-h6-m">{t("performanceInfo.applicantSectionHeading", "신청자 정보")}</h3>
      <p className="mt-1 text-xs text-muted">
        {t(
          "performanceInfo.applicantSectionHint",
          "가입한 계정 정보를 기본으로 채웠습니다. 실제 계약 주체가 다르면 고쳐 주세요 — 이 신청서에만 반영되고 회원정보는 바뀌지 않습니다.",
        )}
      </p>

      <div className="mt-4 space-y-4">
        {/* [개정 2026-09-08] "대관사명·대표자명·사업자등록번호 수정이 가능하게" — 8/22 부터
            가입 계정(회사 정보)에서 가져와 읽기 전용으로만 보여줬는데, 대행사 신청처럼
            계약 주체가 계정 회사와 다른 경우가 있다. 입력칸으로 열되 값은 이 신청서
            (quotes.selection.performanceInfo)에만 저장한다 — 가입 때 진위확인한 회사
            기록은 그대로 두고, 운영자 심사 화면에서 계정 회사와 다르면 뱃지로 알린다. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={t("performanceInfo.applicantCompanyNameLabel", "대관신청사명")}
            value={info.applicantCompanyName}
            placeholder={tStr("performanceInfo.applicantCompanyNamePlaceholder", "계약 주체 상호")}
            onChange={(v) => set("applicantCompanyName", v)}
            fieldKey="performanceInfo.applicantCompanyName"
          />
          <TextField
            label={t("performanceInfo.applicantBrnLabel", "사업자등록번호")}
            value={info.applicantBusinessRegistrationNumber}
            placeholder={tStr("performanceInfo.applicantBrnPlaceholder", "000-00-00000")}
            onChange={(v) => set("applicantBusinessRegistrationNumber", v)}
            fieldKey="performanceInfo.applicantBusinessRegistrationNumber"
          />
          <TextField
            label={t("performanceInfo.applicantRepresentativeNameLabel", "대표자명")}
            value={info.applicantRepresentativeName ?? ""}
            placeholder={tStr("performanceInfo.applicantRepresentativeNamePlaceholder", "대표자 성명")}
            onChange={(v) => set("applicantRepresentativeName", v)}
            fieldKey="performanceInfo.applicantRepresentativeName"
          />
        </div>

        {/* [버그 수정 2026-09-06] "언체크해도 라벨명은 노출되잖아 — 항목 전체에 대한
            온오프가 필요" — 항목을 전부 꺼도 위 제목(라벨)만 남아 빈 줄로 보였다.
            보여줄 항목이 하나도 없으면 제목까지 통째로 숨긴다(공공/공익 참여의
            그룹 렌더링과 같은 규칙, PUBLIC_INTEREST_GROUPS 참고). */}
        {visibleCompanyTypes.length > 0 && (
          <div data-field-key="performanceInfo.applicantCompanyType">
            <div className="mb-2.5 text-xs font-bold text-muted">
              {t("performanceInfo.applicantCompanyTypeLabel", "신청 기업 유형")}
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleCompanyTypes.map((type) => (
                <CheckboxChip
                  key={type}
                  label={t(`fieldLabel.applicantCompanyType.${type}`, APPLICANT_COMPANY_TYPE_LABEL[type] ?? type)}
                  checked={info.applicantCompanyType === type}
                  onChange={() => set("applicantCompanyType", info.applicantCompanyType === type ? null : type)}
                />
              ))}
            </div>
            {/* [신규 2026-09-06] "기타 체크박스 선택 시 텍스트 기입할수 있도록" —
                무대형태·객석형태와 같은 패턴을 "모든 항목의 기타"로 일반화한다. */}
            {info.applicantCompanyType === "OTHER" && (
              <input
                value={info.applicantCompanyTypeOtherDetail ?? ""}
                placeholder={tStr("performanceInfo.applicantCompanyTypeOtherDetailPlaceholder", "기타 신청 기업 유형 설명")}
                onChange={(e) => set("applicantCompanyTypeOtherDetail", e.target.value)}
                className="field-base mt-2 w-full max-w-xs"
              />
            )}
          </div>
        )}

        <div data-field-key="performanceInfo.applicantContact">
          <div className="mb-2.5 flex items-center justify-between">
            <label className="type-kr-heading text-s text-foreground">
              {t("performanceInfo.contactPersonsLabel", "담당자 정보")}
            </label>
            <button type="button" onClick={addContactPerson} className={toggleClass(false)}>
              {t("performanceInfo.addRowButton", "＋ 행 추가")}
            </button>
          </div>
          {visibleContactColumns.length > 0 && (
            <div
              className="mb-1.5 grid gap-1.5 text-xs font-bold text-muted"
              style={{ gridTemplateColumns: `repeat(${visibleContactColumns.length}, 1fr)` }}
            >
              {visibleContactColumns.map((key) => (
                <div key={key}>{CONTACT_COLUMN_LABELS[key]}</div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {contactPersons.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5 py-2">
                <div
                  className="grid flex-1 gap-1.5"
                  style={{ gridTemplateColumns: `repeat(${visibleContactColumns.length}, 1fr)` }}
                >
                  {visibleContactColumns.map((key) => (
                    <input
                      key={key}
                      value={row[key as keyof ContactPersonRecord]}
                      placeholder={CONTACT_COLUMN_LABELS[key]}
                      onChange={(e) =>
                        updateContactPerson(i, { [key]: e.target.value } as Partial<ContactPersonRecord>)
                      }
                      className="field-base h-8 w-full"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeContactPerson(i)}
                  aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                  className={ROW_REMOVE_BTN}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2.5 flex items-center justify-between">
          <label className="type-kr-heading text-s text-foreground">
            {t("performanceInfo.pastPerformancesLabel", "대관사 최근 3년간 공연 실적")}
          </label>
          <button
            type="button"
            onClick={addPastPerformance}
            className={toggleClass(false)}
          >
            {t("performanceInfo.addRowButton", "＋ 행 추가")}
          </button>
        </div>
        {info.pastPerformances.length === 0 && (
          <p className="text-xs text-muted">
            {t("performanceInfo.pastPerformancesEmpty", "아직 등록된 실적이 없습니다.")}
          </p>
        )}
        <div className="space-y-2">
          {info.pastPerformances.map((row, i) => (
            <div key={i} className="grid grid-cols-5 gap-1.5 py-2">
              <input
                value={row.eventName}
                placeholder={tStr("performanceInfo.pastEventNamePlaceholder", "공연명")}
                onChange={(e) => updatePastPerformance(i, { eventName: e.target.value })}
                className="field-base h-8"
              />
              <input
                value={row.venue}
                placeholder={tStr("performanceInfo.pastVenuePlaceholder", "장소")}
                onChange={(e) => updatePastPerformance(i, { venue: e.target.value })}
                className="field-base h-8"
              />
              <input
                value={row.period}
                placeholder={tStr("performanceInfo.pastPeriodPlaceholder", "기간")}
                onChange={(e) => updatePastPerformance(i, { period: e.target.value })}
                className="field-base h-8"
              />
              <input
                value={row.audience}
                placeholder={tStr("performanceInfo.pastAudiencePlaceholder", "관객 수")}
                onChange={(e) => updatePastPerformance(i, { audience: e.target.value })}
                className="field-base h-8"
              />
              <div className="flex items-center gap-1">
                <input
                  value={row.role}
                  placeholder={tStr("performanceInfo.pastRolePlaceholder", "주최·주관 역할")}
                  onChange={(e) => updatePastPerformance(i, { role: e.target.value })}
                  className="field-base h-8 w-full"
                />
                <button
                  type="button"
                  onClick={() => removePastPerformance(i)}
                  aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                  className={ROW_REMOVE_BTN}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventBasicsFields({
  info,
  onChange,
  scheduleSummary,
  fieldOrders,
  disabledFields,
  customOptions,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  scheduleSummary: { arenaLine: string | null; midHallLine: string | null; showsTotal: number | null } | null;
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
  customOptions?: Record<string, string[]>;
}) {
  const { t, tStr } = useWizardText();

  // [신규 2026-09-06] "공연 기본정보"로 이어감 — 공연명/아티스트 쌍, 행사유형, 공연등급,
  // 객석형태, 무대형태도 같은 패턴(순서 조정 + 노출 On/off). 반복 입력 행(주최·주관·기획,
  // 아티스트 이력 등)은 이미 추가/삭제가 있어 이 패턴 대상에서 뺀다.
  const EVENT_BASICS_GROUP_ID = "performanceInfo.eventBasics";
  const EVENT_BASICS_DEFAULT_ORDER = ["eventName", "artist"] as const;
  const eventBasicsFieldRenderers: Record<string, () => ReactNode> = {
    eventName: () => (
      <TextField
        key="eventName"
        label={t("performanceInfo.eventNameLabel", "공연(행사)명")}
        value={info.eventName}
        onChange={(v) => set("eventName", v)}
        fieldKey="performanceInfo.eventBasics.eventName"
      />
    ),
    artist: () => (
      <TextField
        key="artist"
        label={t("performanceInfo.artistLabel", "아티스트 / 출연진")}
        value={info.artist}
        onChange={(v) => set("artist", v)}
        fieldKey="performanceInfo.eventBasics.artist"
      />
    ),
  };
  const eventBasicsOrder = resolveGroupOrder(fieldOrders?.[EVENT_BASICS_GROUP_ID], EVENT_BASICS_DEFAULT_ORDER);
  const visibleEventBasicsFields = visibleInGroup(eventBasicsOrder, EVENT_BASICS_GROUP_ID, disabledFields);

  // [개정 2026-09-07] "+ 버튼으로 항목 자체를 추가" — 아래 4개 그룹 모두 고정 목록
  // 뒤에 관리자가 만든 커스텀 항목(customOptions)을 이어 붙인다.
  const EVENT_TYPES_GROUP_ID = "performanceInfo.eventTypes";
  const eventTypesOrder = resolveGroupOrder(fieldOrders?.[EVENT_TYPES_GROUP_ID], [
    ...EVENT_TYPES,
    ...(customOptions?.[EVENT_TYPES_GROUP_ID] ?? []),
  ]);
  const visibleEventTypes = visibleInGroup(eventTypesOrder, EVENT_TYPES_GROUP_ID, disabledFields);

  const AGE_RATING_GROUP_ID = "performanceInfo.ageRating";
  const ageRatingOrder = resolveGroupOrder(fieldOrders?.[AGE_RATING_GROUP_ID], [
    ...AGE_RATINGS,
    ...(customOptions?.[AGE_RATING_GROUP_ID] ?? []),
  ]);
  const visibleAgeRatings = visibleInGroup(ageRatingOrder, AGE_RATING_GROUP_ID, disabledFields);

  const SEATING_TYPES_GROUP_ID = "performanceInfo.seatingTypes";
  const seatingTypesOrder = resolveGroupOrder(fieldOrders?.[SEATING_TYPES_GROUP_ID], [
    ...SEATING_TYPES,
    ...(customOptions?.[SEATING_TYPES_GROUP_ID] ?? []),
  ]);
  const visibleSeatingTypes = visibleInGroup(seatingTypesOrder, SEATING_TYPES_GROUP_ID, disabledFields);

  const STAGE_TYPES_GROUP_ID = "performanceInfo.stageTypes";
  const stageTypesOrder = resolveGroupOrder(fieldOrders?.[STAGE_TYPES_GROUP_ID], [
    ...STAGE_TYPES,
    ...(customOptions?.[STAGE_TYPES_GROUP_ID] ?? []),
  ]);
  const visibleStageTypes = visibleInGroup(stageTypesOrder, STAGE_TYPES_GROUP_ID, disabledFields);

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  // organizers(주최·주관·기획 반복 행) — 행이 바뀔 때마다 organizer(단일 텍스트)를
  // 함께 합성해 하위호환을 유지한다(인쇄본·관리자 화면·채점 로직이 그 문자열을 읽는다).
  const organizers = info.organizers ?? [];

  function setOrganizers(next: OrganizerEntry[]) {
    onChange({ ...info, organizers: next, organizer: deriveOrganizerSummary(next) });
  }

  function addOrganizer() {
    setOrganizers([...organizers, { ...EMPTY_ORGANIZER_ENTRY }]);
  }

  function updateOrganizer(index: number, patch: Partial<OrganizerEntry>) {
    setOrganizers(organizers.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeOrganizer(index: number) {
    setOrganizers(organizers.filter((_, i) => i !== index));
  }

  // 아티스트 이력 — ① 주요 이력, ② 최근 공연 이력(최대 3~5건 권장)
  const artistMainHistory = info.artistMainHistory ?? [];
  const artistRecentPerformances = info.artistRecentPerformances ?? [];

  function addArtistMainHistory() {
    set("artistMainHistory", [...artistMainHistory, { ...EMPTY_ARTIST_MAIN_HISTORY }]);
  }

  function updateArtistMainHistory(index: number, patch: Partial<ArtistMainHistoryRecord>) {
    set(
      "artistMainHistory",
      artistMainHistory.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeArtistMainHistory(index: number) {
    set(
      "artistMainHistory",
      artistMainHistory.filter((_, i) => i !== index),
    );
  }

  function addArtistRecentPerformance() {
    set("artistRecentPerformances", [...artistRecentPerformances, { ...EMPTY_ARTIST_RECENT_PERFORMANCE }]);
  }

  function updateArtistRecentPerformance(index: number, patch: Partial<ArtistRecentPerformanceRecord>) {
    set(
      "artistRecentPerformances",
      artistRecentPerformances.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeArtistRecentPerformance(index: number) {
    set(
      "artistRecentPerformances",
      artistRecentPerformances.filter((_, i) => i !== index),
    );
  }

  return (
    <div className="mt-6 bg-panel p-5">
      <h3 className="type-kr-heading text-h6-m">{t("performanceInfo.eventBasicsSectionHeading", "공연 기본정보")}</h3>
      <p className="mt-1 text-xs text-muted">
        {t("performanceInfo.eventBasicsSectionHint", "입력한 내용은 대관심의 및 계약서 작성에 활용됩니다")}
      </p>

      {/* 그냥 항목을 순서대로 나열하면 왜 이 둘이 한 줄인지 알 수 없어서
          (2026-08-22, "비슷한 유형끼리는 그룹핑을 해서" 피드백), 성격이 같은
          항목끼리 소제목으로 묶은 뒤 그 안에서 짝을 짓는다. 소제목 굵기만으로는
          구분이 약해서("각 구분마다 옅은 선을 추가") 그룹 사이에 옅은 구분선도 넣는다. */}
      <div className="mt-4 space-y-6">
        {/* [개정 2026-08-26] "공연개요 워딩은 삭제" 요청으로 소제목 라벨을 뺐다 —
            필드 자체는 그대로 남는다. */}
        <div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleEventBasicsFields.map((key) => (
                <Fragment key={key}>{eventBasicsFieldRenderers[key]?.()}</Fragment>
              ))}
            </div>

            {/* [개정 2026-08-26] "공연 주최, 공연 주관, 공연 기획 따로따로 별도의
                행으로 추가할수 있게" — 단일 텍스트 입력을 역할별 반복 행으로
                바꾼다. organizer(단일 텍스트)는 이 배열에서 자동 합성돼 인쇄본·
                관리자 화면과의 하위호환을 유지한다(deriveOrganizerSummary). */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="type-kr-heading text-s text-foreground">
                  {t("performanceInfo.organizerLabel", "주최 · 주관 · 기획")}
                </label>
                <button type="button" onClick={addOrganizer} className={toggleClass(false)}>
                  {t("performanceInfo.addRowButton", "＋ 행 추가")}
                </button>
              </div>
              <div className="space-y-2">
                {organizers.map((row, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-2">
                    <select
                      value={row.role}
                      onChange={(e) => updateOrganizer(i, { role: e.target.value as OrganizerRole })}
                      className="field-base h-8 w-28 shrink-0"
                    >
                      {ORGANIZER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ORGANIZER_ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                    {/* [수정 2026-09-07] "레드 선... 개별 칸들이 하이라이팅이 되어야지
                        그 영역 전체를 하나의 박스로만 하지마" — 그룹 전체를 감싸던
                        data-field-key를 빼고, 실제로 비어 있는 이름 입력칸에만 붙인다
                        (검증 조건 "하나라도 입력" 그대로, row.name 이 채워지면 이
                        속성이 사라지므로 채워진 칸은 하이라이트되지 않는다). */}
                    <input
                      value={row.name}
                      placeholder={tStr("performanceInfo.organizerNamePlaceholder", "업체명 · 단체명")}
                      onChange={(e) => updateOrganizer(i, { name: e.target.value })}
                      data-field-key={row.name.trim() ? undefined : "performanceInfo.eventBasics.organizer"}
                      className="field-base h-8 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => removeOrganizer(i)}
                      aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                      className={ROW_REMOVE_BTN}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* [신규 2026-08-26] 아티스트 이력 — artist(요약 텍스트)와는 별개로 상세
            이력을 받는다. 기본으로 한 행씩 열려 있고(INITIAL_PERFORMANCE_INFO),
            무엇을 적어야 하는지 예시 문구를 각 표 위에 안내한다(관리자가 문구
            수정 가능 — t()). */}
        <div className="border-t border-border/25 pt-6">
          <div className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">
            {t("performanceInfo.artistHistoryGroupLabel", "아티스트 이력")}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="type-kr-heading text-s text-foreground">
                {t("performanceInfo.artistMainHistoryLabel", "① 아티스트 주요 이력")}
              </label>
              <button type="button" onClick={addArtistMainHistory} className={toggleClass(false)}>
                {t("performanceInfo.addRowButton", "＋ 행 추가")}
              </button>
            </div>
            <p className="mb-2 text-xs text-muted">
              {t(
                "performanceInfo.artistMainHistoryExample",
                "예시: 아티스트명 / 소속사 / 데뷔연도 / 주요 활동 및 수상·성과",
              )}
            </p>
            <div className="space-y-2">
              {artistMainHistory.map((row, i) => (
                <div key={i} className="grid grid-cols-5 gap-1.5 py-2">
                  <input
                    value={row.artistName}
                    placeholder={tStr("performanceInfo.artistNamePlaceholder", "아티스트명")}
                    onChange={(e) => updateArtistMainHistory(i, { artistName: e.target.value })}
                    className="field-base h-8"
                  />
                  <input
                    value={row.agency}
                    placeholder={tStr("performanceInfo.agencyPlaceholder", "소속사")}
                    onChange={(e) => updateArtistMainHistory(i, { agency: e.target.value })}
                    className="field-base h-8"
                  />
                  <input
                    value={row.debutYear}
                    placeholder={tStr("performanceInfo.debutYearPlaceholder", "데뷔연도")}
                    onChange={(e) => updateArtistMainHistory(i, { debutYear: e.target.value })}
                    className="field-base h-8"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      value={row.achievements}
                      placeholder={tStr("performanceInfo.achievementsPlaceholder", "주요 활동 및 수상·성과")}
                      onChange={(e) => updateArtistMainHistory(i, { achievements: e.target.value })}
                      className="field-base h-8 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => removeArtistMainHistory(i)}
                      aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                      className={ROW_REMOVE_BTN}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <label className="type-kr-heading text-s text-foreground">
                {t("performanceInfo.artistRecentPerformancesLabel", "② 최근 공연 이력 — 최대 3~5건")}
              </label>
              <button type="button" onClick={addArtistRecentPerformance} className={toggleClass(false)}>
                {t("performanceInfo.addRowButton", "＋ 행 추가")}
              </button>
            </div>
            <p className="mb-2 text-xs text-muted">
              {t(
                "performanceInfo.artistRecentPerformancesExample",
                "예시: 공연명 / 공연일 / 공연장 / 도시·국가 / 공연 횟수 / 회당 객석 규모 / 관객 수 / 티켓 판매율",
              )}
            </p>
            <div className="space-y-2">
              {artistRecentPerformances.map((row, i) => (
                <div key={i} className="space-y-1.5 py-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    <input
                      value={row.eventName}
                      placeholder={tStr("performanceInfo.artistPastEventNamePlaceholder", "공연명")}
                      onChange={(e) => updateArtistRecentPerformance(i, { eventName: e.target.value })}
                      className="field-base h-8"
                    />
                    <input
                      value={row.eventDate}
                      placeholder={tStr("performanceInfo.artistPastEventDatePlaceholder", "공연일")}
                      onChange={(e) => updateArtistRecentPerformance(i, { eventDate: e.target.value })}
                      className="field-base h-8"
                    />
                    <input
                      value={row.venue}
                      placeholder={tStr("performanceInfo.artistPastVenuePlaceholder", "공연장")}
                      onChange={(e) => updateArtistRecentPerformance(i, { venue: e.target.value })}
                      className="field-base h-8"
                    />
                    <input
                      value={row.cityCountry}
                      placeholder={tStr("performanceInfo.artistPastCityCountryPlaceholder", "도시 · 국가")}
                      onChange={(e) => updateArtistRecentPerformance(i, { cityCountry: e.target.value })}
                      className="field-base h-8"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <input
                      value={row.showCount}
                      placeholder={tStr("performanceInfo.artistPastShowCountPlaceholder", "공연 횟수")}
                      onChange={(e) => updateArtistRecentPerformance(i, { showCount: e.target.value })}
                      className="field-base h-8"
                    />
                    <input
                      value={row.seatsPerShow}
                      placeholder={tStr("performanceInfo.artistPastSeatsPerShowPlaceholder", "회당 객석 규모")}
                      onChange={(e) => updateArtistRecentPerformance(i, { seatsPerShow: e.target.value })}
                      className="field-base h-8"
                    />
                    <input
                      value={row.audience}
                      placeholder={tStr("performanceInfo.artistPastAudiencePlaceholder", "관객 수")}
                      onChange={(e) => updateArtistRecentPerformance(i, { audience: e.target.value })}
                      className="field-base h-8"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        value={row.sellRate}
                        placeholder={tStr("performanceInfo.artistPastSellRatePlaceholder", "티켓 판매율")}
                        onChange={(e) => updateArtistRecentPerformance(i, { sellRate: e.target.value })}
                        className="field-base h-8 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeArtistRecentPerformance(i)}
                        aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                        className={ROW_REMOVE_BTN}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border/25 pt-6">
          <div className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">
            {t("performanceInfo.classificationGroupLabel", "분류")}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* [버그 수정 2026-09-06] "언체크해도 라벨명은 노출되잖아 — 항목 전체에 대한
                온오프가 필요" — 항목을 전부 꺼도 제목만 남지 않도록, 보여줄 항목이 하나도
                없으면 제목까지 통째로 숨긴다. */}
            {visibleEventTypes.length > 0 && (
              <div data-field-key="performanceInfo.eventTypes">
                <div className="mb-2.5 text-xs font-bold text-muted">
                  {t("performanceInfo.eventTypesLabel", "행사유형")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleEventTypes.map((type) => (
                    <CheckboxChip
                      key={type}
                      label={t(`fieldLabel.eventTypes.${type}`, EVENT_TYPE_LABEL[type] ?? type)}
                      checked={info.eventTypes.includes(type)}
                      onChange={() => set("eventTypes", toggleInArray(info.eventTypes, type))}
                    />
                  ))}
                </div>
              </div>
            )}

            {visibleAgeRatings.length > 0 && (
              <div data-field-key="performanceInfo.ageRating">
                <div className="mb-2.5 text-xs font-bold text-muted">
                  {t("performanceInfo.ageRatingLabel", "공연등급")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleAgeRatings.map((rating) => (
                    <CheckboxChip
                      key={rating}
                      label={t(`fieldLabel.ageRating.${rating}`, AGE_RATING_LABEL[rating] ?? rating)}
                      checked={info.ageRating === rating}
                      onChange={() => set("ageRating", info.ageRating === rating ? null : rating)}
                    />
                  ))}
                </div>
                {info.ageRating === "AGE_LIMIT" && (
                  <input
                    data-field-key="performanceInfo.ageRating.limitDetail"
                    value={info.ageLimitDetail}
                    placeholder={tStr("performanceInfo.ageLimitDetailPlaceholder", "예: 15세 이상 관람가")}
                    onChange={(e) => set("ageLimitDetail", e.target.value)}
                    className="field-base mt-2 w-full max-w-xs"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border/25 pt-6">
          <div className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">
            {t("performanceInfo.scheduleGroupLabel", "일정")}
          </div>
          <div className="space-y-4">
            {/* [신규 2026-09-09] 「셋업 추가 요청시간(선택)」 — 대관기간 줄 오른쪽 빈 칸에 넣어
                달라는 요청(팀). 아레나 단독이면 그 자리에, 동시 대관이면 중형 기간이 그 칸을
                쓰므로 다음 줄로 흐른다. 철수 완료 예정시간과 같은 자유 입력이다. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {scheduleSummary?.arenaLine && (
                <ReadOnlyRow
                  label={t("performanceInfo.arenaPeriodLabel", "대관기간 — 아레나")}
                  value={scheduleSummary.arenaLine}
                  note={t("performanceInfo.editAtScheduleNote", "수정은 일정 선택에서")}
                />
              )}
              {scheduleSummary?.midHallLine && (
                <ReadOnlyRow
                  label={t("performanceInfo.midHallPeriodLabel", "대관기간 — 중형")}
                  value={scheduleSummary.midHallLine}
                  note={t("performanceInfo.editAtScheduleNote", "수정은 일정 선택에서")}
                />
              )}
              <TextField
                label={t("performanceInfo.setupRequestTimeLabel", "셋업 추가 요청시간(선택)")}
                value={info.setupRequestTime ?? ""}
                placeholder={tStr("performanceInfo.setupRequestTimePlaceholder", "예: 전일 09:00부터")}
                onChange={(v) => set("setupRequestTime", v)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {scheduleSummary?.showsTotal != null && (
                <ReadOnlyRow
                  label={t("performanceInfo.totalShowsLabel", "총 공연 횟수")}
                  value={`${scheduleSummary.showsTotal}${tStr("performanceInfo.showsUnitAutoCalc", "회 (자동 계산)")}`}
                />
              )}
              <TextField
                label={t("performanceInfo.teardownCompletionTimeLabel", "철수 완료 예정시간(선택)")}
                value={info.teardownCompletionTime}
                placeholder={tStr("performanceInfo.teardownCompletionTimePlaceholder", "예: 당일 24:00")}
                onChange={(v) => set("teardownCompletionTime", v)}
              />
            </div>
            {/* 네이티브 date input을 다른 필드처럼 w-full로 늘리면 브라우저마다
                내부 세그먼트 사이가 벌어져 이상하게 보인다 — 앱 전역의 날짜 입력
                관례(TicketOpenPanel 등)와 같이 폭을 좁게 고정한다. */}
            <div data-field-key="performanceInfo.eventBasics.ticketOpenExpectedDate">
              <label className="mb-1.5 block text-xs font-bold text-muted">
                {t("performanceInfo.ticketOpenExpectedDateLabel", "티켓 오픈 예정일")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={
                    info.ticketOpenExpectedDate === "미정" || info.ticketOpenExpectedDate === "협의중"
                      ? ""
                      : info.ticketOpenExpectedDate
                  }
                  disabled={info.ticketOpenExpectedDate === "미정" || info.ticketOpenExpectedDate === "협의중"}
                  onChange={(e) => set("ticketOpenExpectedDate", e.target.value)}
                  className="field-base tabular-nums sm:w-52"
                />
                <button
                  type="button"
                  onClick={() =>
                    set("ticketOpenExpectedDate", info.ticketOpenExpectedDate === "미정" ? "" : "미정")
                  }
                  className={toggleClass(info.ticketOpenExpectedDate === "미정")}
                >
                  {t("performanceInfo.ticketOpenUndecided", "미정")}
                </button>
                {/* [삭제 2026-09-08] "티켓오픈예정일 옆 [협의중] 삭제" — "협의 중" 토글
                    버튼을 없앴다. "협의중" 값 자체를 날짜 없음으로 다루는 위 표시 로직은
                    남겨둔다(이 값으로 이미 저장된 옛 신청서가 깨지지 않게). */}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/25 pt-6">
          <div className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">
            {t("performanceInfo.spaceConfigGroupLabel", "공간 구성")}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {visibleSeatingTypes.length > 0 && (
                <div data-field-key="performanceInfo.seatingTypes">
                  <div className="mb-2.5 text-xs font-bold text-muted">
                    {t("performanceInfo.seatingTypesLabel", "객석형태")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleSeatingTypes.map((type) => (
                      <CheckboxChip
                        key={type}
                        label={t(`fieldLabel.seatingTypes.${type}`, SEATING_TYPE_LABEL[type] ?? type)}
                        checked={info.seatingTypes.includes(type)}
                        onChange={() => set("seatingTypes", toggleInArray(info.seatingTypes, type))}
                      />
                    ))}
                  </div>
                  {info.seatingTypes.includes("OTHER") && (
                    <input
                      value={info.seatingTypeOtherDetail ?? ""}
                      placeholder={tStr("performanceInfo.seatingTypeOtherDetailPlaceholder", "기타 객석형태 설명")}
                      onChange={(e) => set("seatingTypeOtherDetail", e.target.value)}
                      className="field-base mt-2 w-full max-w-xs"
                    />
                  )}
                </div>
              )}

            </div>

            {visibleStageTypes.length > 0 && (
              <div data-field-key="performanceInfo.stageTypes">
                <div className="mb-2.5 text-xs font-bold text-muted">
                  {t("performanceInfo.stageTypesLabel", "무대형태")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleStageTypes.map((type) => (
                    <CheckboxChip
                      key={type}
                      label={t(`fieldLabel.stageTypes.${type}`, STAGE_TYPE_LABEL[type] ?? type)}
                      checked={info.stageTypes.includes(type)}
                      onChange={() => set("stageTypes", toggleInArray(info.stageTypes, type))}
                    />
                  ))}
                </div>
                {info.stageTypes.includes("OTHER") && (
                  <input
                    value={info.stageTypeOtherDetail ?? ""}
                    placeholder={tStr("performanceInfo.stageTypeOtherDetailPlaceholder", "기타 무대형태 설명")}
                    onChange={(e) => set("stageTypeOtherDetail", e.target.value)}
                    className="field-base mt-2 w-full max-w-xs"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CredibilityFields({
  info,
  onChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
}) {
  const { t, tStr } = useWizardText();

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  return (
    <div className="mt-6 bg-panel p-5">
      <h3 className="type-kr-heading text-h6-m">
        {t("performanceInfo.credibilitySectionHeading", "개최 신뢰도 및 이력 확인")}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {t(
          "performanceInfo.credibilitySectionHint",
          "회원 유형이 '기획사 직접 신청'이면 이후 정책에 따라 이 섹션이 생략될 수 있습니다",
        )}
      </p>

      <div className="mt-4" data-field-key="performanceInfo.credibility.castContractStatus">
        <div className="mb-2.5 text-xs font-bold text-muted">
          {t("performanceInfo.castContractStatusLabel", "주요 출연진 계약 상태")}
        </div>
        <div className="flex flex-wrap gap-2">
          {CAST_CONTRACT_STATUSES.map((status) => (
            <CheckboxChip
              key={status}
              label={CAST_CONTRACT_STATUS_LABEL[status]}
              checked={info.castContractStatus === status}
              onChange={() => set("castContractStatus", info.castContractStatus === status ? null : status)}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <TextField
          label={t("performanceInfo.foreignArtistNotesLabel", "해외 아티스트 추가사항(선택)")}
          value={info.foreignArtistNotes}
          placeholder={tStr("performanceInfo.foreignArtistNotesPlaceholder", "비자 · 입국 일정 및 국내 에이전시")}
          onChange={(v) => set("foreignArtistNotes", v)}
        />
      </div>

      {/* [수정 2026-09-07] "기타에서 체크한(마스킹 동의·안전규정 준수 확약서 작성 완료)
          체크박스 삭제" — 둘 다 뺐다. 증빙 자료는 STEP7 "자료 첨부" 탭에서 한 번에
          받고, 안전관리 서약은 STEP6에서 별도로 받으므로 여기서 중복 확인하지 않는다. */}
    </div>
  );
}

// [신규 2026-09-06] "슬롯은 굵은 줄 기준" — 예전에는 신청자 정보·공연 기본정보·개최
// 신뢰도 3개 굵은 줄 구획이 StepPerformanceInfo 카드 하나 안에 고정 순서로 묶여 있었다.
// 이제 대관자 정보(ApplicantDetails)·공연 정보(EventBasics)·기타(Credibility)를 각각
// 독립된 STEP3 슬롯으로 뜯어내 "예상 관객 및 사업규모"(StepAudience)와 나란히 순서를
// 조정할 수 있게 한다(wizardSlots.ts STEP3_DEFAULT_SLOT_ORDER 참고). 자료 첨부는 이
// 화면에서 빠지고 "안전관리 서약서" 탭 맨 마지막으로 옮겨졌다(WizardShell.tsx 참고).
export function StepApplicantDetails({
  info,
  onChange,
  midHallInfo,
  onChangeMidHallInfo,
  selection,
  title,
  fieldOrders,
  disabledFields,
  customOptions,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
  title: ReactNode;
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
  customOptions?: Record<string, string[]>;
}) {
  const { t } = useWizardText();
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const midHallDifferent = isSimultaneous && midHallInfo !== null;
  // 병합 직후(공통으로 합치기)나 초기 마운트 시 activeTab이 낡은 값을 들고 있을 수 있으므로,
  // 실제로 보여줄 탭은 상태값을 그대로 믿지 않고 매 렌더 파생값으로 다시 정한다.
  const effectiveTab: VenueSplitTab = midHallDifferent ? (activeTab === "MIDHALL" ? "MIDHALL" : "ARENA") : "COMMON";

  function splitAndSelect(tab: "ARENA" | "MIDHALL") {
    // 대관신청사명·사업자등록번호는 이제 읽기 전용(계정에서 가져옴)이라, 중형 사본을
    // 빈 기본값으로 새로 만들면 고칠 방법 없이 빈칸으로 굳어버린다 — 원본(info)의
    // 계정 정보를 그대로 이어받는다(2026-08-22).
    if (!midHallDifferent) {
      onChangeMidHallInfo(
        midHallInfo ?? {
          ...INITIAL_PERFORMANCE_INFO,
          applicantCompanyName: info.applicantCompanyName,
          applicantBusinessRegistrationNumber: info.applicantBusinessRegistrationNumber,
          applicantRepresentativeName: info.applicantRepresentativeName,
        },
      );
    }
    setActiveTab(tab);
  }

  function mergeToCommon() {
    onChangeMidHallInfo(null);
    setActiveTab("COMMON");
  }

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>
      <p className="mt-3 text-s text-muted">
        {t(
          "performanceInfo.twoVenuesOneApplicationHint",
          "신청서는 두 공간을 합쳐 1건입니다. 대관기간만 공간별로 나눠 표기합니다.",
        )}
      </p>

      {isSimultaneous && (
        <VenueSplitTabBar
          midHallDifferent={midHallDifferent}
          activeTab={effectiveTab}
          onSelectTab={setActiveTab}
          onSplit={() => splitAndSelect("ARENA")}
          onMerge={mergeToCommon}
        />
      )}

      <div className="mt-6">
        {(effectiveTab === "COMMON" || effectiveTab === "ARENA") && (
          <ApplicantDetailsFields
            info={info}
            onChange={onChange}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
        {effectiveTab === "MIDHALL" && midHallInfo && (
          <ApplicantDetailsFields
            info={midHallInfo}
            onChange={onChangeMidHallInfo}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
      </div>
    </section>
  );
}

export function StepEventBasics({
  info,
  onChange,
  midHallInfo,
  onChangeMidHallInfo,
  selection,
  fieldOrders,
  disabledFields,
  customOptions,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
  customOptions?: Record<string, string[]>;
}) {
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  const arenaLine = arenaSummary(selection);
  const midHallLine = midHallSummary(selection);
  const showsTotal = totalShowCount(selection);
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";
  const midHallDifferent = isSimultaneous && midHallInfo !== null;
  const effectiveTab: VenueSplitTab = midHallDifferent ? (activeTab === "MIDHALL" ? "MIDHALL" : "ARENA") : "COMMON";

  function splitAndSelect(tab: "ARENA" | "MIDHALL") {
    if (!midHallDifferent) {
      onChangeMidHallInfo(
        midHallInfo ?? {
          ...INITIAL_PERFORMANCE_INFO,
          applicantCompanyName: info.applicantCompanyName,
          applicantBusinessRegistrationNumber: info.applicantBusinessRegistrationNumber,
          applicantRepresentativeName: info.applicantRepresentativeName,
        },
      );
    }
    setActiveTab(tab);
  }

  function mergeToCommon() {
    onChangeMidHallInfo(null);
    setActiveTab("COMMON");
  }

  return (
    <section>
      {isSimultaneous && (
        <VenueSplitTabBar
          midHallDifferent={midHallDifferent}
          activeTab={effectiveTab}
          onSelectTab={setActiveTab}
          onSplit={() => splitAndSelect("ARENA")}
          onMerge={mergeToCommon}
        />
      )}

      <div className={isSimultaneous ? "mt-6" : undefined}>
        {effectiveTab === "COMMON" && (
          <EventBasicsFields
            info={info}
            onChange={onChange}
            scheduleSummary={{ arenaLine, midHallLine: isMidHallInvolved ? midHallLine : null, showsTotal }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
        {effectiveTab === "ARENA" && (
          <EventBasicsFields
            info={info}
            onChange={onChange}
            scheduleSummary={{ arenaLine, midHallLine: null, showsTotal }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
        {effectiveTab === "MIDHALL" && midHallInfo && (
          <EventBasicsFields
            info={midHallInfo}
            onChange={onChangeMidHallInfo}
            scheduleSummary={{ arenaLine: null, midHallLine, showsTotal: null }}
            fieldOrders={fieldOrders}
            disabledFields={disabledFields}
            customOptions={customOptions}
          />
        )}
      </div>
    </section>
  );
}

export function StepCredibility({
  info,
  onChange,
  midHallInfo,
  onChangeMidHallInfo,
  selection,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
}) {
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const midHallDifferent = isSimultaneous && midHallInfo !== null;
  const effectiveTab: VenueSplitTab = midHallDifferent ? (activeTab === "MIDHALL" ? "MIDHALL" : "ARENA") : "COMMON";

  function splitAndSelect(tab: "ARENA" | "MIDHALL") {
    if (!midHallDifferent) {
      onChangeMidHallInfo(
        midHallInfo ?? {
          ...INITIAL_PERFORMANCE_INFO,
          applicantCompanyName: info.applicantCompanyName,
          applicantBusinessRegistrationNumber: info.applicantBusinessRegistrationNumber,
          applicantRepresentativeName: info.applicantRepresentativeName,
        },
      );
    }
    setActiveTab(tab);
  }

  function mergeToCommon() {
    onChangeMidHallInfo(null);
    setActiveTab("COMMON");
  }

  return (
    <section>
      {isSimultaneous && (
        <VenueSplitTabBar
          midHallDifferent={midHallDifferent}
          activeTab={effectiveTab}
          onSelectTab={setActiveTab}
          onSplit={() => splitAndSelect("ARENA")}
          onMerge={mergeToCommon}
        />
      )}

      <div className={isSimultaneous ? "mt-6" : undefined}>
        {(effectiveTab === "COMMON" || effectiveTab === "ARENA") && (
          <CredibilityFields info={info} onChange={onChange} />
        )}
        {effectiveTab === "MIDHALL" && midHallInfo && (
          <CredibilityFields info={midHallInfo} onChange={onChangeMidHallInfo} />
        )}
      </div>
    </section>
  );
}

/**
 * 자료 첨부(선택) — "신청자 정보 및 규모"(STEP 3) 맨 아래에 둔다.
 * [2026-08-24] 원래 StepPerformanceInfo 안에 있어 "신청자 정보" 필드와 StepAudience의
 * "규모" 필드 사이에 끼어 있었는데, 합친 탭의 가장 하단으로 옮겨 달라는 요청으로 별도
 * 컴포넌트로 뽑아 WizardShell에서 StepAudience 다음에 렌더한다.
 * [2026-08-23] "신청자 정보 및 규모"로 탭을 합치면서 자료 첨부 슬롯도 하나로 합쳤다
 * ("첨부파일 슬롯이 두개인데 하나 슬롯으로 합치고.. 반반해서 양쪽으로 구성해") —
 * 공연 자료(舊 신청자 정보 탭)와 객석배치도(舊 규모 탭)를 좌우 절반씩 안내하고,
 * 목록·업로드 입력은 하나만 둔다.
 */
export function StepAttachments({
  files,
  onFilesChange,
  isSimultaneous,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  isSimultaneous: boolean;
}) {
  const dialog = useDialog();
  const { t, tStr } = useWizardText();

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(selected)) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (${tStr("attachments.tooLargeSuffix", "500MB 초과")})`);
        continue;
      }
      if (file.type && !ALLOWED_MIME.has(file.type)) {
        rejected.push(`${file.name} (${tStr("attachments.unsupportedFormatSuffix", "지원하지 않는 형식")})`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) onFilesChange([...files, ...accepted]);
    if (rejected.length > 0) {
      void dialog.alert(
        `${tStr("attachments.rejectedFilesAlert", "다음 파일은 첨부할 수 없습니다:")}\n${rejected.join("\n")}`,
      );
    }
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    // 위에 선을 두지 않는다 — 첨부 목록이 파일 줄로 이미 경계를 만든다
    <section className="mt-10">
      {/* [수정 2026-09-09] "이상한" 표기 점검 — 이 제목 밑에 STEP7 두 번째 슬롯인
          "안전관리 서약서 첨부"(필수, 빨간 별표)가 함께 있어 "(선택)"이 그 필수
          항목까지 선택인 것처럼 읽혔다. 위 공연 관련 자료 자체는 여전히 선택이지만,
          그 표시는 섹션 제목이 아니라 필요하면 필드 단위로 한다. */}
      <h3 className="type-kr-heading text-h6-m">
        {t("attachments.sectionHeading", "자료 첨부")}
        <span className="ml-1 text-danger">*</span>
      </h3>
      {/* [개정 2026-08-26] "객석 배치도 첨부 영역은 삭제" 요청으로 두 항목 안내 중
          객석배치도 쪽을 뺐다 — 공연 관련 자료 안내만 남는다. */}
      <p className="mt-2 text-xs leading-5 text-muted">
        <span className="font-bold text-foreground">{t("attachments.performanceMaterialsLabel", "공연 관련 자료")}</span> —{" "}
        {t("attachments.performanceMaterialsHint", "공연기획서 · 무대 도면, 출연 계약 증빙 등")}
      </p>
      <p className="mt-2 mb-2.5 text-xs text-muted">
        {t("attachments.fileRulesHint", "PDF/이미지/문서, 파일당 최대 500MB. 신청서 제출 시 함께 업로드됩니다.")}
        {isSimultaneous &&
          ` ${t("attachments.simultaneousHint", "동시 대관은 두 공간의 자료를 각각 첨부합니다.")}`}
      </p>

      {/* [신규 2026-09-08] "자료 첨부 탭에 파일을 꼭 등록해야 넘어가게"(nora) — 필수. 비어 있으면
          WizardShell 이 「다음」을 막고 이 칸을 빨갛게 표시한다(data-field-key).
          [개정 2026-09-10] 고른 파일을 헤어라인으로 갈라 위에 늘어놓던 것을 FilePicker 안으로
          넣었다 — 흰 컨테이너 하나 안에서 파일이 위쪽에 쌓이고 버튼이 그 아래에 남는다. */}
      <div data-field-key="attachments.files" className="mt-5">
        <FilePicker
          multiple
          files={files.map((f) => ({ name: f.name, size: f.size }))}
          onRemove={removeFile}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* [삭제 2026-09-08] 안전관리계획서 단일 필수 슬롯(9/7 신규) — 운영진 요청(nora,
          "자료 첨부 탭 아래 [삭제]란 삭제")으로 뺐다. 필요한 계획서는 위 자유 첨부로 받는다. */}
    </section>
  );
}
