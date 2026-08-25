"use client";

import type { ScreenTextContent, WizardStepTexts } from "@/lib/content/pageContent";
import { StepHeading } from "@/components/wizard/StepHeading";
import { ContentFormShell } from "./fields";
import { HELP } from "./adminUi";

// [2026-08-24] "화면 자체에서 리드문구나 텍스트를 모두 수정할 수 있게해줘 ..
// 어드민에 입력박스만 있어서 그걸 입력하고 실제 프론트에 반영된거를 확인하고
// 다시 어드민에 입력하고 이런게 너무 힘든거야" — 일반 폼 입력칸 대신, 위저드가
// 실제로 쓰는 StepHeading 컴포넌트를 그대로 여기서도 써서 폰트·간격이 실제
// 화면과 똑같이 보이게 하고, 그 자리에서 바로 고치게 한다. 회색 라벨(어느
// 화면인지)만 이 미리보기 전용이고 실제 화면에는 나오지 않는다.
type TitleLeadEntry = {
  titleKey: keyof WizardStepTexts;
  leadKey: keyof WizardStepTexts;
  label: string;
};
type TitleOnlyEntry = { titleKey: keyof WizardStepTexts; label: string };

const TITLE_LEAD_ENTRIES: TitleLeadEntry[] = [
  { titleKey: "venuePickerTitle", leadKey: "venuePickerLead", label: "STEP · 공간 선택" },
  { titleKey: "configSimultaneousTitle", leadKey: "configSimultaneousLead", label: "STEP · 구성·옵션 (동시 대관)" },
  {
    titleKey: "configMidHallOnlyTitle",
    leadKey: "configMidHallOnlyLead",
    label: "STEP · 구성·옵션 (중형공연장 단독 대관)",
  },
  { titleKey: "audienceTitle", leadKey: "audienceLead", label: "STEP · 규모" },
  { titleKey: "marketingTitle", leadKey: "marketingLead", label: "STEP · 홍보 및 서비스 계획" },
  { titleKey: "safetyPledgeTitle", leadKey: "safetyPledgeLead", label: "STEP · 안전관리 서약서" },
  { titleKey: "submitNewTitle", leadKey: "submitNewLead", label: "STEP · 최종 제출 (새 신청)" },
  { titleKey: "submitEditingTitle", leadKey: "submitEditingLead", label: "STEP · 최종 제출 (신청서 수정 중)" },
];

const TITLE_ONLY_ENTRIES: TitleOnlyEntry[] = [
  {
    titleKey: "configArenaTitle",
    label: "STEP · 아레나 단독 대관 (리드는 고른 패키지 정보로 자동 생성돼 여기서 편집하지 않습니다)",
  },
  { titleKey: "performanceInfoTitle", label: "STEP · 신청자 정보" },
  { titleKey: "publicInterestTitle", label: "STEP · 공공/공익 참여 여부" },
  { titleKey: "estimateTitle", label: "STEP · 예상 대관료" },
];

const EDITABLE_INPUT =
  "block w-full min-w-0 border-0 border-b border-dashed border-transparent bg-transparent p-0 outline-none focus:border-accent";

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

function PreviewLabel({ children }: { children: string }) {
  return (
    <span className="mb-4 inline-flex items-center border border-border/40 bg-panel px-2 py-0.5 text-xs font-bold text-muted">
      {children}
    </span>
  );
}

export function WizardTextPreview({ content }: { content: ScreenTextContent }) {
  return (
    <ContentFormShell page="screenText" initial={content}>
      {(v, patch) => {
        function setStep(stepPatch: Partial<WizardStepTexts>) {
          patch({ wizardSteps: { ...v.wizardSteps, ...stepPatch } });
        }
        return (
          <div className="space-y-8">
            <p className={HELP}>
              대관 위저드(/apply)가 실제로 쓰는 컴포넌트 그대로 보여줍니다 — 아래에서 바로 고치면
              그 모양 그대로 반영됩니다. 회색 라벨은 이 화면에서만 보이는 안내이고, 실제 위저드에는
              나오지 않습니다.
            </p>

            {TITLE_LEAD_ENTRIES.map((entry) => (
              <div key={entry.titleKey} className="border border-dashed border-border-soft bg-panel/40 p-5">
                <PreviewLabel>{entry.label}</PreviewLabel>
                <div className="max-w-2xl">
                  <StepHeading
                    title={
                      <EditableTitle
                        value={v.wizardSteps[entry.titleKey]}
                        onChange={(val) => setStep({ [entry.titleKey]: val } as Partial<WizardStepTexts>)}
                      />
                    }
                    lead={
                      <EditableLead
                        value={v.wizardSteps[entry.leadKey]}
                        onChange={(val) => setStep({ [entry.leadKey]: val } as Partial<WizardStepTexts>)}
                      />
                    }
                  />
                </div>
              </div>
            ))}

            {TITLE_ONLY_ENTRIES.map((entry) => (
              <div key={entry.titleKey} className="border border-dashed border-border-soft bg-panel/40 p-5">
                <PreviewLabel>{entry.label}</PreviewLabel>
                <div className="max-w-2xl">
                  <h2 className="type-kr-heading text-h5-m sm:text-h5">
                    <EditableTitle
                      value={v.wizardSteps[entry.titleKey]}
                      onChange={(val) => setStep({ [entry.titleKey]: val } as Partial<WizardStepTexts>)}
                    />
                  </h2>
                </div>
              </div>
            ))}
          </div>
        );
      }}
    </ContentFormShell>
  );
}
