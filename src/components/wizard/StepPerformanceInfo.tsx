"use client";

import {
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  type EventType,
  type PerformanceInfo,
  type RetractableSeatUse,
  type SeatingType,
  type StageType,
} from "@/lib/pricing/types";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
const STAGE_TYPES = Object.keys(STAGE_TYPE_LABEL) as StageType[];
const SEATING_TYPES = Object.keys(SEATING_TYPE_LABEL) as SeatingType[];
const RETRACTABLE_USES = Object.keys(RETRACTABLE_SEAT_USE_LABEL) as RetractableSeatUse[];

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

/** 선택 칩 — 샤프 코너 1px 보더. 선택 상태는 옐로 면 + 검정 텍스트(대비 약 14:1). */
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
        "flex cursor-pointer items-center gap-2 border px-3.5 py-2.5 text-s transition-colors",
        checked
          ? "border-foreground bg-accent text-on-accent"
          : "border-border-soft bg-surface text-foreground hover:border-foreground",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-foreground"
      />
      {label}
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-muted">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-base"
      />
    </label>
  );
}

export function StepPerformanceInfo({
  info,
  onChange,
  files,
  onFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
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

  return (
    <section>
      <h2 className="type-kr-heading text-h4-m sm:text-h4">공연 정보 입력</h2>
      <p className="mt-3 max-w-2xl text-s text-muted">
        신청하실 공연(행사)에 대한 기본 정보를 입력해 주세요.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label="공연(행사)명"
          value={info.eventName}
          onChange={(v) => set("eventName", v)}
        />
        <TextField label="아티스트" value={info.artist} onChange={(v) => set("artist", v)} />
        <TextField
          label="주최·주관·기획"
          value={info.organizer}
          onChange={(v) => set("organizer", v)}
        />
        <TextField label="행사규모" value={info.eventScale} onChange={(v) => set("eventScale", v)} />
      </div>

      <div className="mt-8 border-t border-border/25 pt-5">
        <div className="mb-3 text-xs font-bold text-muted">행사유형</div>
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

      <div className="mt-6 border-t border-border/15 pt-5">
        <div className="mb-3 text-xs font-bold text-muted">무대형태</div>
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

      <div className="mt-6 border-t border-border/15 pt-5">
        <div className="mb-3 text-xs font-bold text-muted">객석형태</div>
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

      <div className="mt-6 border-t border-border/15 pt-5">
        <div className="mb-3 text-xs font-bold text-muted">수납식 객석 사용여부</div>
        <div className="flex flex-wrap gap-2">
          {RETRACTABLE_USES.map((use) => (
            <CheckboxChip
              key={use}
              label={RETRACTABLE_SEAT_USE_LABEL[use]}
              checked={info.retractableSeatUse === use}
              onChange={() =>
                set("retractableSeatUse", info.retractableSeatUse === use ? null : use)
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-8 border-t-2 border-foreground pt-5">
        <div className="text-xs font-bold text-muted">자료 첨부</div>
        <p className="mt-3 text-s text-muted">
          공연기획서, 무대 도면 등 참고자료를 첨부하세요. (PDF/이미지/문서, 파일당 최대 20MB) 신청서
          제출 시 함께 업로드됩니다.
        </p>

        {files.length > 0 && (
          <ul className="mt-5 border-t border-border/25">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-4 border-b border-border/25 py-4"
              >
                <span className="min-w-0 truncate text-s font-bold">{file.name}</span>
                <div className="flex shrink-0 items-center gap-4 text-xs text-muted tabular-nums">
                  <span>{formatSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="cursor-pointer transition-colors hover:text-danger"
                  >
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
          className="field-base mt-5 text-muted file:mr-3 file:border file:border-foreground file:bg-transparent file:px-3 file:py-1 file:text-xs file:font-bold file:text-foreground"
        />
      </div>
    </section>
  );
}
