"use client";

import { useState, type ReactNode } from "react";
import { useWizardText } from "@/lib/content/wizardText";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import {
  PUBLIC_INTEREST_GROUPS,
  PUBLIC_INTEREST_ITEM_HINT,
  PUBLIC_INTEREST_ITEM_LABEL,
  PUBLIC_INTEREST_STATUS_ITEMS,
  type PerformanceInfo,
  type PublicInterestItem,
  type QuoteSelection,
} from "@/lib/pricing/types";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 07/12 #4 → 2026-08-22 선택형으로 전환]
// [개정 2026-08-27] 3열 카드 격자를 **가로형 체크박스 한 줄**로 바꾸고, 항목을 성격별로
// 묶었다(시안 지시: "전체적인 심사 및 가점 항목에 대해 가로형 체크박스로 변경 / 각 항목들은
// 성격에 맞게 그룹핑 / 항목 체크시 텍스트박스 기입하거나 자료 첨부기능 추가"). 당시엔 항목별
// 첨부(어느 항목의 자료인지 함께 들고 다님)로 바꿨었다.
// [재개정 2026-09-06] "항목별로 체크만 가능하게 하고, 맨 밑에 파일 하나 첨부하기로만"
// — 항목마다 파일칸을 따로 두던 걸 없애고 첨부는 섹션 전체에서 한 번만 받는다. 상세
// 텍스트(계획 설명)는 항목별로 그대로 유지한다 — 어떤 계획인지는 텍스트로 알 수 있고,
// 증빙 자료 자체는 한 번에 모아 받아도 된다는 판단.

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function StepPublicInterest({
  info,
  onChange,
  selection,
  midHallInfo,
  onChangeMidHallInfo,
  title,
  disabledItems,
  disabledGroups,
  disabledFields,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  selection: QuoteSelection;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  title: ReactNode;
  /**
   * [신규 2026-09-06] "체크박스 항목들은 항목 자체를 On/off 할 수 있게"(중분류) — 여기
   * 담긴 PublicInterestItem id는 화면에서 아예 숨긴다("해당 없음"/"검토 중"은 대상 밖).
   */
  disabledItems?: string[];
  /**
   * [신규 2026-09-06] "대분류 슬롯 온오프도" — PUBLIC_INTEREST_GROUPS 그룹 key
   * ("ACCESS" 등)를 담으면 그 그룹 전체(속한 항목 전부)를 숨긴다.
   */
  disabledGroups?: string[];
  /** [신규 2026-09-07] "그 영역을 잡고 없애줘" — 화면 상단 리드 한 줄도 다른 슬롯과
   * 같은 노출 On/off 패턴("wizardShell.publicInterestLead")을 쓴다. */
  disabledFields?: string[];
}) {
  const { t, tStr } = useWizardText();
  const selectedItems = info.publicInterestItems ?? [];
  const details = info.publicInterestDetails ?? {};
  const isItemEnabled = (item: PublicInterestItem) => !disabledItems?.includes(item);
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
    // "검토 중"·"없음"은 참여 계획이 아니라 상태 응답이라 상세를 받지 않는다.
    const expandable = !PUBLIC_INTEREST_STATUS_ITEMS.includes(item);
    // [신규 2026-09-06] "체크박스 항목자체도 수정/편집 가능하게" — 라벨·힌트는
    // wizardStrings의 publicInterest.item.<id>.label/.hint 로 관리자가 고칠 수 있다.
    const label = tStr(`publicInterest.item.${item}.label`, PUBLIC_INTEREST_ITEM_LABEL[item]);
    const hint = tStr(`publicInterest.item.${item}.hint`, PUBLIC_INTEREST_ITEM_HINT[item]);

    return (
      <div key={item} className={`border-b border-border/25 ${checked ? "bg-panel" : ""}`}>
        <label className="flex cursor-pointer items-center justify-between gap-4 px-3 py-3.5">
          <span className="min-w-0">
            <span className="block text-s font-bold">{label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">{hint}</span>
          </span>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleItem(item)}
            className="h-4 w-4 shrink-0 accent-[var(--foreground)]"
          />
        </label>

        {checked && expandable && (
          <div className="space-y-2.5 px-3 pb-4">
            <textarea
              value={details[item] ?? ""}
              onChange={(e) => setDetail(item, e.target.value)}
              placeholder={tStr("publicInterest.detailPlaceholder", "계획을 간단히 적어주세요.")}
              rows={3}
              className="field-base whitespace-pre-wrap"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <section>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>
      {!disabledFields?.includes("wizardShell.publicInterestLead") && (
        <p className="mt-1.5 text-s text-muted">
          {t("publicInterest.lead", "해당하는 항목을 선택하고, 항목마다 계획을 적습니다. 선택사항입니다.")}
        </p>
      )}

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
      {/* [수정 2026-09-08] "공익참여 프로그램이 두번 반복되잖아? 공통바 밑에 공익
          참여 프로그램 글자는 제거해" — 위 STEP 제목(title prop)과 문구가 거의
          같아 아래 소제목을 없앴다. 위 제목은 그대로 둔다. */}
      <div className="mt-10 border-t-2 border-foreground pt-5">
        <p className="text-xs leading-5 text-muted">
          {t(
            "publicInterest.itemsSectionHint",
            "해당하는 항목을 모두 선택하세요(복수 선택 가능). 미확정 사항은 '검토 중'을 선택할 수 있습니다.",
          )}
        </p>

        <div className="mt-6 space-y-8">
          {PUBLIC_INTEREST_GROUPS.filter((group) => !disabledGroups?.includes(group.key)).map((group) => {
            const visibleItems = group.items.filter(isItemEnabled);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.key}>
                <h4 className="border-b border-foreground pb-2 text-xs font-bold tracking-wide text-foreground">
                  {t(`publicInterest.group.${group.key}`, group.label)}
                </h4>
                <div className="border-t border-border/25">{visibleItems.map((item) => itemRow(item))}</div>
              </div>
            );
          })}

          {/* [삭제 2026-09-07] "해당없음·미확정 부분 삭제" — "검토 중"/"없음" 상태 응답
              그룹을 뺐다. */}

          {/* [수정 2026-09-07] "자료첨부 탭 외의 탭에서는 첨부파일 넣기 슬롯 제거" —
              섹션 전체용 파일 첨부 칸을 뺐다. 증빙 자료는 STEP7 "자료 첨부" 탭에서
              한 번에 받는다. */}
        </div>
      </div>
    </section>
  );
}
