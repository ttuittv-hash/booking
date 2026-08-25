"use client";

import { useState } from "react";
import type { ScreenTextContent, WizardStepTexts } from "@/lib/content/pageContent";
import { StepHeading } from "@/components/wizard/StepHeading";
import { ContentFormShell } from "./fields";
import { HELP } from "./adminUi";

// [2026-08-24] "대관 시스템 프로세스(탭별로 구성)화면을 보는 레이어를 열고 거기서
// 수정가능한부분만 시스템 메시지 부분(리드 문구)만 수정할 수 있게" — 위저드가 실제로
// 쓰는 StepNav와 같은 그룹·순서로 탭을 짜서, 탭을 누르면 그 STEP의 제목·리드만 실제
// 컴포넌트(StepHeading) 그대로 보여주고 그 자리에서 고친다. 패키지 카드·입력 필드
// 같은 나머지 요소는 이 어드민에서 애초에 편집 대상이 아니라서 그리지 않는다(2단계
// 제안 — 필요하면 이후 요청 시 스텝 전체 화면까지 재현).
type Entry =
  | { kind: "titleLead"; titleKey: keyof WizardStepTexts; leadKey: keyof WizardStepTexts; caption?: string }
  | { kind: "titleOnly"; titleKey: keyof WizardStepTexts; caption?: string };

interface SubTab {
  label: string;
  entries: Entry[];
}

interface StageGroup {
  label: string;
  subTabs: SubTab[];
}

// StepNav.tsx의 STAGE_GROUPS와 같은 그룹·순서 — 실제 위저드 탭을 그대로 옮긴 것이다.
const STAGE_GROUPS: StageGroup[] = [
  {
    label: "01 공간/일정",
    subTabs: [
      {
        label: "공간/일정",
        entries: [{ kind: "titleLead", titleKey: "venuePickerTitle", leadKey: "venuePickerLead" }],
      },
    ],
  },
  {
    label: "02 구성 · 옵션",
    subTabs: [
      {
        label: "구성 · 옵션",
        entries: [
          {
            kind: "titleOnly",
            titleKey: "configArenaTitle",
            caption: "아레나 단독 대관 — 리드는 고른 패키지 정보로 자동 생성돼 여기서 편집하지 않습니다",
          },
          {
            kind: "titleLead",
            titleKey: "configMidHallOnlyTitle",
            leadKey: "configMidHallOnlyLead",
            caption: "중형공연장 단독 대관",
          },
          {
            kind: "titleLead",
            titleKey: "configSimultaneousTitle",
            leadKey: "configSimultaneousLead",
            caption: "동시 대관",
          },
        ],
      },
    ],
  },
  {
    label: "03 기본 정보",
    subTabs: [
      {
        label: "신청자 정보 및 규모",
        entries: [
          { kind: "titleOnly", titleKey: "performanceInfoTitle", caption: "신청자 정보" },
          { kind: "titleLead", titleKey: "audienceTitle", leadKey: "audienceLead", caption: "규모" },
        ],
      },
      {
        label: "공공/공익 참여 여부",
        entries: [{ kind: "titleOnly", titleKey: "publicInterestTitle" }],
      },
      {
        label: "홍보 및 서비스 계획",
        entries: [{ kind: "titleLead", titleKey: "marketingTitle", leadKey: "marketingLead" }],
      },
      {
        label: "안전관리 서약서",
        entries: [{ kind: "titleLead", titleKey: "safetyPledgeTitle", leadKey: "safetyPledgeLead" }],
      },
    ],
  },
  {
    label: "04 신청서 제출",
    subTabs: [
      { label: "예상 대관료", entries: [{ kind: "titleOnly", titleKey: "estimateTitle" }] },
      {
        label: "최종 제출",
        entries: [
          { kind: "titleLead", titleKey: "submitNewTitle", leadKey: "submitNewLead", caption: "새 신청 시" },
          {
            kind: "titleLead",
            titleKey: "submitEditingTitle",
            leadKey: "submitEditingLead",
            caption: "신청서 수정 중일 때",
          },
        ],
      },
    ],
  },
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

function EntryBlock({
  entry,
  wizardSteps,
  setStep,
}: {
  entry: Entry;
  wizardSteps: WizardStepTexts;
  setStep: (patch: Partial<WizardStepTexts>) => void;
}) {
  return (
    <div className="border border-dashed border-border-soft bg-panel/40 p-5">
      {entry.caption && (
        <span className="mb-4 inline-flex items-center border border-border/40 bg-panel px-2 py-0.5 text-xs font-bold text-muted">
          {entry.caption}
        </span>
      )}
      <div className="max-w-2xl">
        {entry.kind === "titleLead" ? (
          <StepHeading
            title={
              <EditableTitle
                value={wizardSteps[entry.titleKey]}
                onChange={(val) => setStep({ [entry.titleKey]: val } as Partial<WizardStepTexts>)}
              />
            }
            lead={
              <EditableLead
                value={wizardSteps[entry.leadKey]}
                onChange={(val) => setStep({ [entry.leadKey]: val } as Partial<WizardStepTexts>)}
              />
            }
          />
        ) : (
          <h2 className="type-kr-heading text-h5-m sm:text-h5">
            <EditableTitle
              value={wizardSteps[entry.titleKey]}
              onChange={(val) => setStep({ [entry.titleKey]: val } as Partial<WizardStepTexts>)}
            />
          </h2>
        )}
      </div>
    </div>
  );
}

export function WizardTextPreview({ content }: { content: ScreenTextContent }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [subIdx, setSubIdx] = useState(0);
  const group = STAGE_GROUPS[groupIdx];
  const subTab = group.subTabs[Math.min(subIdx, group.subTabs.length - 1)];

  return (
    <ContentFormShell page="screenText" initial={content}>
      {(v, patch) => {
        function setStep(stepPatch: Partial<WizardStepTexts>) {
          patch({ wizardSteps: { ...v.wizardSteps, ...stepPatch } });
        }
        return (
          <div>
            <p className={HELP}>
              대관 위저드(/apply)와 같은 탭 구조입니다 — 탭을 눌러 스텝을 옮기면 그 스텝의
              제목·설명이 실제 화면과 같은 모양으로 나오고, 바로 고칠 수 있습니다.
            </p>

            {/* 1뎁스 탭 — StepNav의 STAGE_GROUPS와 같은 순서 */}
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

            {/* 2뎁스 탭 — 그룹 안에 하위 스텝이 여럿일 때만 */}
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

            <div className="mt-8 space-y-6">
              {subTab.entries.map((entry) => (
                <EntryBlock key={entry.titleKey} entry={entry} wizardSteps={v.wizardSteps} setStep={setStep} />
              ))}
            </div>
          </div>
        );
      }}
    </ContentFormShell>
  );
}
