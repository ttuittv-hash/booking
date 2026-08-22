"use client";

import { toggleClass } from "@/components/ui/kit";
import type { MarketingCooperation } from "@/lib/pricing/types";
import { StepHeading, StepForm } from "./StepHeading";

const EMPTY_CHANNEL = { platform: "", handle: "", followers: "" };

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

  return (
    <section>
      <StepHeading title="마케팅 협조 및 계획" lead="프로모션 및 협업 관련 정보를 입력해 주세요." />

      <StepForm>
        <div className="border-t-2 border-foreground pt-5">
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
                  aria-label="삭제"
                  className={`${toggleClass(false)} shrink-0`}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-foreground pt-5">
          <div>
            <h3 className="type-kr-heading text-h6-m">서울아레나 콘텐츠 공동 프로모션 협조</h3>
            <p className="mt-1 text-xs text-muted">공연 이미지·영상 등 2차 제작물의 서울아레나 채널 활용 협조 동의</p>
          </div>
          <div className="flex gap-2">
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

        <div className="mt-8 border-t-2 border-foreground pt-5">
          <h3 className="type-kr-heading text-h6-m">공동 스폰서십 · 브랜드 협업 연계</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">스폰서 / 브랜드사명</label>
              <input
                value={info.sponsorBrandName}
                onChange={(e) => set("sponsorBrandName", e.target.value)}
                className="field-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted">연계 캠페인 개요</label>
              <input
                value={info.sponsorCampaignSummary}
                onChange={(e) => set("sponsorCampaignSummary", e.target.value)}
                className="field-base"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t-2 border-foreground pt-5">
          <h3 className="type-kr-heading text-h6-m">세일즈 · 실적 데이터 제공 협조</h3>
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
