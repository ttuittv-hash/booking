import { findPackage } from "@/lib/pricing/rateTableUtils";
import { EYEBROW } from "@/components/ui/kit";
import {
  AGE_RATING_LABEL,
  ANCILLARY_BUSINESS_PLAN_LABEL,
  APPLICANT_COMPANY_TYPE_LABEL,
  CAST_CONTRACT_STATUS_LABEL,
  DEFAULT_VENUE_ID,
  EVENT_TYPE_LABEL,
  RETRACTABLE_SEAT_USE_LABEL,
  SEATING_TYPE_LABEL,
  STAGE_TYPE_LABEL,
  VENUES,
  WEEKDAY_LABEL,
  type DayTag,
  type MidHallDayRole,
  type PerformanceInfo,
  type QuoteSelection,
  type RateTable,
} from "@/lib/pricing/types";

const DAY_TAG_LABEL: Record<DayTag, string> = {
  PREP: "준비일",
  PERFORMANCE: "공연일",
  LOAD_OUT: "철수",
};

const MID_HALL_ROLE_LABEL: Record<MidHallDayRole, string> = {
  SETUP: "셋업",
  PERFORMANCE: "공연",
  LOAD_OUT: "철수",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border border-border [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-s font-bold">
        {title}
        <span className="text-xs text-muted group-open:hidden">펼치기 ›</span>
        <span className="hidden text-xs text-muted group-open:inline">접기 ⌄</span>
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

function performanceInfoFields(info: PerformanceInfo) {
  return (
    <div className="space-y-5">
      <div>
        <p className={`${EYEBROW} text-muted`}>신청자 기본정보</p>
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          <Row label="대관신청사명" value={info.applicantCompanyName || "-"} />
          <Row
            label="신청 기업 유형"
            value={info.applicantCompanyType ? APPLICANT_COMPANY_TYPE_LABEL[info.applicantCompanyType] : "-"}
          />
          <Row label="사업자등록번호" value={info.applicantBusinessRegistrationNumber || "-"} />
          <Row label="담당자" value={info.applicantContactName || "-"} />
          <Row label="담당자 연락처" value={info.applicantContactPhone || "-"} />
        </dl>
      </div>

      <div>
        <p className={`${EYEBROW} text-muted`}>공연 운영 총괄 책임자</p>
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          <Row label="이름" value={info.operationsResponsible.name || "-"} />
          <Row label="직책" value={info.operationsResponsible.title || "-"} />
          <Row label="연락처" value={info.operationsResponsible.phone || "-"} />
        </dl>
      </div>

      <div>
        <p className={`${EYEBROW} text-muted`}>안전관리 총괄 책임자</p>
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          <Row label="이름" value={info.safetyResponsible.name || "-"} />
          <Row label="소속" value={info.safetyResponsible.title || "-"} />
          <Row label="연락처" value={info.safetyResponsible.phone || "-"} />
        </dl>
      </div>

      {info.pastPerformances.length > 0 && (
        <div>
          <p className={`${EYEBROW} text-muted`}>
            최근 3년간 공연 실적
          </p>
          <div className="mt-1.5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-1.5 pr-2">공연명</th>
                  <th className="py-1.5 pr-2">장소</th>
                  <th className="py-1.5 pr-2">기간</th>
                  <th className="py-1.5 pr-2">관객수</th>
                  <th className="py-1.5">역할</th>
                </tr>
              </thead>
              <tbody>
                {info.pastPerformances.map((rec, i) => (
                  <tr key={i} className="border-b border-border/25">
                    <td className="py-1.5 pr-2">{rec.eventName || "-"}</td>
                    <td className="py-1.5 pr-2">{rec.venue || "-"}</td>
                    <td className="py-1.5 pr-2">{rec.period || "-"}</td>
                    <td className="py-1.5 pr-2">{rec.audience || "-"}</td>
                    <td className="py-1.5">{rec.role || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <p className={`${EYEBROW} text-muted`}>공연 기본정보</p>
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          <Row label="공연(행사)명" value={info.eventName || "-"} />
          <Row label="아티스트" value={info.artist || "-"} />
          <Row label="주최·주관·기획" value={info.organizer || "-"} />
          <Row label="행사규모" value={info.eventScale || "-"} />
          <Row
            label="행사유형"
            value={info.eventTypes.length ? info.eventTypes.map((t) => EVENT_TYPE_LABEL[t]).join(", ") : "-"}
          />
          <Row
            label="공연등급"
            value={
              info.ageRating
                ? `${AGE_RATING_LABEL[info.ageRating]}${info.ageRating === "AGE_LIMIT" && info.ageLimitDetail ? ` (${info.ageLimitDetail})` : ""}`
                : "-"
            }
          />
          <Row
            label="무대형태"
            value={info.stageTypes.length ? info.stageTypes.map((t) => STAGE_TYPE_LABEL[t]).join(", ") : "-"}
          />
          <Row
            label="객석형태"
            value={info.seatingTypes.length ? info.seatingTypes.map((t) => SEATING_TYPE_LABEL[t]).join(", ") : "-"}
          />
          <Row
            label="수납식 객석 사용여부"
            value={info.retractableSeatUse ? RETRACTABLE_SEAT_USE_LABEL[info.retractableSeatUse] : "-"}
          />
          <Row label="철수 완료 예정시간" value={info.teardownCompletionTime || "-"} />
          <Row label="티켓 오픈 예정일" value={info.ticketOpenExpectedDate || "-"} />
        </dl>
      </div>

      <div>
        <p className={`${EYEBROW} text-muted`}>
          개최 신뢰도 및 안전관리
        </p>
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          <Row
            label="주요 출연진 계약 상태"
            value={info.castContractStatus ? CAST_CONTRACT_STATUS_LABEL[info.castContractStatus] : "-"}
          />
          <Row label="해외 아티스트 추가사항" value={info.foreignArtistNotes || "-"} />
          <Row
            label="민감정보 마스킹 제출 허용"
            value={info.sensitiveInfoMaskingAcknowledged ? "확인함" : "미확인"}
          />
          <Row label="안전규정 준수 확약서" value={info.safetyPledgeSigned ? "작성함" : "미작성"} />
        </dl>
      </div>
    </div>
  );
}

export function QuoteApplicationDetail({
  selection,
  rateTable,
}: {
  selection: QuoteSelection;
  rateTable: RateTable;
}) {
  const isSimultaneous = selection.bookingMode === "SIMULTANEOUS";
  const hasArena = isSimultaneous || selection.venueId !== "medium-hall";
  const hasMidHall = isSimultaneous || selection.venueId === "medium-hall";

  const venueLabel = isSimultaneous
    ? "아레나 + 중형공연장 (동시 대관)"
    : (VENUES.find((v) => v.id === (selection.venueId ?? DEFAULT_VENUE_ID))?.name ?? "-");
  const pkg = hasArena && selection.packageId != null ? findPackage(rateTable, selection.packageId) : undefined;

  const arenaDates = Object.keys(selection.dayTags).sort();
  const midHallDates = Object.keys(selection.midHallDays).sort();

  return (
    <div className="space-y-3">
      <Section title="공간 선택">
        <dl className="divide-y divide-border/60 text-s">
          <Row label="이용 시설" value={venueLabel} />
        </dl>
      </Section>

      <Section title="일정 선택">
        <div className="space-y-5">
          {hasArena && (
            <div>
              <p className={`${EYEBROW} text-muted`}>아레나 일정</p>
              <dl className="mt-1.5 divide-y divide-border/60 text-s">
                <Row
                  label="주차"
                  value={`${selection.week.year}년 ${selection.week.month}월 ${selection.week.weekOfMonth}주차`}
                />
                <Row
                  label="제외 요일"
                  value={
                    selection.excludedDays.length
                      ? selection.excludedDays.map((d) => WEEKDAY_LABEL[d]).join(", ")
                      : "없음 (화~일 전체 사용)"
                  }
                />
                <Row label="일요일 이후 추가 일수" value={`${selection.extraDays}일`} />
              </dl>
              {arenaDates.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[360px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="py-1.5 pr-3">날짜</th>
                        <th className="py-1.5 pr-3">역할</th>
                        <th className="py-1.5">회차</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arenaDates.map((date) => (
                        <tr key={date} className="border-b border-border/25">
                          <td className="py-1.5 pr-3 tabular-nums">{date}</td>
                          <td className="py-1.5 pr-3">{DAY_TAG_LABEL[selection.dayTags[date]]}</td>
                          <td className="py-1.5 tabular-nums">
                            {selection.dayTags[date] === "PERFORMANCE" ? (selection.dayShowCounts[date] ?? 1) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {hasMidHall && (
            <div>
              <p className={`${EYEBROW} text-muted`}>중형공연장 일정</p>
              {midHallDates.length > 0 ? (
                <div className="mt-1.5 overflow-x-auto">
                  <table className="w-full min-w-[360px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="py-1.5 pr-3">날짜</th>
                        <th className="py-1.5 pr-3">역할</th>
                        <th className="py-1.5">회차</th>
                      </tr>
                    </thead>
                    <tbody>
                      {midHallDates.map((date) => {
                        const d = selection.midHallDays[date];
                        return (
                          <tr key={date} className="border-b border-border/25">
                            <td className="py-1.5 pr-3 tabular-nums">{date}</td>
                            <td className="py-1.5 pr-3">{MID_HALL_ROLE_LABEL[d.role]}</td>
                            <td className="py-1.5 tabular-nums">{d.role === "PERFORMANCE" ? d.shows : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-1.5 text-s text-muted">지정된 날짜가 없습니다.</p>
              )}
              <dl className="mt-2 divide-y divide-border/60 text-s">
                <Row label="셋업 연장 시간" value={`${selection.midHallExtraSetupHours}시간`} />
                <Row label="철수(Load-Out) 연장 시간" value={`${selection.midHallExtraLoadOutHours}시간`} />
              </dl>
            </div>
          )}
        </div>
      </Section>

      <Section title="구성 · 옵션">
        <dl className="divide-y divide-border/60 text-s">
          {hasArena && (
            <>
              <Row label="패키지" value={pkg ? `${pkg.name} — ${pkg.tagline}` : "-"} />
              <Row label="관객 규모 기준" value={pkg?.audienceTier.label ?? "-"} />
              <Row label="예상 관객 규모 (아레나)" value={`${selection.expectedAudience.toLocaleString()}명`} />
            </>
          )}
          {hasMidHall && (
            <Row label="예상 관객 규모 (중형)" value={`${selection.secondaryAudience.toLocaleString()}명`} />
          )}
        </dl>
      </Section>

      <Section title="신청자 정보">
        {performanceInfoFields(selection.performanceInfo)}
        {isSimultaneous && selection.midHallPerformanceInfo && (
          <div className="mt-6 border-t border-dashed border-border pt-5">
            <p className="mb-3 text-xs font-bold text-accent">
              중형공연장 — 아레나와 다르게 입력한 정보
            </p>
            {performanceInfoFields(selection.midHallPerformanceInfo)}
          </div>
        )}
      </Section>

      <Section title="관객">
        <dl className="divide-y divide-border/60 text-s">
          {hasArena && (
            <Row label="1회당 예상 관객 수 (아레나)" value={`${selection.expectedAudience.toLocaleString()}명`} />
          )}
          {hasMidHall && (
            <Row label="1회당 예상 관객 수 (중형)" value={`${selection.secondaryAudience.toLocaleString()}명`} />
          )}
        </dl>
        {ticketTypeFields(selection.performanceInfo, hasMidHall ? "아레나" : undefined)}
        {hasMidHall &&
          ticketTypeFields(
            selection.midHallPerformanceInfo ?? selection.performanceInfo,
            "중형",
          )}
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          <Row
            label="부대사업 계획"
            value={
              selection.performanceInfo.ancillaryBusinessPlans.length
                ? selection.performanceInfo.ancillaryBusinessPlans
                    .map((p) => ANCILLARY_BUSINESS_PLAN_LABEL[p])
                    .join(", ")
                : "-"
            }
          />
        </dl>
      </Section>
    </div>
  );
}

// [신규 2026-08-26] 티켓 유형별 가격·예상 판매율(2026-08-26 도입)과, 대관 경합 시
// 제시한 추가 대관료 옵션·티켓 매출 RS 요율을 보여준다 — 신청서 제출/심사 화면에서
// "추가 가능한 대관료"로 확인할 수 있어야 한다는 요청 반영. ticketTypes 가 없는
// 옛 신청서는 레거시 단일 판매율 필드로 대체 표시한다(하위호환).
function ticketTypeFields(info: PerformanceInfo, venueLabel?: string) {
  const suffix = venueLabel ? ` (${venueLabel})` : "";
  const ticketTypes = info.ticketTypes ?? [];
  const hasCompetitionFee =
    (typeof info.competitionFeeOptionMin === "number" && info.competitionFeeOptionMin > 0) ||
    (typeof info.competitionFeeOptionMax === "number" && info.competitionFeeOptionMax > 0);
  const hasRsRate = typeof info.ticketRevenueShareRate === "number" && info.ticketRevenueShareRate > 0;

  return (
    <div className="mt-1.5">
      {ticketTypes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-1.5 pr-2">티켓 유형{suffix}</th>
                <th className="py-1.5 pr-2">티켓가</th>
                <th className="py-1.5">예상 판매율</th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((row, i) => (
                <tr key={i} className="border-b border-border/25">
                  <td className="py-1.5 pr-2">{row.label || "-"}</td>
                  <td className="py-1.5 pr-2">{row.price.toLocaleString()}원</td>
                  <td className="py-1.5">{row.expectedSalesRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <dl className="divide-y divide-border/60 text-s">
          <Row label={`예상 유료 판매율${suffix}`} value={`${info.expectedPaidSalesRate}%`} />
        </dl>
      )}
      {(hasCompetitionFee || hasRsRate) && (
        <dl className="mt-1.5 divide-y divide-border/60 text-s">
          {hasCompetitionFee && (
            <Row
              label={`대관 경합 시 추가 가능한 대관료${suffix}`}
              value={`${(info.competitionFeeOptionMin ?? 0).toLocaleString()}~${(info.competitionFeeOptionMax ?? 0).toLocaleString()}원`}
            />
          )}
          {hasRsRate && <Row label={`티켓 매출 RS 요율${suffix}`} value={`${info.ticketRevenueShareRate}%`} />}
        </dl>
      )}
    </div>
  );
}

