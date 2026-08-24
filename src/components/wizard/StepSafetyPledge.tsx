"use client";

import { useRef } from "react";
import { btnClass } from "@/components/ui/kit";
import type { SafetyPledge } from "@/lib/pricing/types";
import { SignaturePad } from "./SignaturePad";
import { StepHeading } from "./StepHeading";

type PledgeCheckKey = keyof Omit<SafetyPledge, "signature">;

// [개정 2026-08-23, 목업 반영] 4개 → 6개 항목 + "미준수 시 조치 동의" 1개(총 7개)로
// 확장했다. 마지막 항목은 조치 내용을 스스로 밝히는 동의 조항이라 굵게 강조한다.
const PLEDGE_ITEMS: { key: PledgeCheckKey; label: string; emphasize?: boolean }[] = [
  {
    key: "safetyStructure",
    label:
      "공연장 안전관리 가이드를 준수하고, 재해대책계획 및 안전관리계획 수립, 안전관리 책임자 지정 등 필요한 안전관리 체계를 구성하겠습니다.",
  },
  {
    key: "legalInspection",
    label:
      "염, 전기안전, 임시구조물, 특수효과 등 공연·행사에 필요한 법정 안전검사 및 관련 서류를 정해진 기한 내 완료·제출하겠습니다.",
  },
  {
    key: "staffSafetyTraining",
    label:
      "출연자 및 스태프 등 공연 관계자가 관련 법령에 따른 안전교육을 이수하도록 하고, 행사 당일 비상대피훈련 등 필요한 안전조치를 이행하겠습니다.",
  },
  {
    key: "followVenueGuidance",
    label:
      "공연의 기술·운영과 관련하여 서울아레나의 안전 가이드 및 담당자의 안내와 지시를 준수하며, 안전상 필요한 경우 공연 지연·중단 또는 시설 사용 제한 등의 조치에 협조하겠습니다.",
  },
  {
    key: "audienceSafetyMeasures",
    label:
      "승인된 수용인원과 객석 운영 기준을 준수하고, 스탠딩 관객 밀집 관리 및 이동약자 관람 환경 확보 등 관객 안전에 필요한 조치를 이행하겠습니다.",
  },
  {
    key: "insuranceCoverage",
    label:
      "공연장 운영에 필요한 영업배상책임보험·단체상해보험 등 관련 보험에 가입하고, 공연·행사로 인한 시설 손상 및 제3자 피해 등에 대한 책임을 부담하겠습니다.",
  },
  {
    key: "consequenceAcknowledged",
    label:
      "위 사항을 준수하지 않을 경우 서울아레나 대관규약에 따라 시설 사용 제한, 대관 계약 해지 또는 향후 대관 신청 제한 등의 조치가 이루어질 수 있음에 동의합니다.",
    emphasize: true,
  },
];

// 서약 항목 7개를 전부 체크하고 서명, 제출 서류(안전관리계획서·출연자 계약서) 2건을
// 모두 채워야 다음 단계로 넘어간다(2026-08-22, "안전관리 서약서는 무조건 체크하고
// 서명해야지 다음단계로 넘어감 => 필수" · 2026-08-23 목업에서 제출 서류 2건 필수로 추가).
export function validateSafetyPledgeStep(
  pledge: SafetyPledge,
  files?: { safetyPlanFile: File | null; castContractFile: File | null },
): string | null {
  const unchecked = PLEDGE_ITEMS.some((item) => !pledge[item.key]);
  if (unchecked) return "안전관리 서약 항목을 모두 체크해 주세요.";
  if (!pledge.signature.trim()) return "서명란에 서명해 주세요.";
  if (files && !files.safetyPlanFile) return "공연·행사 안전관리계획서를 업로드해 주세요.";
  if (files && !files.castContractFile) return "출연자 계약서를 업로드해 주세요.";
  return null;
}

function FileSlot({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <span className="text-s font-bold text-foreground">
          {label} <span className="text-danger">*</span>
        </span>
        {file && <p className="mt-0.5 truncate text-xs text-muted">{file.name}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${btnClass("primary", "sm")} shrink-0`}
      >
        업로드
      </button>
    </div>
  );
}

export function StepSafetyPledge({
  pledge,
  onChange,
  safetyPlanFile,
  onSafetyPlanFileChange,
  castContractFile,
  onCastContractFileChange,
}: {
  pledge: SafetyPledge;
  onChange: (pledge: SafetyPledge) => void;
  safetyPlanFile: File | null;
  onSafetyPlanFileChange: (file: File | null) => void;
  castContractFile: File | null;
  onCastContractFileChange: (file: File | null) => void;
}) {
  const allChecked = PLEDGE_ITEMS.every((item) => pledge[item.key]);

  // 항목을 하나씩 다 누르기 번거롭다는 요청(2026-08-23, "체크박스 다 체크하기
  // 귀찮으니.. 전체 동의 체크박스를 하나 추가해줘")에 따른 일괄 체크. 다시 누르면
  // 전부 해제된다 — 일부만 체크된 상태에서 눌러도 "전체 동의"로 확실히 밀어준다.
  function toggleAll(checked: boolean) {
    const next = { ...pledge };
    for (const item of PLEDGE_ITEMS) next[item.key] = checked;
    onChange(next);
  }

  return (
    <section>
      <StepHeading
        title="안전관리 서약서"
        lead="공연 안전 관리를 위한 서약 항목을 확인하고 동의해 주세요."
      />

      <label className="mt-8 flex cursor-pointer items-center gap-2.5 border border-border bg-panel px-5 py-3.5">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-s font-bold text-foreground">전체 동의</span>
      </label>

      <div className="border border-t-0 border-border">
        {PLEDGE_ITEMS.map((item, i) => (
          <label
            key={item.key}
            className={[
              "flex cursor-pointer items-start gap-3 px-5 py-4",
              i > 0 ? "border-t border-border" : "",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={pledge[item.key]}
              onChange={(e) => onChange({ ...pledge, [item.key]: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span className={`text-s leading-6 ${item.emphasize ? "font-bold text-foreground" : "text-foreground"}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <label className="block text-s font-bold text-foreground">서명</label>
        <p className="mt-1 mb-2 text-xs text-muted">담당자 본인이 아래 캔버스에 직접 서명해 주세요.</p>
        <SignaturePad
          value={pledge.signature}
          onChange={(signature) => onChange({ ...pledge, signature })}
        />
      </div>

      <div className="mt-8 border-t border-border/25 pt-5">
        <h3 className="type-kr-heading text-h6-m">제출 서류</h3>
        <p className="mt-1 mb-4 break-keep text-xs leading-6 text-muted">
          아래 서류를 준비해 각각 업로드해 주세요.
        </p>
        <div className="border border-border">
          <FileSlot
            label="공연·행사 안전관리계획서"
            file={safetyPlanFile}
            onChange={onSafetyPlanFileChange}
          />
          <div className="border-t border-border">
            <FileSlot label="출연자 계약서" file={castContractFile} onChange={onCastContractFileChange} />
          </div>
        </div>
      </div>
    </section>
  );
}
