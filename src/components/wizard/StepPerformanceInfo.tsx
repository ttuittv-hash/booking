"use client";

import { REMOVE_ICON_BTN, RemoveIcon, toggleClass } from "@/components/ui/kit";
import { FilePicker } from "@/components/ui/FilePicker";
import { useDialog } from "@/components/ui/Dialog";

import { useState, type ReactNode } from "react";
import { useWizardText } from "@/lib/content/wizardText";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import {
  AGE_RATING_LABEL,
  APPLICANT_COMPANY_TYPE_LABEL,
  CAST_CONTRACT_STATUS_LABEL,
  EVENT_TYPE_LABEL,
  ORGANIZER_ROLE_LABEL,
  RETRACTABLE_SEAT_FLOOR_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type AgeRating,
  type ApplicantCompanyType,
  type ArtistMainHistoryRecord,
  type ArtistRecentPerformanceRecord,
  type CastContractStatus,
  type EventType,
  type OrganizerEntry,
  type OrganizerRole,
  type PastPerformanceRecord,
  type PerformanceInfo,
  type QuoteSelection,
  type ResponsiblePerson,
  type RetractableSeatFloor,
  type RetractableSeatUse,
  type SeatingType,
  type StageType,
} from "@/lib/pricing/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
const APPLICANT_COMPANY_TYPES = Object.keys(APPLICANT_COMPANY_TYPE_LABEL) as ApplicantCompanyType[];
const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[];
const SEATING_TYPES = Object.keys(SEATING_TYPE_LABEL) as SeatingType[];
const RETRACTABLE_USES = Object.keys(RETRACTABLE_SEAT_USE_LABEL) as RetractableSeatUse[];
const RETRACTABLE_FLOORS = Object.keys(RETRACTABLE_SEAT_FLOOR_LABEL) as RetractableSeatFloor[];
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
export function validatePerformanceInfoStep(info: PerformanceInfo, venueLabel?: string): string | null {
  const prefix = venueLabel ? `${venueLabel} ` : "";
  // 소속은 선택으로 바뀌어(2026-08-22, "책임자들 넣는거 소속(선택)으로해") 성명·연락처만 본다.
  const person = (value: ResponsiblePerson, label: string) => {
    if (!value.name.trim() || !value.phone.trim()) {
      return `${prefix}${label}(성명·연락처)을 모두 입력해 주세요.`;
    }
    return null;
  };

  // 대관신청사명·사업자등록번호는 더 이상 이 화면에서 입력하지 않고 가입 계정에서
  // 그대로 가져와 읽기 전용으로 보여준다(2026-08-22) — 계정 데이터라 여기서 필수값
  // 검사를 하지 않는다(비어 있다면 계정 쪽 문제다).
  if (!info.applicantCompanyType) return `${prefix}신청 기업 유형을 선택해 주세요.`;
  if (!info.applicantContactName.trim()) return `${prefix}담당자를 입력해 주세요.`;
  if (!info.applicantContactPhone.trim()) return `${prefix}담당자 연락처를 입력해 주세요.`;
  const operationsError = person(info.operationsResponsible, "공연 운영 총괄 책임자");
  if (operationsError) return operationsError;
  const safetyError = person(info.safetyResponsible, "안전관리 총괄 책임자");
  if (safetyError) return safetyError;

  if (!info.eventName.trim()) return `${prefix}공연(행사)명을 입력해 주세요.`;
  if (!info.artist.trim()) return `${prefix}아티스트 / 출연진을 입력해 주세요.`;
  // organizer(단일 텍스트)는 organizers(역할별 반복 행)에서 자동 합성되므로, 배열에 이름이
  // 하나라도 있으면 통과시킨다 — 합성 전 옛 신청서는 organizer 문자열만으로 판단한다.
  const hasOrganizerEntry = (info.organizers ?? []).some((o) => o.name.trim());
  if (!hasOrganizerEntry && !info.organizer.trim()) {
    return `${prefix}주최 · 주관 · 기획을 하나 이상 입력해 주세요.`;
  }
  if (info.eventTypes.length === 0) return `${prefix}행사유형을 하나 이상 선택해 주세요.`;
  if (!info.ageRating) return `${prefix}공연등급을 선택해 주세요.`;
  if (info.ageRating === "AGE_LIMIT" && !info.ageLimitDetail.trim()) {
    return `${prefix}연령제한 상세를 입력해 주세요.`;
  }

  if (!info.ticketOpenExpectedDate.trim()) return `${prefix}티켓 오픈 예정일을 입력해 주세요.`;

  if (info.seatingTypes.length === 0) return `${prefix}객석형태를 하나 이상 선택해 주세요.`;
  if (info.seatingTypes.includes("OTHER") && !info.seatingTypeOtherDetail?.trim()) {
    return `${prefix}객석형태 "기타" 상세를 입력해 주세요.`;
  }
  if (!info.retractableSeatUse) return `${prefix}수납식 객석 사용여부를 선택해 주세요.`;
  // [사용]을 골랐으면 층별로도 답해야 한다 — 어느 층을 펴는지에 따라 객석 구성이 달라져서
  // "사용" 한 마디만으로는 심사도 시공도 진행되지 않는다(2026-09-02).
  if (info.retractableSeatUse === "USE") {
    const floors = info.retractableSeatFloorUse ?? {};
    if (!floors.FLOOR_1 || !floors.FLOOR_3) {
      return `${prefix}수납식 객석을 사용하시면 1층·3층 각각 사용여부를 선택해 주세요.`;
    }
  }
  if (info.stageTypes.length === 0) return `${prefix}무대형태를 하나 이상 선택해 주세요.`;
  if (info.stageTypes.includes("OTHER") && !info.stageTypeOtherDetail?.trim()) {
    return `${prefix}무대형태 "기타" 상세를 입력해 주세요.`;
  }

  if (!info.castContractStatus) return `${prefix}주요 출연진 계약 상태를 선택해 주세요.`;
  if (!info.sensitiveInfoMaskingAcknowledged) {
    return `${prefix}출연 계약 증빙 마스킹 제출 허용에 동의해 주세요.`;
  }
  if (!info.safetyPledgeSigned) return `${prefix}안전규정 준수 확약서 작성 완료에 동의해 주세요.`;

  return null;
}


