"use client";

import { toggleClass } from "@/components/ui/kit";
import type { MarketingCooperation } from "@/lib/pricing/types";
import { StepHeading, StepForm } from "./StepHeading";

const EMPTY_CHANNEL = { platform: "", handle: "", followers: "" };

// 세일즈 · 실적 데이터 제공 협조 체크박스가 정확히 무엇에 동의하는 건지 보여주는
// 참고표 — 항목·취득 가능 여부·근거·협상 난이도(2026-08-22 요청).
const SALES_DATA_ITEMS = [
  { no: 25, data: "총 판매 매수", available: true, reason: "예매처↔주최자 계약 데이터", difficulty: "상 — 최소 요구 세트 ①" },
  { no: 26, data: "유료 판매율", available: true, reason: "〃", difficulty: "상 — 아티스트 가치평가에 직결" },
  { no: 27, data: "좌석등급별 판매율", available: true, reason: "〃", difficulty: "상" },
  { no: 28, data: "일자별 판매 곡선 · 매진 시각", available: true, reason: "〃", difficulty: "상 — 마케팅 효과 측정의 핵심이라 더 민감" },
  { no: 29, data: "평균 객단가 · 티켓 가격대", available: true, reason: "〃", difficulty: "상" },
  { no: 30, data: "총 티켓 매출액", available: true, reason: "〃", difficulty: "최상 — L3 해외 DB 등록의 필수 항목" },
  { no: 31, data: "예매처별 판매 비중", available: true, reason: "〃", difficulty: "중" },
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
      <StepHeading title="마케팅 협조 및 계획" lead="프로모션 및 협업 관련 정보를 입력해 주세요." />

      <StepForm>
        <div className="border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">프로모션 채널</h3>
            <button type="button" onClick={addChannel} className={toggleClass(false)}>
              ＋ 채널 추가
            </button>
          </div>
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

          <div className="mt-3 space-y-4 break-keep text-xs leading-6 text-muted">
            <p>
              서울아레나는 공연·행사의 홍보 및 관람객 대상 서비스 제공을 위해 대관사가 제공한
              공연·행사 관련 정보 및 콘텐츠를 서울아레나가 운영하는 온·오프라인 서비스 및
              채널에 노출·활용할 수 있습니다.
            </p>

            <div>
              <p className="font-bold text-foreground">활용 대상</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>공연·행사명, 일정, 장소 및 공연 소개</li>
                <li>출연 아티스트 및 관련 정보</li>
                <li>공연 포스터, 대표 이미지, 영상 등 공식 홍보 콘텐츠</li>
                <li>티켓 오픈 및 예매 관련 정보</li>
                <li>기타 대관사가 제공하거나 공개를 승인한 공연·행사 관련 정보 및 콘텐츠</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-foreground">노출 및 활용 범위</p>
              <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="border border-border/25 p-3">
                  <p className="text-xs font-bold text-foreground">홍보</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    <li>서울아레나 공식 SNS, 뉴스레터 등 디지털 채널</li>
                    <li>서울아레나 내 디지털 사이니지, 미디어월 등 온·오프라인 안내·홍보 매체</li>
                  </ul>
                </div>
                <div className="border border-border/25 p-3">
                  <p className="text-xs font-bold text-foreground">서비스</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    <li>서울아레나 공식 웹사이트 및 모바일 서비스(모바일 앱 등)</li>
                    <li>공연·행사 상세, 일정, 아티스트 정보, 추천·큐레이션 등 서울아레나 서비스 내 관련 영역</li>
                  </ul>
                </div>
              </div>
            </div>

            <p>
              제공된 정보 및 콘텐츠는 해당 공연·행사의 안내·홍보, 관람객 편의 제공 및
              서울아레나 서비스 내 콘텐츠 제공·운영을 목적으로 활용될 수 있습니다.
            </p>
            <p>
              대관사는 제공하는 이미지, 영상, 아티스트 관련 콘텐츠 등에 대해 필요한 사용
              권한을 확보한 범위 내에서 제공하며, 별도의 협의가 필요한 콘텐츠의 경우
              서울아레나와 사전 협의할 수 있습니다.
            </p>
          </div>

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
        </div>

        <div className="mt-8 border-t border-border/25 pt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="type-kr-heading text-h6-m">공동 스폰서십 · 브랜드 협업 연계</h3>
            <button type="button" onClick={addSponsorship} className={toggleClass(false)}>
              ＋ 항목 추가
            </button>
          </div>
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

          <div className="mt-3 overflow-x-auto [contain:paint]">
            <table className="w-full min-w-[36rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/40">
                  <th scope="col" className="py-2 pr-4 text-left font-bold text-muted">#</th>
                  <th scope="col" className="py-2 pr-4 text-left font-bold text-muted">데이터</th>
                  <th scope="col" className="py-2 pr-4 text-left font-bold text-muted">취득</th>
                  <th scope="col" className="py-2 pr-4 text-left font-bold text-muted">왜 못 얻나</th>
                  <th scope="col" className="py-2 text-left font-bold text-muted">협상 난이도</th>
                </tr>
              </thead>
              <tbody>
                {SALES_DATA_ITEMS.map((item) => (
                  <tr key={item.no} className="border-b border-border/15">
                    <td className="py-2 pr-4 align-top text-muted">{item.no}</td>
                    <td className="py-2 pr-4 align-top text-foreground">{item.data}</td>
                    <td className="py-2 pr-4 align-top">{item.available ? "○" : "×"}</td>
                    <td className="py-2 pr-4 align-top text-muted">{item.reason}</td>
                    <td className="py-2 align-top text-muted">{item.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-8">
            <label className="flex cursor-pointer items-center gap-2 text-s">
              <input
                type="checkbox"
                checked={info.ticketSalesDataConsent}
                onChange={(e) => set("ticketSalesDataConsent", e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              티켓 판매량·판매율 데이터 제공
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-s">
              <input
                type="checkbox"
                checked={info.pollstarConsent}
                onChange={(e) => set("pollstarConsent", e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Pollstar 등 해외 DB 등록 동의
            </label>
          </div>
        </div>
      </StepForm>
    </section>
  );
}
