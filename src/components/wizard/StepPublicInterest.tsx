"use client";

import { FILE_INPUT, toggleClass } from "@/components/ui/kit";

import { useState } from "react";
import { INITIAL_PERFORMANCE_INFO } from "@/lib/pricing/performanceInfoDefaults";
import type { PerformanceInfo, QuoteSelection } from "@/lib/pricing/types";
import { VenueSplitTabBar, type VenueSplitTab } from "./VenueSplitTabBar";

// [화면 뼈대 2026-08-18, 화면시나리오 SCREEN 07/12 #4] 안내만 하고 개별 입력창은 두지 않는다
// — 신청자는 이 9개 항목을 참고해 계획서 파일 1건으로 통합 제출한다(2-... 확정).
const PUBLIC_INTEREST_ITEMS = [
  { title: "문화소외계층 할인 · 초청석", hint: "대상, 할인율 또는 좌석 수" },
  { title: "장애인 관람 접근성 지원", hint: "배리어프리, 전담인력, 안내계획" },
  { title: "공연장 연계사업 참여", hint: "커넥티드 라이브 등 협조 · 제안" },
  { title: "암표 · 부정거래 방지대책", hint: "본인인증, 예매 제한, 모니터링" },
  { title: "소비자 보호계획", hint: "공정 운영, 환불 · 취소, 민원 대응" },
  { title: "공공기관 · 지자체 연계 행사", hint: "기관명, 주최 · 주관 · 후원 관계" },
  { title: "지역상생 프로그램", hint: "지역 업체 · 인력, 주민 프로그램" },
  { title: "공익 목적 객석 제공", hint: "제공 대상과 좌석 수" },
  { title: "시설 연계 프로그램", hint: "판매시설, 중형공연장, MD 팝업" },
];

export function StepPublicInterest({
  selection,
  midHallInfo,
  onChangeMidHallInfo,
  files,
  onFilesChange,
}: {
  selection: QuoteSelection;
  midHallInfo: PerformanceInfo | null;
  onChangeMidHallInfo: (info: PerformanceInfo | null) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
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
      <h2 className="type-kr-heading text-h5-m sm:text-h5">공공/공익성 반영 여부</h2>
      <p className="mt-1.5 text-s text-muted">
        아래 9개 항목을 참고해 계획을 하나의 파일로 정리해 첨부합니다.
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
        <h3 className="type-kr-heading text-h6-m">공공/공익성 반영 및 연계 프로그램</h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          아래 항목을 참고해 계획을 하나의 파일로 정리해 첨부해 주세요. 미확정 사항은 &lsquo;검토
          중&rsquo;으로 기재 가능합니다.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {PUBLIC_INTEREST_ITEMS.map((item, i) => (
            <div key={item.title} className="border border-border/25 p-4">
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-xs font-bold text-foreground">{i + 1}.</span>
                <div>
                  <div className="text-s font-bold text-foreground">{item.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{item.hint}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 border-t-2 border-foreground pt-5">
        <h3 className="type-kr-heading text-h6-m">자료 첨부</h3>
        <p className="mt-1 mb-2.5 text-xs leading-5 text-muted">
          공공/공익성 반영 및 연계 프로그램 계획서(PDF/HWP/DOCX, 9개 항목 통합 1개 파일)를 첨부하세요.
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
                  삭제
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