function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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
  const parts = [`셋업${setup}`, `공연${performance}`];
  if (loadOut > 0) parts.push(`철수${loadOut}`);
  return `${formatDateLabel(dates[0])} ~ ${formatDateLabel(dates[dates.length - 1])} · ${parts.join(" · ")}`;
}

function midHallSummary(selection: QuoteSelection): string | null {
  const dates = Object.keys(selection.midHallDays).sort();
  if (dates.length === 0) return null;
  const setup = dates.filter((d) => selection.midHallDays[d].role === "SETUP").length;
  const performance = dates.filter((d) => selection.midHallDays[d].role === "PERFORMANCE").length;
  const loadOut = dates.filter((d) => selection.midHallDays[d].role === "LOAD_OUT").length;
  return `${formatDateLabel(dates[0])} ~ ${formatDateLabel(dates[dates.length - 1])} · 셋업${setup} · 공연${performance}${loadOut > 0 ? ` · 철수${loadOut}` : ""}`;
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
}: {
  label: ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
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
      />
    </div>
  );
}

function ReadOnlyRow({ label, value, note }: { label: ReactNode; value: string; note?: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>
      {/* h-10 로 옆에 나란히 놓이는 입력 필드(field-base)와 높이를 맞춘다(2026-08-22) */}
      <div className="flex h-10 items-center rounded-btn border border-border/25 bg-panel/60 px-4 text-s text-foreground">
        {value}
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

/**
 * 라벨 옆의 물음표 — 커서를 올리면 설명이 뜬다 (2026-09-02).
 *
 * CSS 만으로 그린다(group-hover + focus-within). 상태를 들고 있으면 칸마다 리렌더가
 * 생기고, 이 화면은 입력 칸이 많아 한 글자마다 전체가 다시 그려진다.
 * 키보드로도 닿게 button 으로 두고 tabIndex 를 살린다 — 마우스 없이는 못 보는 안내가
 * 되면 안 된다.
 */
function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border-soft text-xs font-bold text-muted transition-colors hover:border-foreground hover:text-foreground"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 break-keep rounded-btn border border-border-soft bg-panel px-3 py-2 text-xs leading-5 font-normal text-foreground shadow-md group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
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
        "flex cursor-pointer items-center gap-2 rounded-btn border px-3.5 py-2.5 text-s transition-colors",
        checked
          ? "border-foreground bg-inverse-bg text-inverse-fg"
          : "border-border-soft bg-surface text-foreground hover:border-foreground",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0"
      />
      {label}
    </label>
  );
}

