"use client";

import { toggleClass } from "@/components/ui/kit";
import type { MarketingCooperation } from "@/lib/pricing/types";
import { StepHeading, StepForm } from "./StepHeading";

const EMPTY_CHANNEL = { platform: "", handle: "", followers: "" };

// 티켓 판매량·판매율 데이터 제공 체크박스가 정확히 무엇을 포함하는지 보여주는
// 항목 — 표나 박스가 아니라 체크박스 라벨 밑에 텍스트로만 나열한다(2026-08-22,
// "취득 어쩌구는 우리 서울아레나 입장" · "표로 넣지 말고 텍스트로 나열" 피드백).
const SALES_DATA_ITEMS = [
  "총 판매매수",
  "유료 판매율",
  "판매가능 객석수",
  "좌석등급별 판매율",
  "일자별 판매 추이",
  "평균 객단가",
  "티켓 가격대",
  "총 티켓 매출액",
  "예매처별 판매 비중",
];

export function StepMarketingCooperation({
  info,
  onChange,
}: {
  info: MarketingCooperation;
  onChange: (info: MarketingCooperation) => void;
}) {
  function set<K extends keyof MarketingCooperation>(key: K, value: MarketingCooperation[K]) {
    onChange({ ...info, [key]: value });
  }

  function addChannel() {
    set("channels", [...info.channels, { ...EMPTY_CHANNEL }]);
  }

  function updateChannel(index: number, patch: Partial<MarketingCooperation["channels"][number]>) {
    set(
      "channels",
      info.channels.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeChannel(index: number) {
    set(
      "channels",
      info.channels.filter((_, i) => i !== index),
    );
  }

  function addSponsorship() {
    set("sponsorships", [...info.sponsorships, { brandName: "", campaignSummary: "" }]);
  }

  function updateSponsorship(index: number, patch: Partial<MarketingCooperation["sponsorships"][number]>) {
    set(
      "sponsorships",
      info.sponsorships.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeSponsorship(index: number) {
    set(
      "sponsorships",
      info.sponsorships.filter((_, i) => i !== index),
    );
  }

  return (
    <section>
      <StepHeading title="홍보 및 서비스 계획" lead="프로모션 및 협업 관련 정보를 입력해 주세요." />

      <StepForm>
        <div className="border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">프로모션 채널</h3>
            <button type="button" onClick={addChannel} className={toggleClass(false)}>
              ＋ 채널 추가
            </button>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            공연 운영 채널이 있다면 입력해주세요. 서울아레나와 연계하여 홍보 가능합니다.
          </p>
          {info.channels.length === 0 && <p className="text-xs text-muted">등록된 채널이 없습니다.</p>}
          <div className="space-y-2">
            {info.channels.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-border/15 py-2 sm:grid-cols-[1fr_2fr_1fr_auto]"
              >
                <input
                  value={row.platform}
                  placeholder="채널 (예: 인스타그램)"
                  onChange={(e) => updateChannel(i, { platform: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.handle}
                  placeholder="계정 / URL"
                  onChange={(e) => updateChannel(i, { handle: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.followers}
                  placeholder="구독자·팔로워 수"
                  onChange={(e) => updateChannel(i, { followers: e.target.value })}
                  className="field-base"
                />
                <button
                  type="button"
                  onClick={() => removeChannel(i)}
                  aria-label="채널 삭제"
                  // 입력 필드와 같은 무게의 버튼(보더·박스)이 아니라 옆에 딸린 보조
                  // 동작이라는 걸 보여주려고 아이콘만 둔다 — 삭제 버튼이 입력창과
                  // 같은 위계로 보인다는 지적으로 바꿨다.
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">홍보 및 서비스 노출</h3>

          {/* 대관사가 부담 없이 읽을 수 있게 문장은 부드럽게 풀어 쓰되(2026-08-22,
              "대관사가 잘 이해할 수 있게 부드럽게" 피드백), "무엇을(활용 대상)"과
              "어디에(노출 및 활용 범위)"는 서로 다른 질문이라 한 박스로 뭉치지 않고
              두 박스로 나눠 보여준다("활용대상 박스, 노출/활용 범위박스를 두개 나눠서"). */}
          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            서울아레나는 공연·행사를 더 많은 관람객에게 알리고, 예매·관람에 필요한 정보를
            전달하기 위해 대관사가 제공한 공연 정보와 이미지·영상 등의 콘텐츠를 활용할 수
            있습니다.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">활용 대상</p>
              <p className="mt-1.5 break-keep text-xs leading-6 text-muted">
                공연명·일정·장소·소개, 출연 아티스트, 공식 포스터·이미지·영상, 예매 관련
                정보 등 대관사가 제공했거나 공개를 승인한 자료, 공연 이미지·영상 등
                2차 제작물의 서울아레나 채널 활용
              </p>
            </div>
            <div className="rounded-lg border border-border/25 bg-surface p-4">
              <p className="text-xs font-bold text-foreground">노출 및 활용 범위</p>
              <p className="mt-1.5 break-keep text-xs leading-6 text-muted">
                서울아레나 웹사이트·app 서비스, 채널, 공식 SNS·뉴스레터, 현장 디지털 사이니지 등
                서울아레나가 운영하는 온·오프라인 서비스
              </p>
            </div>
          </div>

          <p className="mt-3 break-keep text-xs leading-6 text-muted">
            이미지·영상 등의 사용 권한은 대관사가 미리 확보한 범위 내에서 제공해 주시면 되고,
            별도 협의가 필요한 콘텐츠는 서울아레나와 미리 상의해 주세요.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => set("seoulArenaPromotionConsent", true)}
              className={toggleClass(info.seoulArenaPromotionConsent === true)}
            >
              동의
            </button>
            <button
              type="button"
              onClick={() => set("seoulArenaPromotionConsent", false)}
              className={toggleClass(info.seoulArenaPromotionConsent === false)}
            >
              비동의
            </button>
          </div>
          <p className="mt-2.5 break-keep text-xs text-muted">
            사전 동의 시, 세부 내역은 별도 협의를 통해 진행됩니다.
          </p>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">공동 스폰서십 · 브랜드 협업 연계</h3>
            <button type="button" onClick={addSponsorship} className={toggleClass(false)}>
              ＋ 항목 추가
            </button>
          </div>
          <p className="mt-1 mb-3 break-keep text-xs leading-6 text-muted">
            서울아레나의 공식 파트너 및 제휴 브랜드와 연계한 공동 스폰서십·프로모션 등 협업
            기회를 검토할 수 있습니다. 선택 시 공연·행사의 특성과 브랜드 적합성을 고려하여
            별도 협의를 통해 진행됩니다.
          </p>
          {info.sponsorships.length === 0 && (
            <p className="text-xs text-muted">등록된 스폰서십 · 협업 내역이 없습니다.</p>
          )}
          <div className="space-y-2">
            {info.sponsorships.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-1.5 border-b border-border/15 py-2 sm:grid-cols-[1fr_2fr_auto]"
              >
                <input
                  value={row.brandName}
                  placeholder="스폰서 / 브랜드사명"
                  onChange={(e) => updateSponsorship(i, { brandName: e.target.value })}
                  className="field-base"
                />
                <input
                  value={row.campaignSummary}
                  placeholder="연계 캠페인 개요"
                  onChange={(e) => updateSponsorship(i, { campaignSummary: e.target.value })}
                  className="field-base"
                />
                <button
                  type="button"
                  onClick={() => removeSponsorship(i)}
                  aria-label="항목 삭제"
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <h3 className="type-kr-heading text-h6-m">공연 관련 데이터 제공 협조</h3>
          <p className="mt-2 break-keep text-xs leading-6 text-muted">
            제공된 데이터는 서울아레나의 공연장 운영 통계에 활용됩니다.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-s">
                <input
                  type="checkbox"
                  checked={info.ticketSalesDataConsent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // 오른쪽(외부 제공 동의)은 이 실적 데이터를 서울아레나가 받아야
                    // 성립하는 항목이라, 왼쪽을 끄면 같이 꺼서 논리적으로 불가능한
                    // 조합(왼쪽 비동의 + 오른쪽 동의)이 저장되지 않게 한다(2026-08-22).
                    onChange({
                      ...info,
                      ticketSalesDataConsent: checked,
                      pollstarConsent: checked ? info.pollstarConsent : false,
                    });
                  }}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                공연 실적 데이터 제공
              </label>
              <p className="mt-1.5 pl-6 break-keep text-xs leading-5 text-muted">
                {SALES_DATA_ITEMS.join(", ")} 등
              </p>
            </div>
            <div>
              <label
                className={`flex items-center gap-2 text-s ${
                  info.ticketSalesDataConsent ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={info.pollstarConsent}
                  disabled={!info.ticketSalesDataConsent}
                  onChange={(e) => set("pollstarConsent", e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                공연 데이터 외부 제공 동의 (Pollstar 등)
              </label>
              <p className="mt-1.5 pl-6 break-keep text-xs leading-5 text-muted">
                동의 시 아티스트, 공연일자, 공연장 정보와 함께 티켓 판매량, 판매가능 객석수,
                판매율, 티켓 가격 및 매출 등 개별 공연의 실적 정보가 외부 공연산업
                데이터베이스에 제공·공개될 수 있습니다.
                {!info.ticketSalesDataConsent && (
                  <span className="mt-1 block text-muted/80">
                    (좌측 공연 실적 데이터 제공에 동의해야 선택할 수 있습니다)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </StepForm>
    </section>
  );
}
