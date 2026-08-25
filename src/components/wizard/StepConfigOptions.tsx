"use client";

import { useState, type ReactNode } from "react";
import { won } from "@/lib/format";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  defaultDayTags,
  effectiveDayTag,
  findPackage,
  includedQuantity,
  isAddonAvailable,
  packagesForVenue,
} from "@/lib/pricing/rateTableUtils";
import {
  type AddonCategory,
  type AddonItem,
  type QuoteSelection,
  type RateTable,
  type RentalPackage,
} from "@/lib/pricing/types";
import type { ChargeBlock, VenueRateContent, WizardStepTexts } from "@/lib/content/pageContent";
import { CHOICE_SELECTED_VARS, ComparisonTable, choiceClass, type SpecGroup } from "@/components/ui/kit";
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
  label: string;
  hint: string;
  hours: number;
  unitFee: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 border border-border-soft px-3 py-2">
      <div>
        <span className="text-xs font-bold">{label}</span>
        <div className="mt-0.5 text-xs text-muted">{hint}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-xs text-muted">{won(unitFee)} / 시간</span>
        <span className="text-xs font-bold tabular-nums">{hours}시간</span>
      </div>
    </div>
  );
}

/** 참고용 박스 — 가격이 "별도 협의"·"실비"라 수량을 받아도 견적에 반영할 수 없는
 * 항목(팝업 공간·옥외 광고·수도광열비 등)은 안내만 하는 카드로 보여준다. */
