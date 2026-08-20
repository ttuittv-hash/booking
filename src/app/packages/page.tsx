import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { won } from "@/lib/format";
import {
  ARENA_ADDITIONAL_CHARGES,
  ARENA_LIMITS,
  ARENA_PACKAGE_RATES,
  LIVE_HALL_DAY_RATES,
  LIVE_HALL_LIMITS,
  LIVE_HALL_OPTIONAL_SERVICES,
  RATE_COMMON_NOTES,
  RATE_STRUCTURE,
  VAT_NOTE,
  type ChargeRow,
} from "@/lib/content/rateFacts";
import {
  ARENA_RATE_INCLUDES,
  CAPACITY_DISCLAIMER,
  LIVE_HALL_RATE_INCLUDES,
} from "@/lib/content/venueFacts";
import { isRentalOpen, OPEN_PHASE_BADGE } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  CTABand,
  ComparisonTable,
  DownloadIcon,
  Note,
  PageHeading,
  SpecTable,
  type CompareGroup,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관료 | 서울아레나",
};

/**
 * 페이지명을 "대관 패키지"에서 "대관료"로 바꿨다.
 * 중형공연장은 패키지 개념이 없으므로 "패키지"를 페이지명으로 쓰면 절반이 틀린 이름이 된다.
 * 기존 경로 `/packages` 는 유지한다.
 */

function SectionTitle({ en, ko, lead }: { en: string; ko: string; lead?: React.ReactNode }) {
  return (
    <div>
      <p className="type-display text-h6-m sm:text-h6">{en}</p>
      <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">{ko}</h2>
      {lead && <div className="measure mt-6 break-keep text-m text-muted">{lead}</div>}
    </div>
  );
}

/** 금액 열은 마지막 열 우측 정렬 — 자릿수가 맞아야 비교가 된다 */
function chargeGroups(rows: ChargeRow[]): CompareGroup[] {
  const order: string[] = [];
  rows.forEach((r) => {
    if (!order.includes(r.group)) order.push(r.group);
  });
  return order.map((g) => ({
    title: g,
    rows: rows
      .filter((r) => r.group === g)
      .map((r) => ({
        label: r.item,
        note: r.unit,
        cells: [typeof r.rate === "number" ? won(r.rate) : r.rate],
      })),
  }));
}

