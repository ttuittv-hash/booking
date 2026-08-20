import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { isRentalOpen, OPEN_PHASE_LABEL } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  ComparisonTable,
  Note,
  PageHeading,
  ReleaseNotice,
  SpecTable,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "커넥티드 라이브 | 서울아레나",
};

/**
 * BOOK IT 하위에 두는 것은 확정 사항이다. 연계 공간의 사양과 요금이 확정된 뒤에도
 * 위치를 옮기지 않는다.
 *
 * 근거 없는 정량·정도 표현은 전부 뺐다. 삭제 대상은 "관객 2~3배", "중계 비용 크게 절감",
 * "컨벤션홀 약 1,400명" 이며 모두 근거 문서가 없다. 배수나 절감률을 다른 수치로
 * 바꿔 넣지 않고, 어떤 공연에 검토할 만한지를 조건으로 서술했다.
 *
 * 심사와의 관계 — 기존 카피는 대관 심사 가점을 약속했으나 실제 심사 로직에 가점 반영이 없다.
 * 이행할 수 없는 약속이므로 "참고 요소"로 낮췄다. 심사 항목과 배점이 정의되기 전까지
 * 화면에서 가점·우대·우선이라는 단어를 쓰지 않는다.
 */

const LINKED_SPACES: { space: string; capacity: string; note: string }[] = [
  {
    space: "중형공연장",
    capacity: "스탠딩 최대 3,500명 / 좌석 2,000~2,500명",
    note: "아레나와 연계한 공연 운영이 가능합니다.",
  },
  {
    space: "복합문화컨벤션",
    capacity: "미확정",
    note: "K-컬처 맞춤 체류형 소비·문화 체험 공간입니다. 수용 규모와 세부 사양은 확정 후 안내합니다.",
  },
  {
    space: "야외광장",
    capacity: "미확정",
    note: "아레나 광장 3,835㎡, 중형공연장 광장 1,081㎡입니다. 면적 기준 수용 규모는 운영 계획에 따라 산정합니다.",
  },
  {
    space: "판매시설",
    capacity: "미확정",
    note: "웨딩·팬사인회·팬미팅 등 소규모 이벤트 공간입니다. 세부 사양은 확정 후 안내합니다.",
  },
];

function SectionTitle({ en, ko, lead }: { en: string; ko: string; lead?: React.ReactNode }) {
  return (
    <div>
      <p className="type-display text-h6-m sm:text-h6">{en}</p>
      <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">{ko}</h2>
      {lead && <div className="measure mt-6 break-keep text-m text-muted">{lead}</div>}
    </div>
  );
}

export default async function ConnectedLivePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  if (!isRentalOpen()) {
    return (
      <div className="flex flex-1 flex-col">
        <PublicHeader active="/guide/connected-live" currentUser={currentUser} />
        <main className="flex flex-1 flex-col">
          <ReleaseNotice
            title="커넥티드 라이브"
            releaseLabel={OPEN_PHASE_LABEL}
            lead="아레나 공연을 같은 단지 안의 다른 공간으로 연계해 함께 운영하는 방식입니다. 연계 가능 공간과 요금 안내는 9월 1일 대관 오픈과 함께 공개합니다."
            alternatives={
              <>
                <ButtonLink href="/guide" variant="primary">
                  대관 안내 보기
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/mypage/inquiries" variant="secondary">
                  연계 운영 문의
                </ButtonLink>
              </>
            }
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide/connected-live" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="커넥티드 라이브"
            lead="아레나에서 열리는 공연을 같은 단지 안의 다른 공간으로 연계해 함께 운영하는 방식입니다. 아레나 객석만으로 관객을 다 담기 어려운 공연이나, 공연 전후 시간대에 단지 안에서 관객 동선을 이어가고 싶은 공연에 검토하실 수 있습니다. 연계 범위와 운영 방식은 공연별로 협의해 정합니다."
          />
        </Band>

        <Band tone="white">
          <SectionTitle en="LINKED SPACES" ko="연계 가능 공간" />
          <div className="mt-14">
            <ComparisonTable
              rowLabel="공간"
              columns={[
                { key: "capacity", title: "수용 규모", align: "left" },
                { key: "note", title: "비고", align: "left" },
              ]}
              rows={LINKED_SPACES.map((s) => ({ label: s.space, cells: [s.capacity, s.note] }))}
            />
          </div>
          <Note className="measure mt-8">
            수용 규모는 일반적인 무대·객석 구성을 기준으로 보수적으로 산정한 참고치이며, 공연별
            무대 규모 및 객석 운영 계획에 따라 확대·조정될 수 있습니다. 옥외 중계용 전력은 200A를
            사용하실 수 있으며, 야외광장에는 200A·100A·100A 회로가 배치됩니다.
          </Note>
        </Band>

        <Band tone="light">
          <SectionTitle
            en="REVIEW"
            ko="대관 심사와의 관계"
            lead="커넥티드 라이브 연계를 함께 신청하시면 대관 심사에서 참고 요소로 검토합니다. 신청서의 공연 정보에 연계 희망 공간과 운영 계획을 적어 주시면 심사 단계에서 함께 봅니다. 연계 신청이 승인 여부를 결정하지는 않으며, 일정과 공연 내용, 시설 적합성을 종합적으로 검토하는 기존 심사 기준이 그대로 적용됩니다."
          />
        </Band>

        <Band tone="white">
          <SectionTitle
            en="RATE"
            ko="연계 운영에 적용되는 요금"
            lead="현재 요금표에 확정된 커넥티드 라이브 관련 항목은 송출 수수료 하나입니다."
          />
          <SpecTable className="mt-12" rows={[["송출 수수료", "매출의 3%"]]} />
          <Note className="measure mt-8">
            연계하시는 공간의 사용료와 중계 운영 비용은 별도 협의로 정합니다. 연계 범위가 공연마다
            다르고 사용하시는 공간의 조합에 따라 산정 방식이 달라지기 때문입니다.
          </Note>
        </Band>

        <CTABand
          title="연계 구성을 검토 중이시라면 먼저 알려 주세요."
          lead="연계 범위와 운영 방식은 공연별로 협의해 정합니다."
          actions={
            <>
              <ButtonLink href="/apply" variant="primary">
                대관 신청
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/mypage/inquiries" variant="secondary">
                연계 운영 문의
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
