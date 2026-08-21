"use client";

import type { SafetyPledge } from "@/lib/pricing/types";
import { StepHeading } from "./StepHeading";

const PLEDGE_ITEMS: { key: keyof Omit<SafetyPledge, "signature">; label: string }[] = [
  { key: "fireSafety", label: "화재 예방 및 비상 대피 수칙을 준수합니다." },
  { key: "managerDesignated", label: "안전관리 총괄 책임자를 지정하고 연락처를 최신 상태로 유지합니다." },
  { key: "facilityInspected", label: "무대·시설 안전 점검 결과를 사전에 확인합니다." },
  { key: "incidentReporting", label: "사고 발생 시 관리사무소 및 관계 기관에 즉시 보고합니다." },
];

export function StepSafetyPledge({
  pledge,
  onChange,
}: {
  pledge: SafetyPledge;
  onChange: (pledge: SafetyPledge) => void;
}) {
  return (
    <section>
      <StepHeading
        title="안전관리 서약서"
        lead="공연 안전 관리를 위한 서약 항목을 확인하고 동의해 주세요."
      />

      <div className="mt-8 border border-border">
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
            <span className="text-s leading-6 text-foreground">{item.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <label className="block text-s font-bold text-foreground">서명</label>
        <textarea
          value={pledge.signature}
          onChange={(e) => onChange({ ...pledge, signature: e.target.value })}
          placeholder="담당자 성명을 입력해 서명을 대신합니다."
          rows={3}
          className="field-base mt-2"
        />
      </div>
    </section>
  );
}
