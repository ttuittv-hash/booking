"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { btnClass } from "@/components/ui/kit";
import type { SafetyPledge } from "@/lib/pricing/types";
import { useWizardText } from "@/lib/content/wizardText";
import { SignaturePad } from "./SignaturePad";
import { StepHeading } from "./StepHeading";

type PledgeCheckKey = keyof Omit<SafetyPledge, "signature">;

// [개정 2026-08-23, 목업 반영] 4개 → 6개 항목 + "미준수 시 조치 동의" 1개(총 7개)로
// 확장했다. 마지막 항목은 조치 내용을 스스로 밝히는 동의 조항이라 굵게 강조한다.
// defaultLabel은 관리자가 아직 문구를 고치지 않았을 때 쓰는 기본값이다 — 실제로
// 렌더할 때는 useWizardText()의 t()로 override를 먼저 찾는다(모듈 스코프 상수라
// 여기서 훅을 쓸 수 없다).
const PLEDGE_ITEMS: { key: PledgeCheckKey; defaultLabel: string; emphasize?: boolean }[] = [
  {
    key: "safetyStructure",
    defaultLabel:
      "공연장 안전관리 가이드를 준수하고, 재해대책계획 및 안전관리계획 수립, 안전관리 책임자 지정 등 필요한 안전관리 체계를 구성하겠습니다.",
  },
  {
    key: "legalInspection",
    defaultLabel:
      "염, 전기안전, 임시구조물, 특수효과 등 공연·행사에 필요한 법정 안전검사 및 관련 서류를 정해진 기한 내 완료·제출하겠습니다.",
  },
  {
    key: "staffSafetyTraining",
    defaultLabel:
      "출연자 및 스태프 등 공연 관계자가 관련 법령에 따른 안전교육을 이수하도록 하고, 행사 당일 비상대피훈련 등 필요한 안전조치를 이행하겠습니다.",
  },
  {
    key: "followVenueGuidance",
    defaultLabel:
      "공연의 기술·운영과 관련하여 서울아레나의 안전 가이드 및 담당자의 안내와 지시를 준수하며, 안전상 필요한 경우 공연 지연·중단 또는 시설 사용 제한 등의 조치에 협조하겠습니다.",
  },
  {
    key: "audienceSafetyMeasures",
    defaultLabel:
      "승인된 수용인원과 객석 운영 기준을 준수하고, 스탠딩 관객 밀집 관리 및 이동약자 관람 환경 확보 등 관객 안전에 필요한 조치를 이행하겠습니다.",
  },
  {
    key: "insuranceCoverage",
    defaultLabel:
      "공연장 운영에 필요한 영업배상책임보험·단체상해보험 등 관련 보험에 가입하고, 공연·행사로 인한 시설 손상 및 제3자 피해 등에 대한 책임을 부담하겠습니다.",
  },
  {
    key: "consequenceAcknowledged",
    defaultLabel:
      "위 사항을 준수하지 않을 경우 서울아레나 대관규약에 따라 시설 사용 제한, 대관 계약 해지 또는 향후 대관 신청 제한 등의 조치가 이루어질 수 있음에 동의합니다.",
    emphasize: true,
  },
];

// 서약 항목 7개를 전부 체크하고 서명, 제출 서류(안전관리계획서) 1건을 채워야
// 다음 단계로 넘어간다(2026-08-22, "안전관리 서약서는 무조건 체크하고 서명해야지
// 다음단계로 넘어감 => 필수"). 출연자 계약서는 "신청자 정보 및 규모" 탭의 주요
// 출연진 계약 상태 슬롯에서 이미 받으므로 여기서는 중복 요구하지 않는다(2026-08-26).
export function validateSafetyPledgeStep(
  pledge: SafetyPledge,
  files?: { safetyPlanFile: File | null },
): string | null {
  const unchecked = PLEDGE_ITEMS.some((item) => !pledge[item.key]);
  if (unchecked) return "안전관리 서약 항목을 모두 체크해 주세요.";
  if (!pledge.signature.trim()) return "서명란에 서명해 주세요.";
  if (files && !files.safetyPlanFile) return "공연·행사 안전관리계획서를 업로드해 주세요.";
  return null;
}

function FileSlot({
  label,
  file,
  onChange,
}: {
  label: ReactNode;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const { t } = useWizardText();
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
        {t("safetyPledge.uploadButton", "업로드")}
      </button>
    </div>
  );
}

export function StepSafetyPledge({
  pledge,
  onChange,
  safetyPlanFile,
  onSafetyPlanFileChange,
  title,
  lead,
}: {
  pledge: SafetyPledge;
  onChange: (pledge: SafetyPledge) => void;
  safetyPlanFile: File | null;
  onSafetyPlanFileChange: (file: File | null) => void;
  title: ReactNode;
  lead: ReactNode;
}) {
  const { t } = useWizardText();
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
      <StepHeading title={title} lead={lead} />

      {/* [신규 2026-08-26] "안전관리 서약서 화면에서 대관 규약 보기 링크가 있어야함" —
          서약 항목이 대관규약을 근거로 하므로(consequenceAcknowledged 문구 참고) 원문을
          바로 확인할 수 있게 새 탭 링크를 둔다. */}
      <Link
        href="/rules"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-s font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
      >
        {t("safetyPledge.viewRulesLinkLabel", "대관 규약 보기")} ↗
      </Link>

      <label className="mt-6 flex cursor-pointer items-center gap-2.5 border border-border bg-panel px-5 py-3.5">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-s font-bold text-foreground">{t("safetyPledge.allAgree", "전체 동의")}</span>
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
              {t(`safetyPledge.items.${item.key}`, item.defaultLabel)}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <label className="block text-s font-bold text-foreground">{t("safetyPledge.signatureLabel", "서명")}</label>
        <p className="mt-1 mb-2 text-xs text-muted">
          {t("safetyPledge.signatureHint", "담당자 본인이 아래 캔버스에 직접 서명해 주세요.")}
        </p>
        <SignaturePad
          value={pledge.signature}
          onChange={(signature) => onChange({ ...pledge, signature })}
        />
      </div>

      <div className="mt-8 border-t border-border/25 pt-5">
        <h3 className="type-kr-heading text-h6-m">{t("safetyPledge.documentsHeading", "제출 서류")}</h3>
        <p className="mt-1 mb-4 break-keep text-xs leading-6 text-muted">
          {t("safetyPledge.documentsHint", "아래 서류를 준비해 각각 업로드해 주세요.")}
        </p>
        <div className="border border-border">
          <FileSlot
            label={t("safetyPledge.safetyPlanLabel", "공연·행사 안전관리계획서")}
            file={safetyPlanFile}
            onChange={onSafetyPlanFileChange}
          />
        </div>
      </div>
    </section>
  );
}
