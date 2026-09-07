"use client";

import { useState, type ReactNode } from "react";
import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  clampAddonQuantity,
  defaultDayTags,
  effectiveDayTag,
  findPackage,
  isAddonAvailable,
  maxRequestableQuantity,
  packagesForVenue,
} from "@/lib/pricing/rateTableUtils";
import {
  MID_HALL_VENUE_ID,
  SPECIAL_VENUE_ID,
  type AddonCategory,
  type AddonItem,
  type QuoteSelection,
  type RateTable,
  type RentalPackage,
} from "@/lib/pricing/types";
import type { ChargeBlock, VenueRateContent, WizardStepTexts } from "@/lib/content/pageContent";
import { useWizardText } from "@/lib/content/wizardText";
import { CHOICE_SELECTED_VARS, choiceClass, type SpecGroup } from "@/components/ui/kit";
import { defaultVenueName, venueLabelKey } from "@/lib/content/venueLabels";
import { StepHeading } from "./StepHeading";

// ADDITIONAL CHARGES를 "구분"으로 묶는다 — /rates 공개 페이지(app/rates/page.tsx)의
// chargeGroups()와 완전히 같은 로직이다. 콘텐츠 자체를 공유하니 묶는 방식도 같아야
// 두 화면이 서로 다르게 보이지 않는다.
function chargeGroups(rows: ChargeBlock[]): SpecGroup[] {
  const order: string[] = [];
  rows.forEach((r) => {
    if (!order.includes(r.group)) order.push(r.group);
  });
  return order.map((g) => ({
    title: g,
    rows: rows
      .filter((r) => r.group === g)
      .map((r) => ({ label: r.item, value: r.cost, note: r.note || undefined })),
  }));
}

/** 시간 단위 옵션(셋업 연장·철수 Load-Out) — MidHallCalendar(STEP 1)에서 정한 값을
 * 그대로 보여주기만 하는 읽기 전용 박스다. 처음에는 여기서도 +/− 로 바로 조정할 수
 * 있게 했지만(2026-08-23), 값을 두 군데서 고칠 수 있어 헷갈린다는 요청으로 수정은
 * STEP 1 캘린더에서만 하도록 되돌렸다(2026-08-23, "셋업 연장,철수연장은 앞에
 * 달력에서 체크한대로만 노출하고 수정 못하게해.. 수정하려면 캘린더가서 가능하도록").
 */
function MidHallHourBox({
  label,
  hint,
  hours,
  unitFee,
}: {
  label: ReactNode;
  hint: ReactNode;
  hours: number;
  unitFee: number;
}) {
  const { t } = useWizardText();
  return (
    <div className="flex flex-col gap-1.5 border border-border-soft px-3 py-2">
      <div>
        <span className="text-xs font-bold">{label}</span>
        <div className="mt-0.5 text-xs text-muted">{hint}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-xs text-muted">
          {won(unitFee)} / {t("configOptions.perHourUnit", "시간")}
        </span>
        <span className="text-xs font-bold tabular-nums">
          {hours}
          {t("configOptions.hoursUnit", "시간")}
        </span>
      </div>
    </div>
  );
}

/** 참고용 박스 — 가격이 "별도 협의"·"실비"라 수량을 받아도 견적에 반영할 수 없는
 * 항목(팝업 공간·옥외 광고·수도광열비 등)은 안내만 하는 카드로 보여준다. */
function MidHallReferenceBox({ label, value, note }: { label: string; value: string; note?: string }) {
  const { t } = useWizardText();
  return (
    <div className="flex flex-col gap-1.5 border border-border-soft px-3 py-2">
      <span className="text-xs font-bold">{label}</span>
      <span className="text-xs text-muted">
        {value}
        {note ? ` · ${note}` : ""}
      </span>
      <span className="text-xs font-bold text-muted">{t("configOptions.contactSeparately", "별도 문의")}</span>
    </div>
  );
}

