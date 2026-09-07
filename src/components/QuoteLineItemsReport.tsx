import { won } from "@/lib/format";
import type { LineItem, QuoteSelection } from "@/lib/pricing/types";
import {
  estimateLineLabel,
  isHiddenFromApplicant,
  isMidHallLineItem,
  SECTION_GROUPS,
  SECTION_LABEL,
  SECTION_SUBTOTAL_LABEL,
  feeGroupOf,
  type ContractSection,
} from "@/lib/pricing/lineItemGroups";

// [공유 2026-08-20] 위저드(Step5Estimate) · 마이페이지 신청 상세 · 인쇄용 신청서, 세 화면
// 모두 같은 산출내역 표를 보여줘야 한다는 요청에 따라, 표 렌더링을 이 한 컴포넌트로
// 공유한다 — 세 화면이 서로 다른 내용으로 보이는 것을 막는다. 동시 대관은 아레나/중형
// 소계를 각각 보여주고(요청: "아레나·중형 비용이 나눠져서 보여지고"), 최종 합계는 이
// 컴포넌트를 호출하는 화면(Step5Estimate 등)에서 두 소계를 합산해 별도로 보여준다
// (요청: "합산 통합으로도 보여지고").
//
// [개정 2026-09-08] "이건 눈에 너무 안 들어와.. 오른쪽 플로팅 박스 구조 기준으로
// 맞춘거야" — 얇은 선으로만 구분되던 표를 오른쪽 실시간 요약 패널(SummaryPanel)과
// 같은 박스 언어(border-border/25 bg-surface + 강조된 소계 줄)로 다시 그렸다. 항목
// 라벨은 SummaryPanel과 다른 규칙(estimateLineLabel)을 쓴다 — "할증은 말고, 추가일에
// 대한 할인율도 넣어줘" 요청으로 할증(2회 공연·중형 주말/평일 2회) %는 감추고 추가일
// (준비일·공연일 추가) 할인율은 그대로 보여준다. 이 규칙은 이 표(왼쪽 예상 금액
// 영역)에만 적용하고, SummaryPanel(오른쪽 플로팅 박스)은 손대지 않는다.
export function QuoteLineItemsReport({
  selection,
  lineItems,
  expectedRevenue,
  showHidden = false,
  dense = false,
}: {
  selection: QuoteSelection;
  lineItems: LineItem[];
  expectedRevenue: number;
  showHidden?: boolean;
  dense?: boolean;
}) {
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";

  // 청소비·유틸리티처럼 감춘 항목도 실제로는 과금돼 소계에 포함돼 있다(SummaryPanel과
  // 같은 규칙) — 행은 visibleItems 만으로 그리되, 소계 금액은 감추지 않은 전체
  // lineItems(allItems) 기준으로 낸다.
  const visibleItems = lineItems.filter((item) => showHidden || !isHiddenFromApplicant(item));
  const arenaItems = visibleItems.filter((item) => !isMidHallLineItem(item));
  const midHallItems = visibleItems.filter(isMidHallLineItem);
  const arenaAllItems = lineItems.filter((item) => !isMidHallLineItem(item));
  const midHallAllItems = lineItems.filter(isMidHallLineItem);

  if (isSimultaneous) {
    return (
      <>
        <VenueLineItemGroup
          title="아레나"
          items={arenaItems}
          allItems={arenaAllItems}
          expectedRevenue={expectedRevenue}
          dense={dense}
        />
        <VenueLineItemGroup
          title="중형공연장"
          items={midHallItems}
          allItems={midHallAllItems}
          expectedRevenue={expectedRevenue}
          dense={dense}
        />
      </>
    );
  }

  return (
    <VenueLineItemGroup items={visibleItems} allItems={lineItems} expectedRevenue={expectedRevenue} dense={dense} />
  );
}

function VenueLineItemGroup({
  title,
  items,
  allItems,
  expectedRevenue,
  dense,
}: {
  title?: string;
  items: LineItem[];
  allItems: LineItem[];
  expectedRevenue: number;
  dense: boolean;
}) {
  return (
    <div className="mt-6">
      {title && <h3 className="border-b-2 border-foreground pb-2 text-s font-bold text-foreground">{title}</h3>}
      <SectionBox
        section="CONTRACT"
        items={items}
        allItems={allItems}
        expectedRevenue={expectedRevenue}
        dense={dense}
      />
      <SectionBox
        section="ADDITIONAL"
        items={items}
        allItems={allItems}
        expectedRevenue={expectedRevenue}
        dense={dense}
      />
    </div>
  );
}

