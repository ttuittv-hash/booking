import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { getCurrentRateTable, listDateBlocks, listWeekDemand } from "@/lib/db";
import { PROCESS_SEGMENTS } from "@/lib/content/processFacts";
import { isRentalOpen, OPEN_PHASE_BADGE } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  DownloadIcon,
  Note,
  PageHeading,
} from "@/components/ui/kit";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 신청 | 서울아레나",
};

/* ============================================================================
   대관 신청은 두 상태를 갖는다. 라우트는 같고 화면만 바뀐다.
     8/20 ~ 8/31 — 접수가 열리기 전 안내 화면
     9/1 이후    — 신청 위저드
   ========================================================================= */

/** 접수 개시까지의 준비 순서 */
const PREP_STEPS: { title: string; desc: string }[] = [
  {
    title: "회원가입",
    desc: "회사이름, 대표명, 사업자번호, 주소를 입력하고 사업자등록증을 첨부해 가입하십니다. 같은 회사에서 이미 가입한 담당자가 있으면 소속 가입으로 자동 분류됩니다.",
  },
  {
    title: "승인 확인",
    desc: "운영자 확인이 끝나면 등록하신 이메일로 안내드립니다. 승인 전에는 승인 대기 화면이 표시됩니다.",
  },
  {
    title: "대관 안내와 규약 확인",
    desc: "대관 절차 8단계를 확인하고, 자료실에서 대관 규약을 내려받아 읽으십니다. 신청서 제출 시 대관 규약 동의가 필요합니다.",
  },
  {
    title: "대관료 확인",
    desc: "로그인 후 대관료 페이지에서 공간별 요금 체계와 포함 항목을 확인하십니다.",
  },
  { title: "자료 준비", desc: "아래 목록의 자료를 미리 정리해 두십니다." },
];

/** 신청서 작성 시 입력·첨부하게 되는 것 */
const PREP_MATERIALS: string[] = [
  "희망 대관 일정 — 아레나는 화요일부터 일요일까지 6일 단위의 희망 주를, 중형공연장은 희망 일자와 일자별 셋업·공연 구분을 준비해 주세요. 1순위와 2순위를 함께 정해 두시면 조정이 쉽습니다.",
  "공연 개요 — 공연명, 공연 유형, 주최·주관, 출연 아티스트, 공연 회차와 1일 공연 횟수",
  "예상 관객 규모와 무대 형태 — 엔드 스테이지 또는 센터 스테이지, 플로어 지정석 또는 스탠딩 구성",
  "티켓 판매 계획 — 예정 티켓 오픈 시점과 판매 채널",
  "부대시설 사용 계획 — 부스, 팝업 공간, 연습실, 옥외 매체, 추가 주차 등 필요 항목",
  "담당자 정보 — 대관 담당자와 기술 담당자의 이름·연락처",
  "첨부 서류 — 사업자등록증(회원가입 시 제출), 공연 기획서 또는 사업계획서, 필요한 경우 기술 도면과 안전관리계획",
];

