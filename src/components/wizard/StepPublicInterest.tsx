"use client";

import { FilePicker } from "@/components/ui/FilePicker";

import { useState, type ReactNode } from "react";
import { useWizardText } from "@/lib/content/wizardText";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  PUBLIC_INTEREST_GROUPS,
  PUBLIC_INTEREST_ITEM_HINT,
  PUBLIC_INTEREST_ITEM_LABEL,
  PUBLIC_INTEREST_ITEM_NUMBER,
  PUBLIC_INTEREST_STATUS_ITEMS,
  type PerformanceInfo,
  type PublicInterestItem,
  type QuoteSelection,
} from "@/lib/pricing/types";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 07/12 #4 → 2026-08-22 선택형으로 전환]
// [개정 2026-08-27] 3열 카드 격자를 **가로형 체크박스 한 줄**로 바꾸고, 항목을 성격별로
// 묶었다(시안 지시: "전체적인 심사 및 가점 항목에 대해 가로형 체크박스로 변경 / 각 항목들은
// 성격에 맞게 그룹핑 / 항목 체크시 텍스트박스 기입하거나 자료 첨부기능 추가"). 계획 상세를
// 파일 1건으로만 받던 하단 첨부 슬롯은 없앴다 — 어느 항목의 계획인지 알 수 없어 심사에서
// 되묻는 일이 반복됐다. 이제 상세 텍스트도 파일도 항목에 붙는다.

/** 항목에 붙여서 올리는 파일 — 어느 항목의 자료인지 함께 들고 다닌다. */
export interface PublicInterestFile {
  item: PublicInterestItem;
  file: File;
}

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
  files: PublicInterestFile[];
  onFilesChange: (files: PublicInterestFile[]) => void;
  title: ReactNode;
}) {
  const { t, tStr } = useWizardText();
  const selectedItems = info.publicInterestItems ?? [];
  const details = info.publicInterestDetails ?? {};
  const [activeTab, setActiveTab] = useState<VenueSplitTab>(midHallInfo ? "ARENA" : "COMMON");

  // "없음"은 다른 항목과 같이 설 수 없다 — 예전 격자에서는 "없음"과 참여 항목이 동시에
  // 체크된 신청서가 실제로 들어왔다. 한쪽을 켜면 다른 쪽을 끈다.
  function toggleItem(item: PublicInterestItem) {
    let next: PublicInterestItem[];
    if (item === "NONE") {
      next = selectedItems.includes("NONE") ? [] : ["NONE"];
    } else {
      next = toggleInArray(selectedItems, item).filter((v) => v !== "NONE");
    }
    onChange({ ...info, publicInterestItems: next });
  }

  function setDetail(item: PublicInterestItem, value: string) {
    onChange({ ...info, publicInterestDetails: { ...details, [item]: value } });
  }

  function addFiles(item: PublicInterestItem, selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    onFilesChange([...files, ...Array.from(selected).map((file) => ({ item, file }))]);
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

  /*
    항목 한 줄 — 왼쪽에 번호·이름·힌트, 오른쪽 끝에 체크박스. 체크하면 아래가 펼쳐진다.
    컴포넌트로 빼지 않고 **함수 호출**로 쓴다: 렌더마다 새 컴포넌트 타입이 되면 React가
    그 자리를 통째로 다시 마운트해 상세 텍스트박스가 한 글자마다 포커스를 잃는다.
  */
  function itemRow(item: PublicInterestItem) {
    const checked = selectedItems.includes(item);
    // "검토 중"·"없음"은 참여 계획이 아니라 상태 응답이라 상세·첨부를 받지 않는다.
    const expandable = !PUBLIC_INTEREST_STATUS_ITEMS.includes(item);
    const itemFiles = files.map((f, i) => ({ ...f, index: i })).filter((f) => f.item === item);

    return (
      <div key={item} className={`border-b border-border/25 ${checked ? "bg-panel" : ""}`}>
        <label className="flex cursor-pointer items-center justify-between gap-4 px-3 py-3.5">
          <span className="min-w-0">
            <span className="block text-s font-bold">
              {PUBLIC_INTEREST_ITEM_NUMBER[item]}. {PUBLIC_INTEREST_ITEM_LABEL[item]}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">
              {PUBLIC_INTEREST_ITEM_HINT[item]}
            </span>
          </span>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleItem(item)}
            className="h-4 w-4 shrink-0"
          />
        </label>

        {checked && expandable && (
          <div className="space-y-2.5 px-3 pb-4">
            <textarea
              value={details[item] ?? ""}
              onChange={(e) => setDetail(item, e.target.value)}
              placeholder={tStr(
                "publicInterest.detailPlaceholder",
                "계획을 간단히 적어주세요. 자료가 있으면 아래에 첨부하셔도 됩니다.",
              )}
              rows={3}
              className="field-base whitespace-pre-wrap"
            />

            <FilePicker
              label={tStr("publicInterest.fileLabel", "관련 자료 첨부")}
              multiple
              onChange={(e) => {
                addFiles(item, e.target.files);
                e.target.value = "";
              }}
              files={itemFiles.map((f) => f.file)}
              onRemove={(i) => removeFile(itemFiles[i].index)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>
      <p className="mt-1.5 text-s text-muted">
        {t(
          "publicInterest.lead",
          "해당하는 항목을 선택하고, 항목마다 계획을 적거나 자료를 첨부합니다. 선택사항입니다.",
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

      {/* 공공성 항목은 공간별로 달라지는 입력값이 없어 탭을 넘겨도 아래 목록은 동일하게
          유지된다 — 04 기본 정보 그룹의 다른 화면과 탭 구조만 맞춘다
          (2026-08-19, 형식상 탭 추가 요청). */}
      <div className="mt-10 rounded-surface bg-panel p-5">
        <h3 className="type-kr-heading text-h6-m">
          {t("publicInterest.itemsSectionHeading", "공공/공익 참여 및 연계 프로그램 (선택)")}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          {t(
            "publicInterest.itemsSectionHint",
            "해당하는 항목을 모두 선택하세요(복수 선택 가능). 미확정 사항은 '검토 중'을 선택할 수 있습니다.",
          )}
        </p>

        <div className="mt-6 space-y-8">
          {PUBLIC_INTEREST_GROUPS.map((group) => (
            <div key={group.key}>
              <h4 className="border-b border-border/25 pb-2 text-xs font-bold tracking-wide text-foreground">
                {t(`publicInterest.group.${group.key}`, group.label)}
              </h4>
              <div>
                {group.items.map((item) => itemRow(item))}
              </div>
            </div>
          ))}

          <div>
            <h4 className="border-b border-border/25 pb-2 text-xs font-bold tracking-wide text-foreground">
              {t("publicInterest.group.STATUS", "해당 없음 · 미확정")}
            </h4>
            <div>
              {PUBLIC_INTEREST_STATUS_ITEMS.map((item) => itemRow(item))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
