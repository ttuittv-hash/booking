"use client";

import { defaultDayTags, effectiveDayTag } from "@/lib/pricing/rateTableUtils";
import { resolveSelectedDates } from "@/lib/pricing/dateRange";
import {
  ANCILLARY_BUSINESS_PLAN_LABEL,
  type AncillaryBusinessPlan,
  type PerformanceInfo,
  type QuoteSelection,
} from "@/lib/pricing/types";

const ANCILLARY_PLANS = Object.keys(ANCILLARY_BUSINESS_PLAN_LABEL) as AncillaryBusinessPlan[];

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

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckboxChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2.5 text-[13px] transition-colors",
        checked ? "border-accent bg-accent-soft text-foreground" : "border-border bg-panel hover:border-accent/50",
      ].join(" ")}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-accent" />
      {label}
    </label>
  );
}

// 공간별 총 공연 횟수 — 1회당 예상 관객수 × 총 공연 횟수 합산에 쓰인다(STEP 3-2 #2).
function venueShowCounts(selection: QuoteSelection): { arenaShows: number; midHallShows: number } {
  const arenaDates = resolveSelectedDates(selection);
  const defaults = defaultDayTags(arenaDates, 2);
  const arenaShows = arenaDates.reduce((sum, d) => {
    const tag = effectiveDayTag(d, selection.dayTags, defaults);
    return tag === "PERFORMANCE" ? sum + (selection.dayShowCounts[d] ?? 1) : sum;
  }, 0);
  const midHallShows = Object.values(selection.midHallDays).reduce(
    (sum, d) => (d.role === "PERFORMANCE" ? sum + d.shows : sum),
    0,
  );
  return { arenaShows, midHallShows };
}

export function StepAudiencePublicInterest({
  info,
  onChange,
  selection,
  files,
  onFilesChange,
}: {
  info: PerformanceInfo;
  onChange: (info: PerformanceInfo) => void;
  selection: QuoteSelection;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  function set<K extends keyof PerformanceInfo>(key: K, value: PerformanceInfo[K]) {
    onChange({ ...info, [key]: value });
  }

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    onFilesChange([...files, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const isMidHallInvolved = isSimultaneous || selection.venueId === "medium-hall";
  const { arenaShows, midHallShows } = venueShowCounts(selection);
  const arenaAudienceTotal = selection.expectedAudience * arenaShows;
  const midHallAudienceTotal = selection.secondaryAudience * midHallShows;
  const totalAudience = arenaAudienceTotal + midHallAudienceTotal;

  return (
    <section className="rounded border border-border bg-background p-7">
      <h2 className="text-[19px] font-semibold">STEP 3-2 · 예상 관객 및 사업규모 · 공공성 및 연계 프로그램</h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        관객 수는 공간별로 받고, 공공성 계획은 9개 항목을 안내한 뒤 파일 1건으로 통합 첨부합니다.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {/* 3. 예상 관객 및 사업규모 */}
        <div>
          <h3 className="text-[15px] font-semibold">3. 예상 관객 및 사업규모</h3>
          <p className="mt-1 text-[12px] text-muted">
            객석배치도는 계획안 기준으로 제출할 수 있으며, 승인 후 변경 시 사전 협의가 필요합니다
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-muted">1회당 예상 관객 수 — 아레나</label>
              <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
                {selection.expectedAudience.toLocaleString()}명
              </div>
              <p className="mt-1 text-[11px] text-muted">STEP 1 값과 연동 — 수정은 STEP 1에서</p>
            </div>

            {isMidHallInvolved && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-muted">1회당 예상 관객 수 — 중형</label>
                <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
                  {selection.secondaryAudience.toLocaleString()}명
                </div>
                <p className="mt-1 text-[11px] text-muted">STEP 1 값과 연동 — 수정은 STEP 1에서</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-muted">총 예상 관객 수</label>
              <div className="rounded-sm border border-border bg-panel/60 px-4 py-2.5 text-[14px] text-foreground">
                {isMidHallInvolved
                  ? `아레나 ${arenaAudienceTotal.toLocaleString()} + 중형 ${midHallAudienceTotal.toLocaleString()} = ${totalAudience.toLocaleString()}명 (자동)`
                  : `${totalAudience.toLocaleString()}명 (자동)`}
              </div>
            </div>

            <div className="max-w-xs">
              <label className="mb-1.5 block text-[12.5px] font-medium text-muted">예상 유료 판매율</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={info.expectedPaidSalesRate || ""}
                  onChange={(e) => set("expectedPaidSalesRate", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-24 rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <span className="text-[13px] text-muted">%</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[12.5px] font-medium text-muted">부대사업 계획</div>
              <div className="flex flex-wrap gap-2">
                {ANCILLARY_PLANS.map((plan) => (
                  <CheckboxChip
                    key={plan}
                    label={ANCILLARY_BUSINESS_PLAN_LABEL[plan]}
                    checked={info.ancillaryBusinessPlans.includes(plan)}
                    onChange={() => set("ancillaryBusinessPlans", toggleInArray(info.ancillaryBusinessPlans, plan))}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. 공공성 및 연계 프로그램 */}
        <div>
          <h3 className="text-[15px] font-semibold">4. 공공성 및 연계 프로그램</h3>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            아래 항목을 참고해 계획을 하나의 파일로 정리해 첨부해 주세요. 미확정 사항은 &lsquo;검토
            중&rsquo;으로 기재 가능합니다.
          </p>

          <ol className="mt-4 space-y-2.5">
            {PUBLIC_INTEREST_ITEMS.map((item, i) => (
              <li key={item.title} className="flex gap-2.5 rounded-sm border border-border bg-panel/40 px-3.5 py-2.5">
                <span className="shrink-0 text-[12.5px] font-semibold text-accent">{i + 1}.</span>
                <div>
                  <div className="text-[13px] font-medium text-foreground">{item.title}</div>
                  <div className="text-[11.5px] text-muted">{item.hint}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-7">
        <div className="mb-2.5 text-[12.5px] font-medium text-muted">자료 첨부</div>
        <p className="mb-2.5 text-[12px] leading-5 text-muted">
          객석배치도(PDF/이미지)와 공공성 및 연계 프로그램 계획서(PDF/HWP/DOCX, 9개 항목 통합
          1개 파일)를 함께 첨부하세요.
          {isSimultaneous && " 동시 대관은 두 공간의 객석배치도를 각각 첨부합니다."}
        </p>

        {files.length > 0 && (
          <ul className="mb-3 space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded border border-border bg-panel px-3.5 py-2.5"
              >
                <span className="truncate text-[13px] font-medium">{file.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-[11.5px] text-muted hover:text-red-600">
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
          className="text-[12.5px] text-muted file:mr-3 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
        />
      </div>
    </section>
  );
}