function ResponsiblePersonFields({
  label,
  value,
  onChange,
}: {
  label: ReactNode;
  value: ResponsiblePerson;
  onChange: (value: ResponsiblePerson) => void;
}) {
  const { tStr } = useWizardText();
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        <input
          value={value.name}
          placeholder={tStr("performanceInfo.responsiblePersonNamePlaceholder", "성명")}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="field-base w-full"
        />
        <input
          value={value.title}
          placeholder={tStr("performanceInfo.responsiblePersonTitlePlaceholder", "소속 (선택)")}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="field-base w-full"
        />
        <input
          value={value.phone}
          placeholder={tStr("performanceInfo.responsiblePersonPhonePlaceholder", "연락처")}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          className="field-base w-full"
        />
      </div>
    </div>
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
function PerformanceInfoFields({
  info,
  onChange,
  scheduleSummary,
  castContractFiles,
  onCastContractFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  scheduleSummary: { arenaLine: string | null; midHallLine: string | null; showsTotal: number | null } | null;
  // 출연 계약 증빙은 공간(아레나/중형)별로 갈리는 자료가 아니라 탭과 무관하게 같은 목록을
  // 공유한다 — 그래서 info 가 아니라 위저드 상태에서 그대로 내려온다.
  castContractFiles: File[];
  onCastContractFilesChange: (files: File[]) => void;
}) {
  const dialog = useDialog();
  const { t, tStr } = useWizardText();

  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
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
    <>
      <div className="flex flex-col gap-6">
        {/* 신청자 정보 */}
        <div className="rounded-surface bg-panel p-5">
          <h3 className="type-kr-heading text-h6-m">{t("performanceInfo.applicantSectionHeading", "신청자 정보")}</h3>
          <p className="mt-1 text-xs text-muted">
            {t("performanceInfo.applicantSectionHint", "가입한 계정 정보에서 자동으로 불러옵니다")}
          </p>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadOnlyRow
                label={t("performanceInfo.applicantCompanyNameLabel", "대관신청사명")}
                value={info.applicantCompanyName || "—"}
              />
              <ReadOnlyRow
                label={t("performanceInfo.applicantBrnLabel", "사업자등록번호")}
                value={info.applicantBusinessRegistrationNumber || "—"}
              />
              {/* [신규 2026-08-26] 대표자명 — 대관신청사명·사업자등록번호와 같은 이유로
                  가입 계정(회사 정보)에서 그대로 가져와 읽기 전용으로 보여준다. */}
              <ReadOnlyRow
                label={t("performanceInfo.applicantRepresentativeNameLabel", "대표자명")}
                value={info.applicantRepresentativeName || "—"}
              />
            </div>

            <div>
              <div className="mb-2.5 text-xs font-bold text-muted">
                {t("performanceInfo.applicantCompanyTypeLabel", "신청 기업 유형")}
              </div>
              <div className="flex flex-wrap gap-2">
                {APPLICANT_COMPANY_TYPES.map((type) => (
                  <CheckboxChip
                    key={type}
                    label={APPLICANT_COMPANY_TYPE_LABEL[type]}
                    checked={info.applicantCompanyType === type}
                    onChange={() => set("applicantCompanyType", info.applicantCompanyType === type ? null : type)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label={t("performanceInfo.applicantContactNameLabel", "담당자")}
                value={info.applicantContactName}
                onChange={(v) => set("applicantContactName", v)}
              />
              <TextField
                label={t("performanceInfo.applicantContactPhoneLabel", "담당자 연락처")}
                value={info.applicantContactPhone}
                onChange={(v) => set("applicantContactPhone", v)}
              />
            </div>
            <ResponsiblePersonFields
              label={t("performanceInfo.operationsResponsibleLabel", "공연 운영 총괄 책임자")}
              value={info.operationsResponsible}
              onChange={(v) => set("operationsResponsible", v)}
            />
            <ResponsiblePersonFields
              label={t("performanceInfo.safetyResponsibleLabel", "안전관리 총괄 책임자")}
              value={info.safetyResponsible}
              onChange={(v) => set("safetyResponsible", v)}
            />
          </div>

          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-xs font-bold text-muted">
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
                <div key={i} className="grid grid-cols-5 gap-1.5">
                  <input
                    value={row.eventName}
                    placeholder={tStr("performanceInfo.pastEventNamePlaceholder", "공연명")}
                    onChange={(e) => updatePastPerformance(i, { eventName: e.target.value })}
                    className="field-base"
                  />
                  <input
                    value={row.venue}
                    placeholder={tStr("performanceInfo.pastVenuePlaceholder", "장소")}
                    onChange={(e) => updatePastPerformance(i, { venue: e.target.value })}
                    className="field-base"
                  />
                  <input
                    value={row.period}
                    placeholder={tStr("performanceInfo.pastPeriodPlaceholder", "기간")}
                    onChange={(e) => updatePastPerformance(i, { period: e.target.value })}
                    className="field-base"
                  />
                  <input
                    value={row.audience}
                    placeholder={tStr("performanceInfo.pastAudiencePlaceholder", "관객 수")}
                    onChange={(e) => updatePastPerformance(i, { audience: e.target.value })}
                    className="field-base"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      value={row.role}
                      placeholder={tStr("performanceInfo.pastRolePlaceholder", "주최·주관 역할")}
                      onChange={(e) => updatePastPerformance(i, { role: e.target.value })}
                      className="field-base w-full"
                    />
                    <button
                      type="button"
                      onClick={() => removePastPerformance(i)}
                      aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                      className={REMOVE_ICON_BTN}
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 공연 기본정보 */}
        <div className="rounded-surface bg-panel p-5">
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
                  <TextField
                    label={t("performanceInfo.eventNameLabel", "공연(행사)명")}
                    value={info.eventName}
                    onChange={(v) => set("eventName", v)}
                  />
                  <TextField
                    label={t("performanceInfo.artistLabel", "아티스트 / 출연진")}
                    value={info.artist}
                    onChange={(v) => set("artist", v)}
                  />
                </div>

                {/* [개정 2026-08-26] "공연 주최, 공연 주관, 공연 기획 따로따로 별도의
                    행으로 추가할수 있게" — 단일 텍스트 입력을 역할별 반복 행으로
                    바꾼다. organizer(단일 텍스트)는 이 배열에서 자동 합성돼 인쇄본·
                    관리자 화면과의 하위호환을 유지한다(deriveOrganizerSummary). */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <label className="text-xs font-bold text-muted">
                      {t("performanceInfo.organizerLabel", "주최 · 주관 · 기획")}
                    </label>
                    <button type="button" onClick={addOrganizer} className={toggleClass(false)}>
                      {t("performanceInfo.addRowButton", "＋ 행 추가")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {organizers.map((row, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <select
                          value={row.role}
                          onChange={(e) => updateOrganizer(i, { role: e.target.value as OrganizerRole })}
                          className="field-base w-32 shrink-0"
                        >
                          {ORGANIZER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ORGANIZER_ROLE_LABEL[role]}
                            </option>
                          ))}
                        </select>
                        <input
                          value={row.name}
                          placeholder={tStr("performanceInfo.organizerNamePlaceholder", "업체명 · 단체명")}
                          onChange={(e) => updateOrganizer(i, { name: e.target.value })}
                          className="field-base w-full"
                        />
                        <button
                          type="button"
                          onClick={() => removeOrganizer(i)}
                          aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                          className={REMOVE_ICON_BTN}
                        >
                          <RemoveIcon />
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
                  <label className="text-xs font-bold text-muted">
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
                    <div key={i} className="grid grid-cols-5 gap-1.5">
                      <input
                        value={row.artistName}
                        placeholder={tStr("performanceInfo.artistNamePlaceholder", "아티스트명")}
                        onChange={(e) => updateArtistMainHistory(i, { artistName: e.target.value })}
                        className="field-base"
                      />
                      <input
                        value={row.agency}
                        placeholder={tStr("performanceInfo.agencyPlaceholder", "소속사")}
                        onChange={(e) => updateArtistMainHistory(i, { agency: e.target.value })}
                        className="field-base"
                      />
                      <input
                        value={row.debutYear}
                        placeholder={tStr("performanceInfo.debutYearPlaceholder", "데뷔연도")}
                        onChange={(e) => updateArtistMainHistory(i, { debutYear: e.target.value })}
                        className="field-base"
                      />
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          value={row.achievements}
                          placeholder={tStr("performanceInfo.achievementsPlaceholder", "주요 활동 및 수상·성과")}
                          onChange={(e) => updateArtistMainHistory(i, { achievements: e.target.value })}
                          className="field-base w-full"
                        />
                        <button
                          type="button"
                          onClick={() => removeArtistMainHistory(i)}
                          aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                          className={REMOVE_ICON_BTN}
                        >
                          <RemoveIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-muted">
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
                {/* 한 항목이 두 줄이라 줄 간격만으로는 어디까지가 한 항목인지 안 보인다.
                    선을 긋는 대신 항목 사이를 항목 안쪽 간격(6)보다 넉넉히 벌린다. */}
                <div className="space-y-5">
                  {artistRecentPerformances.map((row, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="grid grid-cols-4 gap-1.5">
                        <input
                          value={row.eventName}
                          placeholder={tStr("performanceInfo.artistPastEventNamePlaceholder", "공연명")}
                          onChange={(e) => updateArtistRecentPerformance(i, { eventName: e.target.value })}
                          className="field-base"
                        />
                        <input
                          value={row.eventDate}
                          placeholder={tStr("performanceInfo.artistPastEventDatePlaceholder", "공연일")}
                          onChange={(e) => updateArtistRecentPerformance(i, { eventDate: e.target.value })}
                          className="field-base"
                        />
                        <input
                          value={row.venue}
                          placeholder={tStr("performanceInfo.artistPastVenuePlaceholder", "공연장")}
                          onChange={(e) => updateArtistRecentPerformance(i, { venue: e.target.value })}
                          className="field-base"
                        />
                        <input
                          value={row.cityCountry}
                          placeholder={tStr("performanceInfo.artistPastCityCountryPlaceholder", "도시 · 국가")}
                          onChange={(e) => updateArtistRecentPerformance(i, { cityCountry: e.target.value })}
                          className="field-base"
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <input
                          value={row.showCount}
                          placeholder={tStr("performanceInfo.artistPastShowCountPlaceholder", "공연 횟수")}
                          onChange={(e) => updateArtistRecentPerformance(i, { showCount: e.target.value })}
                          className="field-base"
                        />
                        <input
                          value={row.seatsPerShow}
                          placeholder={tStr("performanceInfo.artistPastSeatsPerShowPlaceholder", "회당 객석 규모")}
                          onChange={(e) => updateArtistRecentPerformance(i, { seatsPerShow: e.target.value })}
                          className="field-base"
                        />
                        <input
                          value={row.audience}
                          placeholder={tStr("performanceInfo.artistPastAudiencePlaceholder", "관객 수")}
                          onChange={(e) => updateArtistRecentPerformance(i, { audience: e.target.value })}
                          className="field-base"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            value={row.sellRate}
                            placeholder={tStr("performanceInfo.artistPastSellRatePlaceholder", "티켓 판매율")}
                            onChange={(e) => updateArtistRecentPerformance(i, { sellRate: e.target.value })}
                            className="field-base w-full"
                          />
                          <button
                            type="button"
                            onClick={() => removeArtistRecentPerformance(i)}
                            aria-label={tStr("performanceInfo.removeRowAriaLabel", "삭제")}
                            className={REMOVE_ICON_BTN}
                          >
                            <RemoveIcon />
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
                <div>
                  <div className="mb-2.5 text-xs font-bold text-muted">
                    {t("performanceInfo.eventTypesLabel", "행사유형")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((type) => (
                      <CheckboxChip
                        key={type}
                        label={EVENT_TYPE_LABEL[type]}
                        checked={info.eventTypes.includes(type)}
                        onChange={() => set("eventTypes", toggleInArray(info.eventTypes, type))}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 text-xs font-bold text-muted">
                    {t("performanceInfo.ageRatingLabel", "공연등급")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AGE_RATINGS.map((rating) => (
                      <CheckboxChip
                        key={rating}
                        label={AGE_RATING_LABEL[rating]}
                        checked={info.ageRating === rating}
                        onChange={() => set("ageRating", info.ageRating === rating ? null : rating)}
                      />
                    ))}
                  </div>
                  {info.ageRating === "AGE_LIMIT" && (
                    <input
                      value={info.ageLimitDetail}
                      placeholder={tStr("performanceInfo.ageLimitDetailPlaceholder", "예: 15세 이상 관람가")}
                      onChange={(e) => set("ageLimitDetail", e.target.value)}
                      className="field-base mt-2 w-full max-w-xs"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border/25 pt-6">
              <div className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">
                {t("performanceInfo.scheduleGroupLabel", "일정")}
              </div>
              <div className="space-y-4">
                {(scheduleSummary?.arenaLine || scheduleSummary?.midHallLine) && (
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
                  </div>
                )}
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
                <div>
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
                    <button
                      type="button"
                      onClick={() =>
                        set("ticketOpenExpectedDate", info.ticketOpenExpectedDate === "협의중" ? "" : "협의중")
                      }
                      className={toggleClass(info.ticketOpenExpectedDate === "협의중")}
                    >
                      {t("performanceInfo.ticketOpenInDiscussion", "협의 중")}
                    </button>
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
                  <div>
                    <div className="mb-2.5 text-xs font-bold text-muted">
                      {t("performanceInfo.seatingTypesLabel", "객석형태")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SEATING_TYPES.map((type) => (
                        <CheckboxChip
                          key={type}
                          label={SEATING_TYPE_LABEL[type]}
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

                  <div>
                    <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-muted">
                      {t("performanceInfo.retractableSeatUseLabel", "수납식 객석 사용여부")}
                      {/* 물음표에 커서를 올리면 설명이 뜬다(2026-09-02) — 라벨 옆에 다 적으면
                          줄이 길어지고, 안 적으면 무엇을 묻는지 모른 채 고르게 된다. */}
                      <HelpTip
                        text={tStr(
                          "performanceInfo.retractableSeatUseHelp",
                          "1층·3층에 각각 수납식 객석이 있습니다. 접어 두면 플로어 스탠딩 면적이 늘고, 펴면 지정석이 늘어납니다. 사용을 고르시면 층별로 다시 여쭙니다.",
                        )}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {RETRACTABLE_USES.map((use) => (
                        <CheckboxChip
                          key={use}
                          label={RETRACTABLE_SEAT_USE_LABEL[use]}
                          checked={info.retractableSeatUse === use}
                          onChange={() => {
                            const next = info.retractableSeatUse === use ? null : use;
                            // [미사용]·해제로 돌아가면 층별 답을 지운다 — 안 그러면 화면에서
                            // 사라진 값이 제출까지 따라간다.
                            onChange({
                              ...info,
                              retractableSeatUse: next,
                              retractableSeatFloorUse: next === "USE" ? info.retractableSeatFloorUse : undefined,
                            });
                          }}
                        />
                      ))}
                    </div>

                    {info.retractableSeatUse === "USE" && (
                      <div className="mt-3 space-y-2.5 border-l-2 border-border-soft pl-3">
                        {RETRACTABLE_FLOORS.map((floor) => (
                          <div key={floor}>
                            <div className="mb-1.5 text-xs text-muted">
                              {RETRACTABLE_SEAT_FLOOR_LABEL[floor]}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {RETRACTABLE_USES.map((use) => (
                                <CheckboxChip
                                  key={use}
                                  label={RETRACTABLE_SEAT_USE_LABEL[use]}
                                  checked={info.retractableSeatFloorUse?.[floor] === use}
                                  onChange={() => {
                                    const current = info.retractableSeatFloorUse ?? {};
                                    const next = { ...current };
                                    if (next[floor] === use) delete next[floor];
                                    else next[floor] = use;
                                    set("retractableSeatFloorUse", next);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 text-xs font-bold text-muted">
                    {t("performanceInfo.stageTypesLabel", "무대형태")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STAGE_TYPES.map((type) => (
                      <CheckboxChip
                        key={type}
                        label={STAGE_TYPE_LABEL[type]}
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-surface bg-panel p-5">
        <h3 className="type-kr-heading text-h6-m">
          {t("performanceInfo.credibilitySectionHeading", "개최 신뢰도 및 이력 확인")}
        </h3>
        <p className="mt-1 text-xs text-muted">
          {t(
            "performanceInfo.credibilitySectionHint",
            "회원 유형이 '기획사 직접 신청'이면 이후 정책에 따라 이 섹션이 생략될 수 있습니다",
          )}
        </p>

        <div className="mt-4">
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

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={info.sensitiveInfoMaskingAcknowledged}
            onChange={(e) => set("sensitiveInfoMaskingAcknowledged", e.target.checked)}
            className="mt-0.5"
          />
          {t(
            "performanceInfo.maskingAcknowledgedLabel",
            "출연 계약 증빙(계약서 · 출연확약서)의 금액 · 개인정보는 마스킹 제출을 허용합니다.",
          )}
        </label>

        {/* [신규 2026-08-27] 증빙을 "허용합니다"라고 동의만 받고 낼 자리가 없었다 —
            바로 이 자리에서 첨부한다. 신청서 제출 시 다른 첨부와 함께 올라가 상세 화면의
            첨부서류 목록에 들어간다. */}
        <div className="mt-4">
          <p className="mb-2.5 text-xs leading-5 text-muted">
            {t(
              "performanceInfo.castContractFilesHint",
              "계약서 · 출연확약서 등. PDF/이미지/문서, 파일당 최대 500MB. 금액 · 개인정보는 가려서 올리셔도 됩니다.",
            )}
          </p>
          <FilePicker
            label={t("performanceInfo.castContractFilesLabel", "출연 계약 증빙 첨부(선택)")}
            multiple
            testId="cast-contract-files"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []).filter((f) => f.size <= MAX_FILE_SIZE);
              if (picked.length > 0) onCastContractFilesChange([...castContractFiles, ...picked]);
              if (picked.length < (e.target.files?.length ?? 0)) {
                void dialog.alert(tStr("performanceInfo.castContractTooLarge", "500MB를 넘는 파일은 첨부할 수 없습니다."));
              }
              e.target.value = "";
            }}
            files={castContractFiles}
            onRemove={(i) => onCastContractFilesChange(castContractFiles.filter((_, j) => j !== i))}
          />
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={info.safetyPledgeSigned}
            onChange={(e) => set("safetyPledgeSigned", e.target.checked)}
            className="mt-0.5"
          />
          {t("performanceInfo.safetyPledgeSignedLabel", "안전규정 준수 확약서 작성을 완료했습니다.")}
        </label>
      </div>
    </>
  );
}


export function StepPerformanceInfo({
  info,
  onChange,
  midHallInfo,
  onChangeMidHallInfo,
  selection,
  title,
  castContractFiles,
  onCastContractFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  selection: QuoteSelection;
  title: ReactNode;
  castContractFiles: File[];
  onCastContractFilesChange: (files: File[]) => void;
}) {
  const { t } = useWizardText();
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  const arenaLine = arenaSummary(selection);
  const midHallLine = midHallSummary(selection);
  const showsTotal = totalShowCount(selection);
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";
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
        {effectiveTab === "COMMON" && (
          <PerformanceInfoFields
            info={info}
            onChange={onChange}
            scheduleSummary={{ arenaLine, midHallLine: isMidHallInvolved ? midHallLine : null, showsTotal }}
            castContractFiles={castContractFiles}
            onCastContractFilesChange={onCastContractFilesChange}
          />
        )}
        {effectiveTab === "ARENA" && (
          <PerformanceInfoFields
            info={info}
            onChange={onChange}
            scheduleSummary={{ arenaLine, midHallLine: null, showsTotal }}
            castContractFiles={castContractFiles}
            onCastContractFilesChange={onCastContractFilesChange}
          />
        )}
        {effectiveTab === "MIDHALL" && midHallInfo && (
          <PerformanceInfoFields
            info={midHallInfo}
            onChange={onChangeMidHallInfo}
            scheduleSummary={{ arenaLine: null, midHallLine, showsTotal: null }}
            castContractFiles={castContractFiles}
            onCastContractFilesChange={onCastContractFilesChange}
          />
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
    <section className="mt-10 rounded-surface bg-panel p-5">
      <h3 className="type-kr-heading text-h6-m">{t("attachments.sectionHeading", "자료 첨부(선택)")}</h3>
      {/* [개정 2026-08-26] "객석 배치도 첨부 영역은 삭제" 요청으로 두 항목 안내 중
          객석배치도 쪽을 뺐다 — 공연 관련 자료 안내만 남는다. */}
      <p className="mt-2 text-xs leading-5 text-muted">
        {t(
          "attachments.performanceMaterialsHint",
          "공연기획서 · 무대 도면, 출연 계약 증빙, 행사 안전관리계획서 등",
        )}
      </p>
      <p className="mt-2 mb-2.5 text-xs text-muted">
        {t("attachments.fileRulesHint", "PDF/이미지/문서, 파일당 최대 500MB. 신청서 제출 시 함께 업로드됩니다.")}
        {isSimultaneous &&
          ` ${t("attachments.simultaneousHint", "동시 대관은 두 공간의 자료를 각각 첨부합니다.")}`}
      </p>

      <FilePicker
        label={t("attachments.performanceMaterialsLabel", "공연 관련 자료")}
        multiple
        className="mt-5"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
        files={files}
        onRemove={removeFile}
      />
    </section>
  );
}