function NoticeLanding({ signedIn, approved }: { signedIn: boolean; approved: boolean }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading
          title="대관 신청"
          lead={
            <>
              <p className="type-kr-heading text-h4-m text-foreground sm:text-h4">
                대관 신청 접수는 2026년 9월 1일에 시작합니다.
              </p>
              <p className="measure mt-6 break-keep">
                지금 이 화면에서는 신청서를 작성하실 수 없습니다. 대신 오늘 하실 수 있는 일이
                하나 있습니다. 회원가입을 미리 마쳐 두는 것입니다.
              </p>
            </>
          }
        />
        {signedIn && (
          <Note className="measure mt-10">
            {approved
              ? "가입이 완료되었습니다. 9월 1일에 신청서 작성이 열립니다."
              : "가입 승인이 진행 중입니다. 승인이 끝나면 등록하신 이메일로 알려 드립니다."}
          </Note>
        )}
      </Band>

      <Band tone="white">
        <p className="type-display text-h6-m sm:text-h6">WHY NOW</p>
        <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">왜 지금 가입해야 하는가</h2>
        <div className="measure mt-8 space-y-4 break-keep text-m text-muted">
          <p>
            대관 신청은 로그인한 상태에서만 진행할 수 있고, 신청자 계정은 제출하신 사업자등록증과
            회사 정보를 운영자가 확인해 승인한 뒤 이용하실 수 있습니다. 즉 가입 신청과 신청서 작성
            사이에 승인을 기다리는 시간이 있습니다.
          </p>
          <p>
            9월 1일에 가입하시면 그 시간이 접수 기간 안으로 들어옵니다. 접수가 열린 것을 확인하고
            가입하신 뒤 승인을 기다리는 동안, 원하시는 일정이 다른 대관사의 신청으로 채워질 수
            있습니다. 지금 가입해 승인까지 마쳐 두시면 9월 1일에 로그인해 바로 신청서를 작성하실 수
            있습니다.
          </p>
          <p>
            가입은 접수와 무관하게 언제든 하실 수 있으며, 가입만으로 대관 신청이나 일정 선점이
            이뤄지지는 않습니다.
          </p>
        </div>
      </Band>

      <Band tone="light">
        <p className="type-display text-h6-m sm:text-h6">GET READY</p>
        <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">접수 개시까지의 준비 순서</h2>
        <ol className="mt-14 border-t border-border/25">
          {PREP_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-6 border-b border-border/15 py-6 sm:gap-8">
              <span className="type-display w-10 shrink-0 text-h5-m tabular-nums text-muted sm:text-h5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="type-kr-heading text-h6-m sm:text-h6">{s.title}</h3>
                <p className="measure mt-2 break-keep text-s text-muted">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="type-kr-heading mt-16 text-h5-m sm:text-h5">미리 준비하실 자료</h3>
        <p className="measure mt-4 break-keep text-s text-muted">
          신청서를 작성하실 때 아래 내용을 입력하고 첨부하시게 됩니다. 접수 개시 전에 정리해
          두시면 작성에 걸리는 시간을 줄이실 수 있습니다.
        </p>
        <ul className="measure mt-6 border-t border-border/25">
          {PREP_MATERIALS.map((t) => (
            <li key={t} className="break-keep border-b border-border/15 py-4 text-s text-muted">
              {t}
            </li>
          ))}
        </ul>
        <Note className="measure mt-8">심사 과정에서 추가 자료를 요청할 수 있습니다.</Note>
      </Band>

      <Band tone="dark">
        <p className="type-display text-h6-m sm:text-h6">HOW IT WORKS</p>
        <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">신청 이후 절차</h2>
        <p className="measure mt-6 break-keep text-m text-inverse-muted">
          신청 이후 절차는 대관 안내의 8단계를 따릅니다. 각 단계의 상세 내용은 대관 안내에서
          확인해 주세요.
        </p>
        <ol className="mt-12 border-t border-border/30">
          {PROCESS_SEGMENTS.map((seg) => (
            <li
              key={seg.title}
              className="grid gap-2 border-b border-border/20 py-6 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-[var(--gutter)]"
            >
              <div className="flex items-baseline gap-4">
                <span className="type-display text-s tabular-nums text-inverse-muted">
                  {seg.steps}
                </span>
                <h3 className="type-kr-heading text-h6-m sm:text-h6">{seg.title}</h3>
              </div>
              <p className="measure break-keep text-s text-inverse-muted">{seg.desc}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <ButtonLink href="/guide" variant="secondary">
            대관 절차 8단계 전체 보기
            <ArrowRight />
          </ButtonLink>
        </div>
      </Band>

      <Band tone="accent" size="sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="measure">
            <h2 className="type-kr-heading text-h4-m sm:text-h4">
              {signedIn ? "대관료와 공고를 먼저 확인해 두세요." : "먼저 회원가입을 해 두세요."}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {signedIn ? (
              <ButtonLink href="/packages" variant="primary">
                대관료 확인
                <ArrowRight />
              </ButtonLink>
            ) : (
              <ButtonLink href="/register" variant="primary">
                회원가입
                <ArrowRight />
              </ButtonLink>
            )}
            <ButtonLink href="/guide" variant="secondary">
              대관 안내
            </ButtonLink>
            <ButtonLink href="/library?doc=rules" variant="secondary">
              대관 규약 내려받기
              <DownloadIcon />
            </ButtonLink>
            <ButtonLink href="/notices" variant="secondary">
              진행 중 대관 공고
            </ButtonLink>
            <span className="inline-flex items-center gap-2 self-center text-xs">
              <Badge>{OPEN_PHASE_BADGE}</Badge> 대관 신청서 작성
            </span>
          </div>
        </div>
      </Band>
    </>
  );
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const open = isRentalOpen();

  // 8/20 안내 화면은 비로그인 방문자도 볼 수 있어야 한다.
  // 로그인·승인을 요구하는 것은 위저드(9/1)뿐이다.
  if (!open) {
    return (
      <div className="flex flex-1 flex-col">
        <PublicHeader active="/apply" currentUser={currentUser} />
        <main className="flex flex-1 flex-col">
          <NoticeLanding
            signedIn={!!currentUser}
            approved={!!currentUser && !isPendingApplicant(currentUser)}
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!currentUser) redirect("/login");
  if (isPendingApplicant(currentUser)) redirect("/pending");

  const [{ new: startFreshParam }, rateTable, weekDemand, dateBlocks] = await Promise.all([
    searchParams,
    getCurrentRateTable(),
    listWeekDemand(),
    listDateBlocks(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/apply" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="sm">
          <PageHeading
            size="md"
            title="대관 신청"
            lead="공간을 고르면 이후 신청 절차가 달라집니다. 입력하신 내용으로 예상 대관료를 확인하고 그대로 신청서까지 제출하실 수 있습니다."
          />
        </Band>

        <WizardShell
          rateTable={rateTable}
          currentUser={currentUser}
          weekDemand={weekDemand}
          dateBlocks={dateBlocks}
          startFresh={!!startFreshParam}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