export default async function RatesPage() {
  // 요금은 공연 규모·일정 구성에 따라 달라지고 계약 조건과 직접 연결되므로
  // 승인된 대관사 계정으로 로그인한 경우에만 열람을 허용한다.
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const open = isRentalOpen();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/packages" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="대관료"
            lead="아레나는 패키지 단위, 중형공연장은 일수 단위로 요금을 산정합니다. 이 페이지는 승인된 대관사 계정으로 로그인하신 경우에만 열람하실 수 있습니다. 요금이 공연 규모와 일정 구성에 따라 달라지고 계약 조건과 직접 연결되기 때문입니다."
          />
        </Band>

        {/* ── RATE STRUCTURE ─────────────────────────────────────────────── */}
        <Band tone="dark">
          <SectionTitle en="RATE STRUCTURE" ko="두 공간의 요금 체계" />
          <div className="mt-14">
            <ComparisonTable
              rowLabel="구분"
              columns={[
                { key: "arena", title: "아레나", align: "left" },
                { key: "live-hall", title: "중형공연장", align: "left" },
              ]}
              rows={RATE_STRUCTURE.map((r) => ({ label: r.label, cells: [r.arena, r.liveHall] }))}
            />
          </div>
          <div className="measure mt-8 space-y-4 break-keep text-s">
            <p>
              아레나는 패키지를 고르시면 대관료와 포함 범위가 함께 정해집니다. 중형공연장은
              사용하시는 날짜 하나하나에 셋업일과 공연일 중 어느 쪽인지 지정하시고, 공연일은 평일과
              주말을 구분해 합산합니다.
            </p>
            <p className="text-inverse-muted">
              단지 전체 주차는 915대(B2F 596대 + B1F 319대)입니다. 위 표의 150대·100대는 대관료에
              포함되는 관계자 주차 수량이며 단지 총량과 다릅니다.
            </p>
          </div>
        </Band>

        {/* ── 아레나 대관료 ───────────────────────────────────────────────── */}
        <Band tone="light" id="arena" className="scroll-mt-24">
          <SectionTitle
            en="ARENA"
            ko="아레나 대관료"
            lead={`${VAT_NOTE} 대관 기간은 1주이며, 1주는 셋업 4일과 공연 2일을 합한 6일입니다.`}
          />

          <div className="mt-14">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">패키지 1~4 비교</h3>
            <div className="mt-6">
              <ComparisonTable
                rowLabel="구분"
                columns={ARENA_PACKAGE_RATES.map((p) => ({ key: String(p.id), title: p.name }))}
                rows={[
                  { label: "최대 수용인원", cells: ARENA_PACKAGE_RATES.map((p) => p.capacity) },
                  { label: "권장 무대 형태", cells: ARENA_PACKAGE_RATES.map((p) => p.stageType) },
                  { label: "권장 객석 형태", cells: ARENA_PACKAGE_RATES.map((p) => p.seatingType) },
                  { label: "대관료 (1주)", cells: ARENA_PACKAGE_RATES.map((p) => won(p.total)) },
                ]}
              />
            </div>
            <Note className="measure mt-6">{CAPACITY_DISCLAIMER}</Note>
          </div>

          <div className="mt-16">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">대관료 세부 내역</h3>
            <div className="mt-6">
              <ComparisonTable
                rowLabel="구분"
                columns={ARENA_PACKAGE_RATES.map((p) => ({ key: String(p.id), title: p.name }))}
                rows={[
                  {
                    label: "셋업일 전용 사용료 (4일)",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.setupExclusive)),
                  },
                  {
                    label: "ㄴ 1일 단가",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.setupPerDay)),
                  },
                  {
                    label: "공연일 전용 사용료 (2일)",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.showExclusive)),
                  },
                  {
                    label: "ㄴ 1일 단가",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.showPerDay)),
                  },
                  {
                    label: "시설 사용료 (1주)",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.facility)),
                  },
                  { label: "합계", cells: ARENA_PACKAGE_RATES.map((p) => won(p.total)) },
                  {
                    label: "셋업 변경 대관료 (1일)",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.setupChangePerDay)),
                  },
                  {
                    label: "공연 변경 대관료 (1일)",
                    cells: ARENA_PACKAGE_RATES.map((p) => won(p.showChangePerDay)),
                  },
                ]}
              />
            </div>
            <div className="measure mt-6 space-y-3 break-keep text-s text-muted">
              <p>
                전용 사용료와 셋업 변경 대관료는 패키지에 따라 달라지지 않습니다. 패키지 사이의 금액
                차이는 시설 사용료와 공연 변경 대관료에서 발생합니다.
              </p>
              <p>
                셋업 변경 대관료와 공연 변경 대관료는 기준 구성인 셋업 4일·공연 2일에서 일수를
                조정하실 때 적용하는 1일 단가입니다. 적용 조건은 계약 시 협의합니다.
              </p>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="type-display text-h6-m sm:text-h6">RATE INCLUDES</h3>
            <SpecTable className="mt-6" rows={ARENA_RATE_INCLUDES} />
            <Note className="measure mt-6">
              프리미엄 공간(스카이박스)과 프로덕션 전력 수치는 확인 회신 전까지 게재를 보류합니다.
            </Note>
          </div>

          <div className="mt-16">
            <h3 className="type-display text-h6-m sm:text-h6">ADDITIONAL CHARGES</h3>
            <p className="measure mt-4 break-keep text-s text-muted">
              아래 항목은 대관료에 포함되지 않으며, 신청하신 범위에 따라 별도로 청구됩니다.{" "}
              {VAT_NOTE}
            </p>
            <div className="mt-6">
              <ComparisonTable
                dense
                rowLabel="항목"
                columns={[{ key: "rate", title: "요금" }]}
                groups={chargeGroups(ARENA_ADDITIONAL_CHARGES)}
              />
            </div>
            <Note className="measure mt-6">
              센터 리프트는 1대를 보유하고 있어 같은 시간에 한 곳에서만 운용하실 수 있습니다.
            </Note>
          </div>

          <div className="mt-16">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">기준·제한 사항</h3>
            <SpecTable className="mt-6" rows={ARENA_LIMITS} />
          </div>
        </Band>

        {/* ── 중형공연장 대관료 ───────────────────────────────────────────── */}
        <Band tone="white" id="live-hall" className="scroll-mt-24">
          <SectionTitle
            en="LIVE HALL"
            ko="중형공연장 대관료"
            lead="중형공연장은 패키지를 두지 않습니다. 실제 사용하시는 대관일수를 기준으로 산정하며, 날짜마다 셋업일과 공연일 중 어느 쪽인지 지정하시고 공연일은 평일과 주말을 구분합니다."
          />

          <div className="mt-14">
            <h3 className="type-display text-h6-m sm:text-h6">BASE RATE</h3>
            <p className="mt-4 text-s text-muted">{VAT_NOTE}</p>
            <div className="mt-6">
              <ComparisonTable
                rowLabel="구분"
                columns={LIVE_HALL_DAY_RATES.map((r) => ({ key: r.label, title: r.label }))}
                rows={[
                  { label: "대관료 (1일)", cells: LIVE_HALL_DAY_RATES.map((r) => won(r.total)) },
                  {
                    label: "ㄴ 전용 사용료 (1일)",
                    cells: LIVE_HALL_DAY_RATES.map((r) => won(r.exclusive)),
                  },
                  {
                    label: "ㄴ 시설 사용료 (1일)",
                    cells: LIVE_HALL_DAY_RATES.map((r) => won(r.facility)),
                  },
                ]}
              />
            </div>
            <div className="measure mt-6 space-y-3 break-keep text-s text-muted">
              <p>셋업일은 평일과 주말의 요금이 같습니다. 공연일은 주말이 평일보다 4,000,000원 높습니다.</p>
              <p>
                수용인원은 스탠딩 구성에서 최대 3,500명, 좌석 구성에서 2,000~2,500명입니다.{" "}
                {CAPACITY_DISCLAIMER}
              </p>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="type-display text-h6-m sm:text-h6">RATE INCLUDES</h3>
            <SpecTable className="mt-6" rows={LIVE_HALL_RATE_INCLUDES} />
          </div>

          <div className="mt-16">
            <h3 className="type-display text-h6-m sm:text-h6">OPTIONAL SERVICES</h3>
            <p className="measure mt-4 break-keep text-s text-muted">
              아래 항목은 기본 대관료에 포함되지 않으며 항목별로 신청하십니다. {VAT_NOTE}
            </p>
            <div className="mt-6">
              <ComparisonTable
                dense
                rowLabel="항목"
                columns={[{ key: "rate", title: "요금" }]}
                groups={chargeGroups(LIVE_HALL_OPTIONAL_SERVICES)}
              />
            </div>
          </div>

          <div className="mt-16">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">기준·제한 사항</h3>
            <SpecTable className="mt-6" rows={LIVE_HALL_LIMITS} />
          </div>
        </Band>

        {/* ── 공통 고지 ───────────────────────────────────────────────────── */}
        <Band tone="light">
          <SectionTitle en="TERMS" ko="공통 고지" />
          <ul className="measure mt-10 space-y-3">
            {RATE_COMMON_NOTES.map((t) => (
              <li key={t} className="break-keep border-t border-border/15 pt-3 text-s text-muted">
                {t}
              </li>
            ))}
          </ul>
        </Band>

        {open ? (
          <CTABand
            title="공연 규모와 일정이 정해지셨다면 신청서에서 예상 대관료를 확인하실 수 있습니다."
            actions={
              <>
                <ButtonLink href="/apply" variant="primary">
                  대관 신청
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/mypage/inquiries" variant="secondary">
                  요금 문의하기
                </ButtonLink>
              </>
            }
          />
        ) : (
          <CTABand
            title="대관 신청은 9월 1일에 열립니다."
            lead="그 전에 대관 공고와 대관 규약을 확인해 두시면 좋습니다."
            actions={
              <>
                <ButtonLink href="/notices" variant="primary">
                  대관 공고 확인
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/library?doc=rules" variant="secondary">
                  대관 규약 내려받기
                  <DownloadIcon />
                </ButtonLink>
                <span className="inline-flex items-center gap-2 self-center text-xs text-muted">
                  <Badge>{OPEN_PHASE_BADGE}</Badge> 대관 신청
                </span>
              </>
            }
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
