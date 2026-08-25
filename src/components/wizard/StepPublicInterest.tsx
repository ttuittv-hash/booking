"use client";

import { CHOICE_SELECTED_VARS, FILE_INPUT, toggleClass } from "@/components/ui/kit";

import { useState, type ReactNode } from "react";
import { useWizardText } from "@/lib/content/wizardText";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  PUBLIC_INTEREST_ITEM_HINT,
  PUBLIC_INTEREST_ITEM_LABEL,
  type PerformanceInfo,
  type PublicInterestItem,
  type QuoteSelection,
} from "@/lib/pricing/types";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 07/12 #4 → 2026-08-22 선택형으로 전환]
// 신청자가 해당하는 항목을 직접 골라 표시하고, 계획 상세는 별도 파일 1건으로 첨부한다.
const PUBLIC_INTEREST_ITEMS = Object.keys(PUBLIC_INTEREST_ITEM_LABEL) as PublicInterestItem[];

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function StepPublicInterest({
  info,
  onChange,
  selection,
  midHallInfo,
  onChangeMidHallInfo,
  files,
  onFilesChange,
  title,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  selection: QuoteSelection;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  title: ReactNode;
}) {
  const { t } = useWizardText();
  const selectedItems = info.publicInterestItems ?? [];
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    onFilesChange([...files, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const midHallDifferent = isSimultaneous && midHallInfo !== null;
  const effectiveTab: VenueSplitTab = midHallDifferent ? (activeTab === "MIDHALL" ? "MIDHALL" : "ARENA") : "COMMON";

  function splitAndSelect(tab: "ARENA" | "MIDHALL") {
    if (!midHallDifferent) onChangeMidHallInfo(midHallInfo ?? { ...INITIAL_PERFORMANCE_INFO });
    setActiveTab(tab);
  }

  function mergeToCommon() {
    onChangeMidHallInfo(null);
    setActiveTab("COMMON");
  }

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>
      <p className="mt-1.5 text-s text-muted">
        {t(
          "publicInterest.lead",
          "해당하는 항목을 선택하고, 계획 상세는 하나의 파일로 정리해 첨부합니다. 선택사항입니다.",
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

      {/* 공공성 항목은 공간별로 달라지는 입력값이 없어 탭을 넘겨도 아래 안내 · 첨부는
          동일하게 유지된다 — 04 기본 정보 그룹의 다른 두 화면과 탭 구조만 맞춘다
          (2026-08-19, 형식상 탭 추가 요청). */}
      <div className="mt-10 border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m">
          {t("publicInterest.itemsSectionHeading", "공공/공익 참여 및 연계 프로그램 (선택)")}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          {t(
            "publicInterest.itemsSectionHint",
            "해당하는 항목을 모두 선택하세요(복수 선택 가능). 미확정 사항은 '검토 중'을 선택할 수 있습니다.",
          )}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {PUBLIC_INTEREST_ITEMS.map((item, i) => {
            const checked = selectedItems.includes(item);
            return (
              <label
                key={item}
                style={checked ? CHOICE_SELECTED_VARS : undefined}
                className={[
                  "flex cursor-pointer items-start gap-2 border p-4 transition-colors",
                  checked ? "border-foreground bg-inverse-bg text-inverse-fg" : "border-border/25 hover:border-foreground",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange({ ...info, publicInterestItems: toggleInArray(selectedItems, item) })}
                  className={`mt-0.5 h-4 w-4 shrink-0 ${checked ? "accent-[var(--background)]" : "accent-[var(--foreground)]"}`}
                />
                <div>
                  <div className="text-s font-bold">
                    {i + 1}. {PUBLIC_INTEREST_ITEM_LABEL[item]}
                  </div>
                  <div className={`mt-0.5 text-xs ${checked ? "text-inverse-fg/70" : "text-muted"}`}>
                    {PUBLIC_INTEREST_ITEM_HINT[item]}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-10 border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m">{t("publicInterest.attachmentsSectionHeading", "자료 첨부 (선택)")}</h3>
        <p className="mt-1 mb-2.5 text-xs leading-5 text-muted">
          {t(
            "publicInterest.attachmentsSectionHint",
            "위에서 선택한 항목의 계획을 하나의 파일(PDF/HWP/DOCX)로 정리해 첨부하세요.",
          )}
        </p>

        {files.length > 0 && (
          <ul className="mb-3 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between border border-border/25 bg-panel px-3.5 py-2.5"
              >
                <span className="truncate text-s font-bold">{file.name}</span>
                <button type="button" onClick={() => removeFile(i)} className={`${toggleClass(false)} shrink-0`}>
                  {t("publicInterest.removeFileButton", "삭제")}
                </button>
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
          className={FILE_INPUT}
        />
      </div>
    </section>
  );
}
