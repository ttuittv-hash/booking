"use client";

import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import {
  AGE_RATING_LABEL,
  CAST_CONTRACT_STATUS_LABEL,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type AgeRating,
  type CastContractStatus,
  type EventType,
  type PastPerformanceRecord,
  type PerformanceInfo,
  type QuoteSelection,
  type ResponsiblePerson,
  type RetractableSeatUse,
  type SeatingType,
  type StageType,
} from "@/lib/pricing/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[];
const SEATING_TYPES = Object.keys(SEATING_TYPE_LABEL) as SeatingType[];
const RETRACTABLE_USES = Object.keys(RETRACTABLE_SEAT_USE_LABEL) as RetractableSeatUse[];
const AGE_RATINGS = Object.keys(AGE_RATING_LABEL) as AgeRating[];
const CAST_CONTRACT_STATUSES = Object.keys(CAST_CONTRACT_STATUS_LABEL) as CastContractStatus[];

// 신청서 제출(POST /api/quotes)이 성공한 뒤 /api/quotes/[id]/attachments로 업로드되므로,
// 서버 쪽 검증 기준(src/app/api/quotes/[id]/attachments/route.ts)과 동일하게 맞춘다.
const MAX_FILE_SIZE = 20 * 1024 * 1024;
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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
  const performance = dates.length - setup;
  return `${formatDateLabel(dates[0])} ~ ${formatDateLabel(dates[dates.length - 1])} · 셋업${setup} · 공연${performance}`;
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
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-border bg-panel px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

function ReadOnlyRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</label>
      <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
        {value}
      </div>
      {note && <p className="mt-1 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2.5 text-[13px] transition-colors",
        checked ? "border-accent bg-accent-soft text-foreground" : "border-border bg-panel hover:border-accent/50",
      ].join(" ")}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-accent" />
      {label}
    </label>
  );
}