// [신규 2026-08-23] 중형공연장 구성·옵션 탭에 Live Hall RATE 카드를 노출한다
// ("구성/옵션 탭 > 중형공연장 탭 구성 노출하는게 중요해" · "어드민에서 중형공연장
// 패키지 내역에 이런 구조를 반영해줘"). RATE·RATE INCLUDES·ADDITIONAL CHARGES는
// /rates 공개 페이지와 완전히 같은 콘텐츠(RatesContent.liveHall — /admin/rates에서
// 관리자가 이미 편집하는 정본)를 그대로 재사용한다 — 값은 어드민에서만 고치면 이
// 화면과 /rates 양쪽에 동시에 반영된다.
// [개정 2026-08-23] "기본 항목"·"옵션"을 아레나처럼 박스형태로 구분해 보여 달라는
// 요청에 따라 표(SpecTable/GroupedSpecTable) 대신 AddonRow와 같은 박스 그리드로
// 바꿨다. "추가대관"(셋업 연장·철수 Load-Out)은 이미 있는 필드라 수량 스테퍼로
// 즉시 조정 가능하게 했고, 나머지(공간·프로모션·기타·온라인 콘서트 진행)는 "별도
// 협의"·"실비" 금액이 섞여 있어 참고용 박스로만 보여준다(견적에 자동 반영 안 함).
function MidHallRateCard({
  content,
  extraHourFee,
  extraSetupHours,
  extraLoadOutHours,
}: {
  content: VenueRateContent;
  extraHourFee: number;
  extraSetupHours: number;
  extraLoadOutHours: number;
}) {
  // [2026-08-23] "컬럼값이 두번 반복되는게 이상해" — Details를 별도 표로 그리면
  // 같은 열 제목(평일/주말 셋업 등)이 헤더 행으로 두 번 찍혀 보였다. 표 하나에
  // 행만 더 붙이는 방식으로 바꿔 헤더는 한 번만 나오게 한다.
  const cols = content.columns.map((r) => ({ key: r.key, title: r.name, align: "left" as const }));
  const baseRows = content.rowLabels.map((label, i) => ({
    label,
    cells: content.columns.map((col) => col.values[i] ?? ""),
  }));
  const detailRows = content.detailLabels.map((label, i) => ({
    label,
    cells: cols.map((col) => content.detailColumns.find((dc) => dc.key === col.key)?.values[i] ?? ""),
  }));
  const { t } = useWizardText();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const otherGroups = chargeGroups(content.charges).filter((g) => g.title !== "추가대관");

  // [수정 2026-09-06] "중형공연장 패키지도 아레나 패키지와 동일한 UI로" — 요금 정책
  // (일 단위 자유 조합)은 그대로 두고, 표시만 아레나 PackagePicker의 카드 프레임(제목 +
  // 구분선 + dl 속성 행)에 맞춘다. 컬럼(셋업/철수·평일 공연·주말 공연) 하나당 카드 하나,
  // 그 안에 행 라벨(rowLabels/detailLabels)을 속성으로 나열한다 — 표(ComparisonTable)
  // 대신 카드 그리드로 그린다.
  const visibleRows = detailsOpen ? [...baseRows, ...detailRows] : baseRows;

  return (
    <div className="mt-10 border-t-2 border-foreground pt-5">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">{t("configOptions.dailyRateHeading", "일자별 대관료")}</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cols.map((col, ci) => (
          <div key={col.key} className="border border-border-soft px-4 py-3">
            <div className="text-s font-bold">{col.title}</div>
            <dl className="mt-2.5 space-y-1 border-t border-border/25 pt-2.5 text-xs">
              {visibleRows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-bold tabular-nums">{row.cells[ci]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {detailRows.length > 0 && (
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-3 cursor-pointer text-s font-bold"
        >
          {detailsOpen ? t("configOptions.detailsHide", "Details ▲") : t("configOptions.detailsShow", "Details ▼")}
        </button>
      )}

      {/* [개정 2026-09-07] "아레나, 중형 레이아웃 통일" — 기본 항목·옵션 모두 아레나
          PackagePicker(구성 선택 카드 아래 "기본 포함" 패널·"선택 옵션" 아웃라인 박스)와
          같은 틀(공유 배지 패널 + 하나로 감싼 아웃라인 박스)로 맞춘다. 항목 내용(자유
          라벨·값, 시간 스테퍼, 참고용 별도문의)은 중형 고유 데이터라 그대로 둔다. */}
      {content.includes.length > 0 && (
        <div className="mt-10 border-t border-border/25 pt-5">
          <h2 className="type-kr-heading text-h6-m sm:text-h6">{t("configOptions.basicItemsHeading", "기본 항목")}</h2>
          <p className="mt-1.5 text-xs leading-6 text-muted">
            {t("configOptions.basicItemsHint", "대관료에 이미 포함된 기본 제공 사항입니다.")}
          </p>
          <div className="mt-4 border border-border/30 bg-panel/40 px-4 py-3">
            <span className="bg-foreground px-2 py-0.5 text-xs font-bold text-background">
              {t("configOptions.basicIncludedBadge", "기본 포함")}
            </span>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {content.includes.map((p, i) => (
                <div key={`${p.label}-${i}`} className="border border-border-soft bg-panel px-3 py-2 text-xs">
                  <span className="font-bold text-foreground">{p.label}</span>
                  <span className="mt-0.5 block text-muted">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
          {content.limits.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/25 pt-4">
              {content.limits.map((p, i) => (
                <p key={`${p.label}-${i}`} className="break-keep text-s leading-7">
                  <span className="font-bold">{p.label}</span>
                  <span className="text-muted">: {p.value}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {content.charges.length > 0 && (
        <div className="mt-10 border-t border-border/25 pt-5">
          <h2 className="type-kr-heading text-h6-m sm:text-h6">{t("configOptions.optionsHeading", "옵션")}</h2>
          <p className="mt-1.5 text-xs leading-6 text-muted">
            {t(
              "configOptions.optionsHint",
              "추가대관 시간은 STEP 1 캘린더에서 설정한 값이 그대로 표시됩니다 — 여기서는 수정할 수 " +
                "없고, 바꾸려면 STEP 1로 돌아가 캘린더에서 조정하세요. 나머지 항목은 참고용 안내이며 " +
                "예상 대관료에는 자동 반영되지 않습니다 — 필요 시 별도로 협의합니다.",
            )}
          </p>

          {/* 아레나 "선택 옵션"과 같은 아웃라인 박스 하나로 전체를 감싼다(예전에는
              박스 없이 소제목만 이어 붙어 있었다). */}
          <div className="mt-4 border border-border/25 p-5">
            <div>
              <div className="mb-2 text-xs font-bold text-muted">{t("configOptions.extraDaysLabel", "추가대관")}</div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                <MidHallHourBox
                  label={t("configOptions.setupExtensionLabel", "셋업 연장 (22:00~24:00)")}
                  hint={t("configOptions.appliesWholePeriodHint", "전체 일정 공통 적용")}
                  hours={extraSetupHours}
                  unitFee={extraHourFee}
                />
                <MidHallHourBox
                  label={t("configOptions.loadOutExtensionLabel", "철수 Load-Out 연장")}
                  hint={t("configOptions.appliesWholePeriodHint", "전체 일정 공통 적용")}
                  hours={extraLoadOutHours}
                  unitFee={extraHourFee}
                />
              </div>
            </div>

            {otherGroups.map((g) => (
              <div key={g.title} className="mt-6">
                <div className="mb-2 text-xs font-bold text-muted">{g.title}</div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.rows.map((r, i) => (
                    <MidHallReferenceBox key={`${r.label}-${i}`} label={r.label} value={r.value} note={r.note} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.notes.length > 0 && (
        <ul className="mt-8 space-y-2">
          {content.notes.map((note, i) => (
            <li key={`${note}-${i}`} className="break-keep text-xs leading-5 text-muted">
              ※ {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 05/12] "규모/패키지 선택 → 기본 포함사항 →
// 추가 옵션" 3개 화면을 STEP 2(구성·옵션) 한 화면으로 합친다.
// [개정 2026-08-20] 패키지는 더 이상 관객 규모로 자동 결정하지 않는다 — 아레나 탭 안에
// "패키지 선택" 슬롯에서 4개 패키지 카드 중 하나를 직접 고르면, 그 아래 "선택 옵션" 슬롯이
// 그 패키지에서 고를 수 있는 옵션으로 바뀐다(isAddonAvailable 필터링은 기존과 동일).
/*
  [수정 2026-09-06] "구성/옵션 아레나 하단 워딩 수정할 수 있도록" 요청 — "셋업"/"공연"/
  "철수" 라벨이 문자열 리터럴로 박혀 있어 편집 대상이 아니었다. 이 함수는 컴포넌트가
  아니라 훅(useWizardText)을 쓸 수 없으므로, 호출부에서 만든 tStr을 인자로 받는다.
*/
function arenaSummaryLine(
  selection: QuoteSelection,
  defaultPerformanceDays: number,
  tStr: (key: string, fallback: string) => string,
): string {
  const dates = resolveSelectedDates(selection);
  if (dates.length === 0) return "";
  const defaults = defaultDayTags(dates, defaultPerformanceDays);
  let setup = 0;
  let performance = 0;
  let loadOut = 0;
  for (const d of dates) {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    if (tag === "PREP") setup++;
    else if (tag === "LOAD_OUT") loadOut++;
    else performance++;
  }
  const parts = [
    `${tStr("configOptions.arenaSummary.setupLabel", "셋업")}${setup}`,
    `${tStr("configOptions.arenaSummary.performanceLabel", "공연")}${performance}`,
  ];
  if (loadOut > 0) parts.push(`${tStr("configOptions.arenaSummary.loadOutLabel", "철수")}${loadOut}`);
  return parts.join(" · ");
}

// [개정 2026-08-20] 아레나 패키지 4개는 기본 구성이 전부 동일하고 관객 규모 등급(Bowl
// 사용료)만 다르다 — 카드로 나열해 신청자가 직접 하나를 고르게 한다. 고른 패키지에 따라
// 바로 아래 "선택 옵션" 슬롯의 항목이 달라진다(isAddonAvailable).
// [삭제 2026-09-06] "커스텀 박스는 삭제" — 실제 패키지가 아니라 운영자 문의 안내만
// 보여주는 자리표시자 카드("Custom"/"직접구성")를 지웠다. 요청 시 1:1 문의로 안내한다.
// [신규 2026-09-06] "rate 카드 항목 셋팅 설정하는 슬롯을 추가해줘" — 패키지 카드
// (Rate A/B/C/D 박스) 안의 수용인원·권장 무대·권장 객석·대관료 4행을, 다른 슬롯
// (신청 기업 유형·담당자 정보 등)과 같은 순서·노출 패턴으로 어드민에서 조정할 수
// 있게 한다. 할인율·총금액 행은 discountRatio에 따라 값 자체가 조건부로 붙는
// 파생 행이라 이 순서 조정 대상에서 뺀다("총금액이 가장 밑에 들어가야해" 요구를
// 그대로 지키기 위해 항상 맨 뒤 고정).
const PACKAGE_CARD_GROUP_ID = "configOptions.packageCard";
const PACKAGE_CARD_DEFAULT_ORDER = ["audienceCapacity", "recommendedStage", "recommendedSeating", "baseFee"] as const;

function PackagePicker({
  packages,
  addons,
  selectedId,
  onSelect,
  fieldOrders,
  disabledFields,
}: {
  packages: RentalPackage[];
  addons: AddonItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
}) {
  const { t } = useWizardText();

  const configuredCardOrder = fieldOrders?.[PACKAGE_CARD_GROUP_ID];
  const cardOrder =
    configuredCardOrder && configuredCardOrder.length > 0
      ? [
          ...configuredCardOrder.filter((k) => (PACKAGE_CARD_DEFAULT_ORDER as readonly string[]).includes(k)),
          ...PACKAGE_CARD_DEFAULT_ORDER.filter((k) => !configuredCardOrder.includes(k)),
        ]
      : [...PACKAGE_CARD_DEFAULT_ORDER];
  const visibleCardRows = disabledFields?.includes(PACKAGE_CARD_GROUP_ID)
    ? []
    : cardOrder.filter((key) => !disabledFields?.includes(`${PACKAGE_CARD_GROUP_ID}.${key}`));

  // [2026-08-24, "아레나 패키지의 기본 내역이 뭔지 박스로 보여지게 해줘. 수정은
  // 불가능하겠지만"] 이전에는 "기본 시설과 장비가 모두 포함되어 있습니다"라는
  // 안내 문장만 있고 실제 항목은 신청서 제출 후에야 볼 수 있었다 — 패키지 관리
  // (어드민)의 "① 기본 내역"에서 이 패키지에 체크된 항목(ITEM_ONLY)을 그대로
  // 읽기 전용으로 나열한다. 수량 조정은 여기서 하지 않는다(선택 옵션이 아니다).
  const selectedPkg = packages.find((p) => p.id === selectedId);
  const baseItems = (selectedPkg?.includedItems ?? [])
    .map((inc) => {
      const addon = addons.find((a) => a.id === inc.addonId);
      if (!addon) return null;
      return { key: inc.addonId, name: addon.name, quantity: inc.quantity, unit: addon.unitLabel.replace("원/", "") };
    })
    .filter((item): item is { key: string; name: string; quantity: number; unit: string } => item != null);

  return (
    <div className="mb-6 border-b border-border pb-6">
      <label className="block text-s font-bold text-foreground">
        {t("configOptions.pickerFieldLabel", "구성 선택")} *
      </label>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {packages.map((p) => {
          const active = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              /* 고른 카드는 검정 채움 — 안쪽 제목·설명이 따라오도록 토큰을 국소 반전한다 */
              style={active ? CHOICE_SELECTED_VARS : undefined}
              className={choiceClass(active, { dense: true })}
            >
              <div className="text-s font-bold">{p.name}</div>
              <div className="mt-0.5 text-xs text-muted">{p.tagline}</div>
              {/* 대관료 페이지(/rates)의 Rate A~D 표에 있는 권장 무대·객석 정보를 카드에도
                  보여준다(2026-08-22, "권장 무대/객석 정보도... 위저드에서 rate 선택하는
                  내용에 정보 추가해줘") — 신청자가 카드만 보고도 규모·형태를 가늠할 수
                  있게 한다. 대관료는 한 번 뺐다가(2026-08-22, "항목 제거: 대관료 항목")
                  다시 요청받아(2026-08-23, "대관료 행 추가해.. 어제 삭제했지만 다시 넣어")
                  맨 아래 행으로 되돌렸다. */}
              <dl className="mt-2.5 space-y-1 border-t border-border/25 pt-2.5 text-xs">
                {(() => {
                  const rows: Record<string, ReactNode> = {
                    audienceCapacity: (
                      <div key="audienceCapacity" className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted">{t("configOptions.audienceCapacityLabel", "수용인원")}</dt>
                        {/* audienceTier.label 은 "~12,000석 규모"처럼 다른 화면(예상 대관료
                            요약 등)에서 문장 속에 자연스럽게 들어가도록 "규모"가 붙어 있다 —
                            여기서는 라벨과 겹쳐 중복이라 이 카드에서만 뗀다(2026-08-22,
                            "규모 글자 빼"). */}
                        <dd className="font-bold tabular-nums">{p.audienceTier.label.replace(/\s*규모$/, "")}</dd>
                      </div>
                    ),
                    recommendedStage: (
                      <div key="recommendedStage" className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted">{t("configOptions.recommendedStageLabel", "권장 무대")}</dt>
                        <dd className="font-bold">{p.stageType}</dd>
                      </div>
                    ),
                    recommendedSeating: (
                      <div key="recommendedSeating" className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted">{t("configOptions.recommendedSeatingLabel", "권장 객석")}</dt>
                        <dd className="font-bold">{p.seatingType}</dd>
                      </div>
                    ),
                    baseFee: (
                      <div key="baseFee" className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted">{t("configOptions.baseFeeLabel", "대관료")}</dt>
                        {/* [버그 수정 2026-09-06] "할인율 적용되었으니 대관료에는 가로줄 넣어줘" —
                            할인율이 있는 패키지는 대관료가 정가가 아니라는 걸 보여주려고
                            취소선을 긋는다. 실제 지불액은 바로 아래 총금액 행에 그대로 보인다. */}
                        <dd
                          className={`font-bold tabular-nums ${p.discountRatio > 0 ? "text-muted line-through" : ""}`}
                        >
                          {won(p.baseFeePerWeek)}
                        </dd>
                      </div>
                    ),
                  };
                  return visibleCardRows.map((key) => rows[key]);
                })()}
                {/* [신규 2026-09-06] "rate 카드 항목도 추가 가능해야지" — 패키지 관리에서
                    등록한 패키지별 자유 라벨·값 행. 고정 4행 다음, 할인율/총금액 앞에 둔다. */}
                {p.customCardRows.map((row, i) => (
                  <div key={`custom-${i}`} className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="font-bold">{row.value}</dd>
                  </div>
                ))}
                {/* [신규 2026-09-06] 패키지 관리(어드민)에서 설정한 할인율 — 계산 로직
                    (calculateQuote.ts)에는 이미 반영되고 있었지만 카드에는 안 보여
                    신청자가 할인 여부를 몰랐다. "할인율·총금액만 노출, 할인금액은 빼"
                    — 할인 절대금액 행은 없앤다. */}
                {p.discountRatio > 0 && (
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">{t("configOptions.discountRatioLabel", "할인율")}</dt>
                    <dd className="font-bold tabular-nums text-accent">
                      {Math.round(p.discountRatio * 100)}%
                    </dd>
                  </div>
                )}
                {/* [철회 2026-09-06] "패키지 박스 안에서 1일 2회 공연 할증률 항목은 제거..
                    패키지 박스 디자인에서만 빼는거고 로직은 그대로 반영" — 계산 로직
                    (calculateQuote.ts의 secondShowSurchargeRatio 할증)은 그대로 두고
                    카드 표시 행만 없앤다. */}
                {/* [버그 수정 2026-09-06] "총 금액이 가장 밑에 들어가야해" — 할인율·할증률처럼
                    카드에 새로 추가한 행들 아래로, 실제 지불액인 총금액을 맨 마지막 행으로 둔다. */}
                {p.discountRatio > 0 &&
                  (() => {
                    const discountAmount = Math.round(p.baseFeePerWeek * p.discountRatio);
                    return (
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-muted">{t("configOptions.totalAfterDiscountLabel", "총금액")}</dt>
                        <dd className="font-bold tabular-nums">{won(p.baseFeePerWeek - discountAmount)}</dd>
                      </div>
                    );
                  })()}
              </dl>
            </button>
          );
        })}
      </div>

      {selectedId != null && (
        <div className="mt-4 border border-border/30 bg-panel/40 px-4 py-3">
          <span className="bg-foreground px-2 py-0.5 text-xs font-bold text-background">
            {t("configOptions.baseIncludedBadge", "기본 포함")}
          </span>
          <p className="mt-1.5 text-xs leading-5 text-foreground">
            {t("configOptions.baseIncludedHint", "이 구성에는 아래 항목이 별도 비용 없이 기본 포함되어 있습니다.")}
          </p>
          {baseItems.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {baseItems.map((item) => (
                /* [개정 2026-09-02] 수량·단위("2공연일")를 뺐다. 여기는 이 구성에 무엇이
                   들어 있는지 보는 곳이지 몇 개인지 세는 곳이 아니다 — 구성항목(스펙)
                   이름만 남긴다. 수량은 요금표 관리에서 계속 관리하고 금액 계산에도
                   그대로 쓰인다. */
                <div key={item.key} className="border border-border-soft bg-panel px-3 py-2 text-xs">
                  <span className="font-bold text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">
              {t("configOptions.baseIncludedEmpty", "등록된 기본 포함 항목이 없습니다.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function StepConfigOptions({
  rateTable,
  liveHallRateContent,
  stepText,
  selection,
  defaultPerformanceDays,
  addonQuantities,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
  onSelectPackage,
  headingOverride,
  fieldOrders,
  disabledFields,
}: {
  rateTable: RateTable;
  liveHallRateContent: VenueRateContent;
  stepText: WizardStepTexts;
  selection: QuoteSelection;
  defaultPerformanceDays: number;
  addonQuantities: Record<string, number>;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
  onSelectPackage: (packageId: number) => void;
  /** 관리자 문구 미리보기 전용 — 제목·리드를 편집 가능한 입력으로 바꿔치기한다. */
  headingOverride?: { title: ReactNode; lead?: ReactNode };
  /** [신규 2026-09-06] "각 슬롯 내에 있는 각 항목들 순서 조정·노출 On/off" — 패키지
   *  카드(Rate A/B/C/D 박스) 행에도 같은 패턴을 적용한다. */
  fieldOrders?: Record<string, string[]>;
  disabledFields?: string[];
}) {
  const { t, tStr } = useWizardText();
  const midHallOnly = selection.venueId === MID_HALL_VENUE_ID && selection.bookingMode === "SINGLE";
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const pkg = findPackage(rateTable, selection.packageId);
  // 패키지 공간을 단독으로 고르면 그 공간의 패키지를 보여 준다 — 아레나와 같은
  // 패키지 모델이라 공간 id 만 갈아 끼우면 같은 화면이 선다.
  const venuePackages = packagesForVenue(
    rateTable,
    selection.venueId === SPECIAL_VENUE_ID && !isSimultaneous ? SPECIAL_VENUE_ID : "arena",
  );
  const [venueTab, setVenueTab] = useState<string>("arena");

  if (midHallOnly) {
    return (
      <section>
        <StepHeading
          title={headingOverride?.title ?? stepText.configMidHallOnlyTitle}
          lead={headingOverride?.lead ?? stepText.configMidHallOnlyLead}
        />

        <MidHallRateCard
          content={liveHallRateContent}
          extraHourFee={rateTable.midHall.extraHourFee}
          extraSetupHours={selection.midHallExtraSetupHours}
          extraLoadOutHours={selection.midHallExtraLoadOutHours}
        />
      </section>
    );
  }

  const grouped = new Map<AddonCategory, AddonItem[]>();
  if (pkg) {
    for (const addon of rateTable.addons) {
      if (!isAddonAvailable(addon, pkg)) continue;
      if (addon.visibility === "HIDDEN") continue; // 자동 산입 항목 — 신청자가 선택하는 화면이 아니다 (2-71)
      if (addon.visibility === "ITEM_ONLY") continue; // 기본 구성 전용 항목 — 별도 구매 옵션이 아니다
      // 유틸리티(전기·수도·냉난방 등)는 사후 정산 항목이라 신청자가 고르는 화면이
      // 아니다 — visibility가 VISIBLE로 잘못 설정돼 있어도 반드시 제외한다
      // (2026-08-24, "일반전기,상하수도 등은 옵션에 선택을 안했는데 노출이 되고 있어").
      if (addon.billingPhase === "SETTLEMENT") continue;
      const list = grouped.get(addon.category) ?? [];
      list.push(addon);
      grouped.set(addon.category, list);
    }
  }

  // [화면 뼈대 2026-08-19, 화면시나리오 STEP 3-3 #①⑤ "금액 노출 시점"] 이 화면(STEP 2 구성·옵션)
  // 에서는 금액을 노출하지 않는다 — 선택된 옵션 건수만 보여주고, 실제 금액은 다음 화면(예상
  // 대관료)에서 처음 확인한다.
  const selectedOptionCount = [...grouped.values()]
    .flat()
    .filter((addon) => (addonQuantities[addon.id] ?? 0) > 0).length;

  // [개정 2026-08-21] 선택 옵션 목록은 더 이상 카테고리로 묶지 않는다 — 단일 세로 목록으로
  // 평탄화해서 더 가벼운 화면으로 보여준다(요청 시안 기준).
  const flatAddons = [...grouped.values()].flat();

  const arenaSection = (
    <>
      {/* [개정 2026-08-21] 동시 대관은 이미 위에 "아레나/중형공연장" 탭이 있어 그 아래 또
          "아레나" 라벨을 반복하지 않는다 — 탭 없이 단독으로 쓰이는 단일 아레나 예약에서만
          이 헤더가 화면의 유일한 제목이라 남긴다. */}
      {!isSimultaneous && (
        <StepHeading
          title={headingOverride?.title ?? stepText.configArenaTitle}
          lead={
            pkg
              ? `${pkg.name} · ${pkg.audienceTier.label} · ${tStr("configOptions.arenaSummary.expectedAudienceLabel", "예상 관객")} ${selection.expectedAudience.toLocaleString()}${tStr("configOptions.arenaSummary.peopleUnit", "명")} · ${arenaSummaryLine(selection, defaultPerformanceDays, tStr)}`
              : undefined
          }
        />
      )}

      <div className="mt-8">
        <PackagePicker
          packages={venuePackages}
          addons={rateTable.addons}
          selectedId={selection.packageId}
          onSelect={onSelectPackage}
          fieldOrders={fieldOrders}
          disabledFields={disabledFields}
        />
      </div>

      {!pkg ? (
        <p className="text-s text-muted">
          {t("configOptions.pickPackageFirst", "위에서 구성을 선택하면 선택 옵션을 확인할 수 있습니다.")}
        </p>
      ) : (
        /* 선택 옵션 = 아웃라인 박스. 색면을 쓰지 않는다 — 안의 항목도 아웃라인만이다 */
        <div className="mt-6 border border-border/25 p-5">
          <h2 className="type-kr-heading text-h6-m sm:text-h6">{t("configOptions.selectedOptionsHeading", "선택 옵션")}</h2>
          <p className="mt-2 text-xs text-muted">
            {t(
              "configOptions.selectedOptionsHint",
              "필요한 만큼 수량을 정해 추가하는 항목 — 단가 × 수량으로 금액이 즉시 계산됩니다",
            )}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {flatAddons.map((addon) => (
              <AddonRow
                key={addon.id}
                addon={addon}
                pkg={pkg}
                quantity={addonQuantities[addon.id] ?? 0}
                expectedRevenue={expectedRevenue}
                onChangeQuantity={onChangeQuantity}
                onChangeRevenue={onChangeRevenue}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4 text-s font-bold">
            <span>{t("configOptions.selectedOptionsHeading", "선택 옵션")}</span>
            <span className="tabular-nums">
              {selectedOptionCount}
              {t("configOptions.selectedCountSuffix", "건 선택됨")}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {t(
              "configOptions.selectedOptionsFooterNote",
              "청소 사용료 · 수도광열비 · 추가 광고 구좌 등은 별도입니다. 금액은 표시하지 않으며, " +
                "선택을 마치면 다음 화면(예상 대관료)에서 총액을 확인합니다.",
            )}
            <br />
            {t("configOptions.overCapacityNote", "※ 신청 규모를 초과해 좌석을 오픈하는 경우 사후 정산 시 추가 과금됩니다.")}
          </p>
        </div>
      )}
    </>
  );

  if (!isSimultaneous) {
    return <section>{arenaSection}</section>;
  }

  const midHallSection = (
    <MidHallRateCard
      content={liveHallRateContent}
      extraHourFee={rateTable.midHall.extraHourFee}
      extraSetupHours={selection.midHallExtraSetupHours}
      extraLoadOutHours={selection.midHallExtraLoadOutHours}
    />
  );

  // 세 번째 공간("패키지")은 아레나와 같은 패키지 모델이라 구성 목록을 그대로 보여준다.
  // 동시 대관 요금 계산에는 아직 들어가지 않으므로 여기서는 "무엇이 있는지"를 읽는
  // 자리다 — 금액이 합산되는 것처럼 보이지 않게 선택은 받지 않는다.
  const specialPackages = packagesForVenue(rateTable, SPECIAL_VENUE_ID);
  const specialSection =
    specialPackages.length > 0 ? (
      <PackagePicker
        packages={specialPackages}
        addons={rateTable.addons}
        selectedId={null}
        onSelect={() => {}}
        fieldOrders={fieldOrders}
        disabledFields={disabledFields}
      />
    ) : null;

  // 탭 이름의 정본은 venue.<id>.name(문구 관리 「공간 이름」) — 위저드·패키지 관리가
  // 같은 말을 쓰도록 한 곳에서 읽는다. 예전 key 로 고쳐 둔 문구는 잃지 않게 뒤로 물린다.
  const venueTabs = [
    {
      id: "arena",
      label: tStr(venueLabelKey("arena"), tStr("configOptions.arenaTabLabel", defaultVenueName("arena"))),
    },
    {
      id: MID_HALL_VENUE_ID,
      label: tStr(
        venueLabelKey(MID_HALL_VENUE_ID),
        tStr("configOptions.mediumHallTabLabel", defaultVenueName(MID_HALL_VENUE_ID)),
      ),
    },
    ...(specialSection
      ? [
          {
            id: SPECIAL_VENUE_ID,
            label: tStr(venueLabelKey(SPECIAL_VENUE_ID), defaultVenueName(SPECIAL_VENUE_ID)),
          },
        ]
      : []),
  ];

  return (
    <section>
      <StepHeading
        title={headingOverride?.title ?? stepText.configSimultaneousTitle}
        lead={headingOverride?.lead ?? stepText.configSimultaneousLead}
      />

      {/* [개정 2026-09-02] "패키지" 탭을 중형 옆에 세운다. 등록된 패키지가 있을 때만
          내보낸다 — 요금표에 아무것도 없는 공간의 탭은 눌러도 빈 화면이라, 있는 것처럼
          보이기만 하고 신청은 못 하는 상태가 된다. */}
      <div className="mt-8 flex gap-1 border-b border-border">
        {venueTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setVenueTab(tab.id)}
            className={[
              "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
              venueTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {venueTab === MID_HALL_VENUE_ID
          ? midHallSection
          : venueTab === SPECIAL_VENUE_ID
            ? specialSection
            : arenaSection}
      </div>
    </section>
  );
}

function AddonRow({
  addon,
  pkg,
  quantity,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  addon: AddonItem;
  pkg: RentalPackage | undefined;
  quantity: number;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
}) {
  const { t, tStr } = useWizardText();
  const isRevenue = addon.pricingType === "REVENUE_PERCENT";

  // 운영자가 요금표 관리에서 정한 상한. 판정은 rateTableUtils 한 곳에서 하고 금액
  // 계산도 같은 함수로 자른다 — 화면에서만 막으면 폼을 우회한 요청이 그대로 통과한다.
  const maxTotal = maxRequestableQuantity(addon, pkg);

  const priceLabel = isRevenue
    ? `${tStr("configOptions.revenuePrefix", "매출")} ${addon.unitPrice}%`
    : `${won(addon.unitPrice)} / ${addon.unitLabel.replace("원/", "")}`;

  // 항목은 아웃라인만이다. 선택 여부로 면 색을 바꾸지 않는다 —
  // 수량을 적는 칸이 안에 있어서 면 색이 바뀌면 입력한 숫자가 묻힌다.
  return (
    <div className="flex flex-col gap-1.5 border border-border-soft px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold">{addon.name}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {addon.unitLabel}
          {addon.spec ? ` · ${addon.spec}` : ""}
          {addon.note ? ` · ${addon.note}` : ""}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="whitespace-nowrap text-xs text-muted">{priceLabel}</span>

        {isRevenue ? (
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
              <input
                type="checkbox"
                checked={quantity > 0}
                onChange={(e) => onChangeQuantity(addon.id, e.target.checked ? 1 : 0)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              {t("configOptions.applyCheckboxLabel", "적용")}
            </label>
            <input
              type="number"
              min={0}
              step={1_000_000}
              placeholder={tStr("configOptions.expectedRevenuePlaceholder", "예상매출")}
              value={expectedRevenue || ""}
              disabled={quantity <= 0}
              onChange={(e) => onChangeRevenue(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 shrink-0 border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-foreground disabled:opacity-40"
            />
          </div>
        ) : (
          /* [개정 2026-09-02] number 입력의 max 속성은 **타이핑을 막지 못한다** —
             상한이 3인 항목에 6 을 그대로 칠 수 있었고 그 값이 제출됐다.
             입력 시점에 잘라 넣고, 상한이 있으면 칸 옆에 적어 준다. */
          <span className="flex shrink-0 items-center gap-1.5">
            {maxTotal !== undefined ? (
              <span className="whitespace-nowrap text-xs text-muted">
                {t("configOptions.maxQuantityHint", "최대")} {maxTotal}
              </span>
            ) : null}
            <input
              type="number"
              min={0}
              max={maxTotal}
              value={quantity || ""}
              placeholder="0"
              onChange={(e) =>
                onChangeQuantity(addon.id, clampAddonQuantity(addon, pkg, Number(e.target.value)))
              }
              className="w-14 shrink-0 border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-foreground"
            />
          </span>
        )}
      </div>
    </div>
  );
}
