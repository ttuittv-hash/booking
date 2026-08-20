import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { listNotices } from "@/lib/db";
import { BEFORE_YOU_APPLY, RENTAL_PROCESS } from "@/lib/content/processFacts";
import { RATE_STRUCTURE, RATE_STRUCTURE_CHOICE } from "@/lib/content/rateFacts";
import { OPENING } from "@/lib/content/venueFacts";
import { isRentalOpen, OPEN_PHASE_BADGE } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  findCurrentRentalNotice,
  NoRentalNotice,
  RentalNoticeCard,
} from "@/components/RentalNoticeCard";
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
  ProcessDetail,
  ProcessDiagram,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

function SectionTitle({ en, ko, lead }: { en: string; ko: string; lead?: React.ReactNode }) {
  return (
    <div>
      <p className="type-display text-h6-m sm:text-h6">{en}</p>
      <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">{ko}</h2>
      {lead && <div className="measure mt-6 break-keep text-m text-muted">{lead}</div>}
    </div>
  );
}

export default async function GuidePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  const notices = await listNotices();
  const current = findCurrentRentalNotice(notices);
  const open = isRentalOpen();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="대관 안내"
            lead={`서울아레나는 ${OPENING} 개관을 앞두고 있습니다. 아레나와 중형공연장은 요금을 산정하는 방식과 부대시설을 신청하는 방식이 서로 다르므로, 공연 규모에 맞는 공간을 먼저 확인하신 뒤 신청 절차로 이동해 주세요.`}
          />
        </Band>

        {/* ── 대관 일정 — 값은 공지 게시물이 소유한다 ─────────────────────── */}
        <Band tone="white">
          <SectionTitle
            en="CURRENT NOTICE"
            ko="진행 중인 대관 공고"
            lead="대관 일정은 정해진 연간 일정표로 고정하지 않고, 모집 시기마다 공지사항에 공고로 안내합니다. 신청 가능 기간, 대상 공간, 대관 가능 주차, 제출 서류는 공고마다 다릅니다."
          />
          <div className="mt-12">
            {current ? <RentalNoticeCard notice={current} /> : <NoRentalNotice />}
          </div>
        </Band>

        {/* ── RATE STRUCTURE — 금액은 쓰지 않는다 ─────────────────────────── */}
        <Band tone="light">
          <SectionTitle en="RATE STRUCTURE" ko="요금 체계는 공간에 따라 다릅니다" />
          <div className="measure mt-8 space-y-4 break-keep text-m text-muted">
            <p>
              아레나는 주요 시설과 장비, 운영 서비스를 하나의 대관패키지로 묶은 통합 요금
              체계입니다. 대관 기간은 1주 단위이며, 1주는 셋업 4일과 공연 2일을 합한 6일로
              구성됩니다. 공연 규모와 무대 형태에 따라 패키지 1부터 4까지 나뉘고, 패키지를 고르면
              포함되는 공간·장비·주차가 함께 정해집니다.
            </p>
            <p>
              중형공연장은 패키지를 두지 않고 실제로 사용하시는 대관일수를 기준으로 산정합니다. 같은
              하루라도 셋업일과 공연일의 요금이 다르고, 공연일은 평일과 주말의 요금이 다릅니다.
              부대시설과 장비는 기본 요금에 묶여 있지 않으므로 필요한 항목을 개별로 신청하시게
              됩니다.
            </p>
          </div>

          <div className="mt-12">
            <ComparisonTable
              rowLabel="구분"
              columns={[
                { key: "arena", title: "아레나", align: "left" },
                { key: "live-hall", title: "중형공연장", align: "left" },
              ]}
              rows={[
                ...RATE_STRUCTURE.map((r) => ({ label: r.label, cells: [r.arena, r.liveHall] })),
                {
                  label: RATE_STRUCTURE_CHOICE.label,
                  cells: [RATE_STRUCTURE_CHOICE.arena, RATE_STRUCTURE_CHOICE.liveHall],
                },
              ]}
            />
          </div>

          <div className="mt-14">
            <h3 className="type-kr-heading text-h5-m sm:text-h5">
              금액은 로그인 후 확인하실 수 있습니다
            </h3>
            <p className="measure mt-4 break-keep text-s text-muted">
              패키지별 대관료, 일수별 대관료, 포함 항목과 추가 사용료의 금액은 대관료 페이지에
              있으며 열람에는 로그인이 필요합니다. 대관사 계정은 회원가입 후 운영자 승인을 거쳐
              사용하실 수 있습니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="primary">
                회원가입하고 대관료 확인
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                이미 회원이시면 로그인
              </ButtonLink>
            </div>
          </div>
        </Band>

        {/* ── HOW IT WORKS — 절차는 가로 한 줄 + 하단 상세 ────────────────── */}
        <Band tone="dark">
          <SectionTitle en="HOW IT WORKS" ko="대관 절차는 8단계로 진행됩니다" />

          <div className="mt-14">
            <ProcessDiagram steps={RENTAL_PROCESS} />
          </div>

          <div className="mt-16">
            <ProcessDetail steps={RENTAL_PROCESS} />
          </div>
        </Band>

        {/* ── BEFORE YOU APPLY ───────────────────────────────────────────── */}
        <Band tone="light">
          <SectionTitle en="BEFORE YOU APPLY" ko="신청 전 확인해 주세요" />
          <div className="mt-14 space-y-10">
            {BEFORE_YOU_APPLY.map((n) => (
              <div key={n.title} className="border-t border-border/25 pt-6">
                <h3 className="type-kr-heading break-keep text-h6-m sm:text-h6">{n.title}</h3>
                <p className="measure mt-3 break-keep text-s text-muted">{n.desc}</p>
              </div>
            ))}
          </div>
          <Note className="measure mt-12">
            공연 준비에 필요한 서식과 대관 규약은 자료실에서 내려받으실 수 있습니다.
          </Note>
          <div className="mt-8">
            <ButtonLink href="/library" variant="secondary">
              자료실 보기
              <DownloadIcon />
            </ButtonLink>
          </div>
        </Band>

        {open ? (
          <CTABand
            title="준비하신 공연 정보로 지금 신청하실 수 있습니다."
            lead="신청 전 대관 규약과 대관료를 확인해 주세요."
            actions={
              <>
                <ButtonLink href="/apply" variant="primary">
                  대관 신청
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/packages" variant="secondary">
                  대관료 확인 (로그인 필요)
                </ButtonLink>
              </>
            }
          />
        ) : (
          <CTABand
            title="대관 신청은 9월 1일에 열립니다."
            lead="계정 승인에 시간이 걸리므로 먼저 회원가입을 진행해 주세요."
            actions={
              <>
                <ButtonLink href="/register" variant="primary">
                  회원가입
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/notices" variant="secondary">
                  대관 공고 확인
                </ButtonLink>
                <span className="inline-flex items-center gap-2 self-center text-xs">
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