function ResponsiblePersonFields({
  label,
  thirdFieldLabel,
  value,
  onChange,
}: {
  label: string;
  thirdFieldLabel: string;
  value: ResponsiblePerson;
  onChange: (value: ResponsiblePerson) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        <input
          value={value.name}
          placeholder="성명"
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="w-full rounded-sm border border-border bg-panel px-3 py-2.5 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <input
          value={value.title}
          placeholder={thirdFieldLabel === "소속" ? "소속" : "직책"}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="w-full rounded-sm border border-border bg-panel px-3 py-2.5 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <input
          value={value.phone}
          placeholder="연락처"
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          className="w-full rounded-sm border border-border bg-panel px-3 py-2.5 text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
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

export function StepPerformanceInfo({
  info,
  onChange,
  selection,
  files,
  onFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  selection: QuoteSelection;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(selected)) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (20MB 초과)`);
        continue;
      }
      if (file.type && !ALLOWED_MIME.has(file.type)) {
        rejected.push(`${file.name} (지원하지 않는 형식)`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) onFilesChange([...files, ...accepted]);
    if (rejected.length > 0) {
      window.alert(`다음 파일은 첨부할 수 없습니다:\n${rejected.join("\n")}`);
    }
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
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

  const arenaLine = arenaSummary(selection);
  const midHallLine = midHallSummary(selection);
  const showsTotal = totalShowCount(selection);
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">STEP 3-1 · 신청자 정보 · 공연 기본정보</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        신청서는 두 공간을 합쳐 1건입니다. 대관기간만 공간별로 나눠 표기합니다.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {/* 신청자 정보 */}
        <div className="rounded-sm border border-border bg-panel/30 p-6">
          <h3 className="text-[15px] font-semibold">신청자 정보</h3>
          <p className="mt-1 text-[12px] text-muted">회원정보에서 자동 입력 · 수정 가능</p>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="대관신청사명"
                value={info.applicantCompanyName}
                onChange={(v) => set("applicantCompanyName", v)}
              />
              <TextField
                label="사업자등록번호"
                value={info.applicantBusinessRegistrationNumber}
                onChange={(v) => set("applicantBusinessRegistrationNumber", v)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="담당자"
                value={info.applicantContactName}
                onChange={(v) => set("applicantContactName", v)}
              />
              <TextField
                label="담당자 연락처"
                value={info.applicantContactPhone}
                onChange={(v) => set("applicantContactPhone", v)}
              />
            </div>
            <ResponsiblePersonFields
              label="공연 운영 총괄 책임자"
              thirdFieldLabel="직책"
              value={info.operationsResponsible}
              onChange={(v) => set("operationsResponsible", v)}
            />
            <ResponsiblePersonFields
              label="안전관리 총괄 책임자"
              thirdFieldLabel="소속"
              value={info.safetyResponsible}
              onChange={(v) => set("safetyResponsible", v)}
            />
          </div>

          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-[12.5px] font-medium text-muted">대관사 최근 3년간 공연 실적</label>
              <button
                type="button"
                onClick={addPastPerformance}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                ＋ 행 추가
              </button>
            </div>
            {info.pastPerformances.length === 0 && (
              <p className="text-[12.5px] text-muted">아직 등록된 실적이 없습니다.</p>
            )}
            <div className="space-y-2">
              {info.pastPerformances.map((row, i) => (
                <div key={i} className="grid grid-cols-5 gap-1.5 rounded-sm border border-border bg-panel/40 p-2">
                  <input
                    value={row.eventName}
                    placeholder="공연명"
                    onChange={(e) => updatePastPerformance(i, { eventName: e.target.value })}
                    className="rounded-sm border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                  />
                  <input
                    value={row.venue}
                    placeholder="장소"
                    onChange={(e) => updatePastPerformance(i, { venue: e.target.value })}
                    className="rounded-sm border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                  />
                  <input
                    value={row.period}
                    placeholder="기간"
                    onChange={(e) => updatePastPerformance(i, { period: e.target.value })}
                    className="rounded-sm border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                  />
                  <input
                    value={row.audience}
                    placeholder="관객 수"
                    onChange={(e) => updatePastPerformance(i, { audience: e.target.value })}
                    className="rounded-sm border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      value={row.role}
                      placeholder="주최·주관 역할"
                      onChange={(e) => updatePastPerformance(i, { role: e.target.value })}
                      className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => removePastPerformance(i)}
                      aria-label="삭제"
                      className="shrink-0 text-[11px] text-muted hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 공연 기본정보 */}
        <div className="rounded-sm border border-border bg-panel/30 p-6">
          <h3 className="text-[15px] font-semibold">공연 기본정보</h3>
          <p className="mt-1 text-[12px] text-muted">입력한 내용은 대관심의 및 계약서 작성에 활용됩니다</p>

          <div className="mt-4 space-y-4">
            <TextField label="공연(행사)명" value={info.eventName} onChange={(v) => set("eventName", v)} />
            <TextField label="아티스트 / 출연진" value={info.artist} onChange={(v) => set("artist", v)} />
            <TextField label="주최 · 주관 · 기획" value={info.organizer} onChange={(v) => set("organizer", v)} />

            {arenaLine && <ReadOnlyRow label="대관기간 — 아레나" value={arenaLine} note="수정은 STEP 1(공간·일정)에서" />}
            {isMidHallInvolved && midHallLine && (
              <ReadOnlyRow label="대관기간 — 중형" value={midHallLine} note="수정은 STEP 1(공간·일정)에서" />
            )}
            <ReadOnlyRow label="총 공연 횟수" value={`${showsTotal}회 (자동 계산)`} />

            <TextField label="행사규모" value={info.eventScale} onChange={(v) => set("eventScale", v)} />
          </div>

          <div className="mt-6">
            <div className="mb-2.5 text-[12.5px] font-medium text-muted">행사유형</div>
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

          <div className="mt-6">
            <div className="mb-2.5 text-[12.5px] font-medium text-muted">공연등급</div>
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
                placeholder="예: 15세 이상 관람가"
                onChange={(e) => set("ageLimitDetail", e.target.value)}
                className="mt-2 w-full max-w-xs rounded-sm border border-border bg-panel px-3.5 py-2 text-[13px] outline-none focus:border-accent"
              />
            )}
          </div>

          <div className="mt-6">
            <div className="mb-2.5 text-[12.5px] font-medium text-muted">객석형태</div>
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
          </div>

          <div className="mt-6">
            <div className="mb-2.5 text-[12.5px] font-medium text-muted">무대형태</div>
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
          </div>

          <div className="mt-6">
            <div className="mb-2.5 text-[12.5px] font-medium text-muted">수납식 객석 사용여부</div>
            <div className="flex flex-wrap gap-2">
              {RETRACTABLE_USES.map((use) => (
                <CheckboxChip
                  key={use}
                  label={RETRACTABLE_SEAT_USE_LABEL[use]}
                  checked={info.retractableSeatUse === use}
                  onChange={() => set("retractableSeatUse", info.retractableSeatUse === use ? null : use)}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="철수 완료 예정시간"
              value={info.teardownCompletionTime}
              placeholder="예: 당일 24:00"
              onChange={(v) => set("teardownCompletionTime", v)}
            />
            <TextField
              label="티켓 오픈 예정일"
              type="date"
              value={info.ticketOpenExpectedDate}
              onChange={(v) => set("ticketOpenExpectedDate", v)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-sm border border-border bg-panel/30 p-6">
        <h3 className="text-[15px] font-semibold">개최 신뢰도 및 이력 확인</h3>
        <p className="mt-1 text-[12px] text-muted">회원 유형이 &lsquo;기획사 직접 신청&rsquo;이면 이후 정책에 따라 이 섹션이 생략될 수 있습니다</p>

        <div className="mt-4">
          <div className="mb-2.5 text-[12.5px] font-medium text-muted">주요 출연진 계약 상태</div>
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
            label="해외 아티스트 추가사항"
            value={info.foreignArtistNotes}
            placeholder="비자 · 입국 일정 및 국내 에이전시"
            onChange={(v) => set("foreignArtistNotes", v)}
          />
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={info.sensitiveInfoMaskingAcknowledged}
            onChange={(e) => set("sensitiveInfoMaskingAcknowledged", e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          출연 계약 증빙(계약서 · 출연확약서)의 금액 · 개인정보는 마스킹 제출을 허용합니다.
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={info.safetyPledgeSigned}
            onChange={(e) => set("safetyPledgeSigned", e.target.checked)}
            className="mt-0.5 accent-accent"
          />
          안전규정 준수 확약서 작성을 완료했습니다.
        </label>
      </div>

      <div className="mt-6 rounded-sm border border-border bg-panel/30 p-6">
        <h3 className="text-[15px] font-semibold">자료 첨부</h3>
        <p className="mt-1 mb-2.5 text-[12px] text-muted">
          공연기획서 · 무대 도면, 출연 계약 증빙, 행사 안전관리계획서 등을 첨부하세요. (PDF/이미지/문서,
          파일당 최대 20MB) 신청서 제출 시 함께 업로드됩니다.
          {isSimultaneous && " 동시 대관은 두 공간의 배치도를 각각 첨부합니다."}
        </p>

        {files.length > 0 && (
          <ul className="mb-3 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded border border-border bg-panel px-3.5 py-2.5"
              >
                <span className="truncate text-[13px] font-medium">{file.name}</span>
                <div className="flex shrink-0 items-center gap-3 text-[11.5px] text-muted">
                  <span>{formatSize(file.size)}</span>
                  <button type="button" onClick={() => removeFile(i)} className="hover:text-red-600">
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <input
          type="file"
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
          className="text-[12.5px] text-muted file:mr-3 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
        />
      </div>
    </section>
  );
}