function MidHallReferenceBox({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1.5 border border-border-soft px-3 py-2">
      <span className="text-xs font-bold">{label}</span>
      <span className="text-xs text-muted">
        {value}
        {note ? ` · ${note}` : ""}
      </span>
      <span className="text-xs font-bold text-muted">별도 문의</span>
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const otherGroups = chargeGroups(content.charges).filter((g) => g.title !== "추가대관");

  return (
    <div className="mt-10 border-t-2 border-foreground pt-5">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">일자별 대관료</h2>
      <div className="mt-4">
        <ComparisonTable
          rowLabel="구분"
          columns={cols}
          rows={detailsOpen ? [...baseRows, ...detailRows] : baseRows}
        />
      </div>

      {detailRows.length > 0 && (
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-3 cursor-pointer text-s font-bold"
        >
          {detailsOpen ? "Details ▲" : "Details ▼"}
        </button>
      )}

      {content.includes.length > 0 && (
        <div className="mt-10 border-t border-border/25 pt-5">
          <h2 className="type-kr-heading text-h6-m sm:text-h6">기본 항목</h2>
          <p className="mt-1.5 text-xs leading-6 text-muted">대관료에 이미 포함된 기본 제공 사항입니다.</p>
          <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {content.includes.map((p, i) => (
              <div key={`${p.label}-${i}`} className="flex flex-col gap-1.5 border border-border-soft px-3 py-2">
                <span className="text-xs font-bold">{p.label}</span>
                <span className="text-xs text-muted">{p.value}</span>
                <span className="text-xs font-bold text-good">기본 포함</span>
              </div>
            ))}
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
          <h2 className="type-kr-heading text-h6-m sm:text-h6">옵션</h2>
          <p className="mt-1.5 text-xs leading-6 text-muted">
            추가대관 시간은 STEP 1 캘린더에서 설정한 값이 그대로 표시됩니다 — 여기서는 수정할 수
            없고, 바꾸려면 STEP 1로 돌아가 캘린더에서 조정하세요. 나머지 항목은 참고용 안내이며
            예상 대관료에는 자동 반영되지 않습니다 — 필요 시 별도로 협의합니다.
          </p>

          <div className="mt-4">
            <div className="mb-2 text-xs font-bold text-muted">추가대관</div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              <MidHallHourBox
                label="셋업 연장 (22:00~24:00)"
                hint="전체 일정 공통 적용"
                hours={extraSetupHours}
                unitFee={extraHourFee}
              />
              <MidHallHourBox
                label="철수 Load-Out 연장"
                hint="전체 일정 공통 적용"
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
      )}

      {content.notes.length > 0 && (
        <ul className="mt-8 space-y-2">
          {content.notes.map((t, i) => (
            <li key={`${t}-${i}`} className="break-keep text-xs leading-5 text-muted">
              ※ {t}
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
function arenaSummaryLine(selection: QuoteSelection, defaultPerformanceDays: number): string {
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
  const parts = [`셋업${setup}`, `공연${performance}`];
  if (loadOut > 0) parts.push(`철수${loadOut}`);
  return parts.join(" · ");
}

// [개정 2026-08-20] 아레나 패키지 4개는 기본 구성이 전부 동일하고 관객 규모 등급(Bowl
// 사용료)만 다르다 — 카드로 나열해 신청자가 직접 하나를 고르게 한다. 고른 패키지에 따라
// 바로 아래 "선택 옵션" 슬롯의 항목이 달라진다(isAddonAvailable).
// [개정 2026-08-21] "Custom" 카드는 실제 패키지가 아니다 — 클릭해도 견적 계산에 참여하지
// 않고 운영자 문의 안내만 보여주는 자리표시자다. rateTable.packages에 없는 항목이라
// packages 배열과 별개로 하드코딩한다.
function PackagePicker({
  packages,
  addons,
  selectedId,
  onSelect,
  onClear,
}: {
  packages: RentalPackage[];
  addons: AddonItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClear: () => void;
}) {
  const [showCustomNotice, setShowCustomNotice] = useState(false);

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
      <label className="block text-s font-bold text-foreground">구성 선택 *</label>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {packages.map((p) => {
          const active = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setShowCustomNotice(false);
                onSelect(p.id);
              }}
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
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">수용인원</dt>
                  {/* audienceTier.label 은 "~12,000석 규모"처럼 다른 화면(예상 대관료
                      요약 등)에서 문장 속에 자연스럽게 들어가도록 "규모"가 붙어 있다 —
                      여기서는 라벨과 겹쳐 중복이라 이 카드에서만 뗀다(2026-08-22,
                      "규모 글자 빼"). */}
                  <dd className="font-bold tabular-nums">{p.audienceTier.label.replace(/\s*규모$/, "")}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">권장 무대</dt>
                  <dd className="font-bold">{p.stageType}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">권장 객석</dt>
                  <dd className="font-bold">{p.seatingType}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">대관료</dt>
                  <dd className="font-bold tabular-nums">{won(p.baseFeePerWeek)}</dd>
                </div>
              </dl>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            // Custom은 실제 패키지가 아니라 packageId로 표현할 수 없다 — 이전에 고른
            // 패키지가 남아 있으면 카드 두 개가 동시에 선택된 것처럼 보이므로 여기서
            // 함께 지운다(2026-08-22, "커스텀 선택 시 다른 패키지가 선택 해제되지
            // 않는다" 리포트).
            onClear();
            setShowCustomNotice(true);
          }}
          style={showCustomNotice ? CHOICE_SELECTED_VARS : undefined}
          className={`${choiceClass(showCustomNotice, { dense: true })} border-dashed`}
        >
          <div className="text-s font-bold">Custom</div>
          <div className="mt-0.5 text-xs text-muted">직접구성</div>
        </button>
      </div>

      {showCustomNotice && (
        <p className="mt-3 border border-border/30 bg-panel px-3 py-2.5 text-xs text-muted-strong">
          운영자 문의가 필요한 맞춤 구성입니다. 1:1 문의 또는 담당자에게 연락해 주세요.
        </p>
      )}

      {selectedId != null && (
        <div className="mt-4 border border-border/30 bg-panel/40 px-4 py-3">
          <span className="bg-foreground px-2 py-0.5 text-xs font-bold text-background">기본 포함</span>
          <p className="mt-1.5 text-xs leading-5 text-foreground">
            이 구성에는 아래 항목이 별도 비용 없이 기본 포함되어 있습니다.
          </p>
          {baseItems.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {baseItems.map((item) => (
                <div key={item.key} className="border border-border-soft bg-panel px-3 py-2 text-xs">
                  <span className="font-bold text-foreground">{item.name}</span>
                  <span className="ml-1.5 text-muted">
                    {item.quantity}
                    {item.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">등록된 기본 포함 항목이 없습니다.</p>
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
  onClearPackage,
  headingOverride,
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
  onClearPackage: () => void;
  /** 관리자 문구 미리보기 전용 — 제목·리드를 편집 가능한 입력으로 바꿔치기한다. */
  headingOverride?: { title: ReactNode; lead?: ReactNode };
}) {
  const midHallOnly = selection.venueId === "medium-hall" && selection.bookingMode === "SINGLE";
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const pkg = findPackage(rateTable, selection.packageId);
  const arenaPackages = packagesForVenue(rateTable, "arena");
  const [venueTab, setVenueTab] = useState<"arena" | "medium-hall">("arena");

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
              ? `${pkg.name} · ${pkg.audienceTier.label} · 예상 관객 ${selection.expectedAudience.toLocaleString()}명 · ${arenaSummaryLine(selection, defaultPerformanceDays)}`
              : undefined
          }
        />
      )}

      <div className="mt-8">
        <PackagePicker
          packages={arenaPackages}
          addons={rateTable.addons}
          selectedId={selection.packageId}
          onSelect={onSelectPackage}
          onClear={onClearPackage}
        />
      </div>

      {!pkg ? (
        <p className="text-s text-muted">위에서 구성을 선택하면 선택 옵션을 확인할 수 있습니다.</p>
      ) : (
        /* 선택 옵션 = 아웃라인 박스. 색면을 쓰지 않는다 — 안의 항목도 아웃라인만이다 */
        <div className="mt-6 border border-border/25 p-5">
          <h2 className="type-kr-heading text-h6-m sm:text-h6">선택 옵션</h2>
          <p className="mt-2 text-xs text-muted">
            필요한 만큼 수량을 정해 추가하는 항목 — 단가 × 수량으로 금액이 즉시 계산됩니다
          </p>
          <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {flatAddons.map((addon) => (
              <AddonRow
                key={addon.id}
                addon={addon}
                included={includedQuantity(pkg, addon.id)}
                quantity={addonQuantities[addon.id] ?? 0}
                expectedRevenue={expectedRevenue}
                onChangeQuantity={onChangeQuantity}
                onChangeRevenue={onChangeRevenue}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4 text-s font-bold">
            <span>선택 옵션</span>
            <span className="tabular-nums">{selectedOptionCount}건 선택됨</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            청소 사용료 · 수도광열비 · 추가 광고 구좌 등은 별도입니다. 금액은 표시하지 않으며,
            선택을 마치면 다음 화면(예상 대관료)에서 총액을 확인합니다.
            <br />※ 신청 규모를 초과해 좌석을 오픈하는 경우 사후 정산 시 추가 과금됩니다.
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

  return (
    <section>
      <StepHeading
        title={headingOverride?.title ?? stepText.configSimultaneousTitle}
        lead={headingOverride?.lead ?? stepText.configSimultaneousLead}
      />

      <div className="mt-8 flex gap-1 border-b border-border">
        {(["arena", "medium-hall"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setVenueTab(tab)}
            className={[
              "flex h-10 items-center border-b-2 px-4 text-s font-bold transition-colors",
              venueTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {tab === "arena" ? "아레나" : "중형공연장"}
          </button>
        ))}
      </div>

      <div className="mt-6">{venueTab === "arena" ? arenaSection : midHallSection}</div>
    </section>
  );
}

function AddonRow({
  addon,
  included,
  quantity,
  expectedRevenue,
  onChangeQuantity,
  onChangeRevenue,
}: {
  addon: AddonItem;
  included: number;
  quantity: number;
  expectedRevenue: number;
  onChangeQuantity: (addonId: string, quantity: number) => void;
  onChangeRevenue: (value: number) => void;
}) {
  const isRevenue = addon.pricingType === "REVENUE_PERCENT";

  const maxTotal =
    addon.availability.maxAddQuantity && addon.availability.maxAddQuantity !== "UNLIMITED"
      ? included + addon.availability.maxAddQuantity
      : undefined;

  const priceLabel = isRevenue
    ? `매출 ${addon.unitPrice}%`
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
              적용
            </label>
            <input
              type="number"
              min={0}
              step={1_000_000}
              placeholder="예상매출"
              value={expectedRevenue || ""}
              disabled={quantity <= 0}
              onChange={(e) => onChangeRevenue(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 shrink-0 border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-foreground disabled:opacity-40"
            />
          </div>
        ) : (
          <input
            type="number"
            min={0}
            max={maxTotal}
            value={quantity || ""}
            placeholder="0"
            onChange={(e) =>
              onChangeQuantity(addon.id, Math.max(0, Number(e.target.value) || 0))
            }
            className="w-14 shrink-0 border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-foreground"
          />
        )}
      </div>
    </div>
  );
}