// 항목 아래 보조 줄 — "수량 등의 정보가 추가로 보여지는 정도"(2026-09-08, 예상 대관료는
// 실시간 패널보다 조금 더 자세해도 된다는 허용 범위) 로 수량 × 단가를 덧붙인다.
// "포함"으로 상계된 항목(패키지에 이미 포함된 수량 안에서 쓴 경우)은 금액 칸에서
// 이미 "포함"이라고 말하므로 여기서는 생략한다.
function itemDetail(item: LineItem, expectedRevenue: number): string | null {
  const isIncluded = item.included > 0 && item.billable === 0 && item.amount === 0;
  if (isIncluded) return null;
  // [수정 2026-09-08] "대관료 할인 항목에도 수량 1 이런식으로 넣어놨던데 대관료에
  // 수량이라는 단위가 아예 안 맞지" — 할인은 개수로 세는 게 아니라 뺄 수 없다.
  if (item.addonId === "package_discount") return null;
  if (item.pricingType === "REVENUE_PERCENT") {
    return `${won(expectedRevenue)} × ${item.unitPrice}%`;
  }
  return `수량 ${item.requested.toLocaleString()} · 단가 ${won(item.unitPrice)}`;
}

function SectionBox({
  section,
  items,
  allItems,
  expectedRevenue,
  dense,
}: {
  section: ContractSection;
  items: LineItem[];
  allItems: LineItem[];
  expectedRevenue: number;
  dense: boolean;
}) {
  const groupKeys = SECTION_GROUPS[section];
  const sectionItems = items.filter((item) => groupKeys.includes(feeGroupOf(item)));
  // 소계는 감춘 항목(청소비 등)까지 포함한 allItems 기준 — 행은 sectionItems(보이는 것)만 그린다.
  const subtotal = allItems
    .filter((item) => groupKeys.includes(feeGroupOf(item)))
    .reduce((sum, item) => sum + item.amount, 0);
  const rowPad = dense ? "py-2" : "py-2.5";

  // [개정 2026-09-08] "세부 내역.. 옅은 그레이로 표기한 부분을 별도 열로 분리해..
  // 앞엔 항목이라면 두번째는 세부내역으로" — 항목 라벨 아래 옅은 회색 보조줄이던
  // 수량·단가 정보를 라벨과 같은 줄의 독립된 열로 뺐다(항목 / 세부내역 / 금액).
  const COLS = "grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]";

  return (
    <div className={`${dense ? "mt-3 p-3" : "mt-4 p-4"} border border-border/25 bg-surface`}>
      <p className="text-xs font-bold text-foreground">{SECTION_LABEL[section]}</p>
      {sectionItems.length === 0 ? (
        <p className="mt-2 border-t border-border/25 pt-3 text-xs text-muted">선택된 항목이 없습니다.</p>
      ) : (
        <dl className="mt-2 border-t border-border/25">
          <div className={`grid ${COLS} gap-4 pt-2 text-xs font-bold text-muted`}>
            <span>항목</span>
            <span>세부내역</span>
            <span className="text-right">금액</span>
          </div>
          {sectionItems.map((item) => {
            const isIncluded = item.included > 0 && item.billable === 0 && item.amount === 0;
            const detail = itemDetail(item, expectedRevenue);
            return (
              <div
                key={item.addonId}
                className={`grid ${COLS} items-baseline gap-4 border-b border-border/15 ${rowPad}`}
              >
                <dt className="text-s font-bold text-foreground">{estimateLineLabel(item)}</dt>
                <dd className="text-xs text-muted">{detail}</dd>
                <dd
                  className={`text-right text-s font-bold tabular-nums ${isIncluded ? "text-good" : "text-foreground"}`}
                >
                  {isIncluded ? "포함" : won(item.amount)}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      {/* [개정 2026-09-08] "대관료/추가 옵션 박스마다 총액을 강조 표시" — SummaryPanel과
          같은 언어(테두리 + 옅은 배경)로 소계를 감싼다. */}
      <div className="mt-3 flex justify-between border border-accent bg-accent-soft/40 px-3 py-2.5 text-s font-bold text-foreground">
        <span>{SECTION_SUBTOTAL_LABEL[section]}</span>
        <span className="tabular-nums">{won(subtotal)}</span>
      </div>
    </div>
  );
}
