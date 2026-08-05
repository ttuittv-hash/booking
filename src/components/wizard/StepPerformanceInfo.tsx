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

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-border bg-panel px-4 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}

export function StepPerformanceInfo({
  info,
  onChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
}) {
  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">공연 정보 입력</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        신청하실 공연(행사)에 대한 기본 정보를 입력해 주세요.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="공연(행사)명" value={info.eventName} onChange={(v) => set("eventName", v)} />
        <TextField label="아티스트" value={info.artist} onChange={(v) => set("artist", v)} />
        <TextField label="주최·주관·기획" value={info.organizer} onChange={(v) => set("organizer", v)} />
        <TextField label="행사규모" value={info.eventScale} onChange={(v) => set("eventScale", v)} />
      </div>

      <div className="mt-7">
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
    </section>
  );
}
