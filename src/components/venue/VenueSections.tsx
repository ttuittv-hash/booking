import {
  ADDRESS,
  ARENA_BACK_OF_HOUSE,
  ARENA_CAPACITY_BY_STAGE,
  ARENA_FEATURES,
  ARENA_INFRA,
  ARENA_RATE_INCLUDES,
  ARENA_SEATS_BY_FLOOR,
  ARENA_SPEC_GROUPS,
  CAPACITY_DISCLAIMER,
  COMPLEX,
  COMPLEX_PARKING,
  DESIGN_BASIS_DISCLAIMER,
  LIVE_HALL_BACK_OF_HOUSE,
  LIVE_HALL_CAPACITY,
  LIVE_HALL_FEATURES,
  LIVE_HALL_INFRA,
  LIVE_HALL_RATE_INCLUDES,
  LIVE_HALL_SEATING,
  LIVE_HALL_SPEC_GROUPS,
  OPENING,
  VENUE_COMPARISON,
  type BackOfHouseRow,
  type FeatureSection,
  type InfraRow,
} from "@/lib/content/venueFacts";
import { OPEN_PHASE_BADGE } from "@/lib/release";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { VENUE_TAB_PARAM, VENUE_TABS } from "@/components/ui/nav-items";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  CTABand,
  ComparisonTable,
  DownloadIcon,
  Media,
  Note,
  PageHeading,
  SpecTable,
} from "@/components/ui/kit";

/* ============================================================================
   YOUR STAGE — 4개 페이지
     /venue             시설 개요   8/20 · 탭 없음 · 비교표 소유
     /venue/features    무대 특장   8/20 · 탭: 아레나 / 중형공연장
     /venue/specs       시설 제원   9/1  · 탭: 아레나 / 중형공연장
     /venue/amenities   부대시설    9/1  · 탭: 아레나 / 중형공연장

   페이지는 내용 카테고리로 나누고 공간은 페이지 안의 탭으로 전환한다.
   찾는 경로는 내용으로 고정되고, 보는 대상은 탭으로 걸러진다.

   화면 카피에 **섹션 자신을 설명하는 문장을 쓰지 않는다.**
   "이 표는 …입니다", "아래는 …을 묶은 것입니다" 같은 문장은 대관사에게 정보를 주지 않고
   자리만 차지한다. 리드가 필요한 자리에는 판단에 쓰이는 사실을 쓴다.
   ========================================================================= */

/** 섹션 제목 — 첨부 PDF·요금 시트가 이미 쓰는 영문 키워드로 통일한다 */
function SectionTitle({ en, ko, lead }: { en: string; ko: string; lead?: React.ReactNode }) {
  return (
    <div>
      <p className="type-display text-h6-m sm:text-h6">{en}</p>
      <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">{ko}</h2>
      {lead && <div className="measure mt-6 break-keep text-m text-muted">{lead}</div>}
    </div>
  );
}

/** 자료실로 보내는 공통 블록 — 웹과 첨부의 정보 경계는 자료실이 책임진다 */
function Downloads({ lead }: { lead: string }) {
  return (
    <Band tone="white">
      <SectionTitle en="DOWNLOADS" ko="자료 다운로드" lead={lead} />
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/library" variant="primary">
          시설소개자료 내려받기
          <DownloadIcon />
        </ButtonLink>
        <ButtonLink href="/library" variant="secondary">
          자료실 전체 보기
        </ButtonLink>
      </div>
    </Band>
  );
}

/* --------------------------------------------------------- 시설 개요 ------ */

export function VenueOverviewView() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading
          title="시설 개요"
          lead={`서울아레나는 서울 도봉구 창동에 ${OPENING} 개관을 목표로 짓고 있는 공연 단지입니다. 아레나와 중형공연장, 복합문화컨벤션, 판매시설이 한 부지에 모여 있어 공연 규모가 달라져도 같은 단지 안에서 무대를 옮겨 잡을 수 있습니다.`}
        />
        <div className="mt-14">
          <Media src={null} alt="서울아레나 조감도" ratio="21 / 9" />
          <p className="mt-3 text-xs text-muted">
            개관 전 조감도이며 준공 시 실제 모습과 다를 수 있습니다.
          </p>
        </div>
      </Band>

      {/* THE COMPLEX — 네 개의 공간 */}
      <Band tone="dark">
        <SectionTitle en="THE COMPLEX" ko="네 개의 공간" />
        <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-14 lg:grid-cols-2">
          {COMPLEX.map((v) => (
            <article key={v.name}>
              <h3 className="type-kr-heading text-h5-m sm:text-h5">{v.name}</h3>
              <p className="mt-2 text-s font-bold">{v.headline}</p>
              <p className="measure mt-4 break-keep text-s text-muted">{v.desc}</p>
            </article>
          ))}
        </div>
      </Band>

      {/* 공간 선택 — 두 공간을 나란히 놓는 유일한 자리 */}
      <Band tone="light">
        <SectionTitle
          en="CHOOSE YOUR VENUE"
          ko="어느 공간이 우리 공연에 맞는가"
          lead="예상 관중이 1만 명을 넘으면 아레나, 3천 명 이하면 중형공연장이 기준선입니다. 그 사이 구간이라면 무대 형태가 기준이 됩니다. 아레나는 무대를 엔드와 센터 사이에서 바꿔 잡을 수 있고, 중형공연장은 무대 폭 24m가 고정되는 대신 배튼과 리프트로 장면을 바꿉니다."
        />

        <div className="mt-14">
          <ComparisonTable
            rowLabel="항목"
            columns={[
              { key: "arena", title: "아레나", align: "left" },
              { key: "live-hall", title: "중형공연장", align: "left" },
            ]}
            rows={VENUE_COMPARISON.map((r) => ({
              label: r.label,
              cells: [r.arena, r.liveHall],
            }))}
          />
        </div>

        <Note className="measure mt-8">
          전력은 두 공간 모두 3상 4선식 380V입니다. {CAPACITY_DISCLAIMER}
        </Note>

        {/* 페이지 이동과 탭 선택이 한 번에 끝나게 한다 */}
        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/venue/specs?venue=arena" variant="primary">
            아레나 제원 보기
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/venue/specs?venue=live-hall" variant="secondary">
            중형공연장 제원 보기
          </ButtonLink>
        </div>
      </Band>

      {/* GETTING HERE — 값은 FAQ 가 소유하고 여기서는 링크만 건다 */}
      <Band tone="white">
        <SectionTitle en="GETTING HERE" ko="오시는 길" />
        <div className="measure mt-8 space-y-4 break-keep text-s text-muted">
          <p>서울아레나는 {ADDRESS}에 자리합니다.</p>
          <p>
            주차장은 단지 전체 {COMPLEX_PARKING.total.toLocaleString()}대 규모로, 지하 2층{" "}
            {COMPLEX_PARKING.b2f.toLocaleString()}대와 지하 1층{" "}
            {COMPLEX_PARKING.b1f.toLocaleString()}대로 나뉩니다. 대관 패키지에 포함되는 관계자 주차
            대수는 공간별로 다르며, 아레나와 중형공연장 각각의 포함 대수는 대관료 페이지에 있습니다.
          </p>
          <p>
            지하철 노선과 인접 역, 버스 편, 차량 진입 동선, 관객 주차 운영 방식은 교통·주차 안내에
            정리되어 있습니다.
          </p>
        </div>
        <div className="mt-10">
          <ButtonLink href="/faq" variant="secondary">
            교통·주차 안내 보기
            <ArrowRight />
          </ButtonLink>
        </div>
      </Band>

      <Downloads lead="층별 도면, 출입·차량 동선도, 조감도와 투시도는 시설소개자료 PDF에 수록합니다. 전기 분전함의 회로별 차단기 용량, 배튼·커튼 개별 규격, 부속실 실별 면적표도 같은 자료에 있습니다. 기술 검토 단계에서는 웹 페이지보다 이 자료를 먼저 열어 보시기를 권합니다." />

      {/* 더 보기 — 미공개 페이지도 숨기지 않고 라벨로 알린다 */}
      <Band tone="light">
        <SectionTitle en="MORE" ko="더 보기" />
        <ul className="mt-10 border-t border-border/25">
          {[
            { href: "/venue/features", label: "무대 특장", badge: null },
            { href: "/venue/specs", label: "시설 제원", badge: OPEN_PHASE_BADGE },
            { href: "/venue/amenities", label: "부대시설", badge: OPEN_PHASE_BADGE },
          ].map((p) => (
            <li key={p.href} className="border-b border-border/15">
              <a
                href={p.href}
                className="flex items-center justify-between gap-6 py-6 transition-colors hover:bg-foreground/[0.04]"
              >
                <span className="type-kr-heading text-h6-m sm:text-h6">{p.label}</span>
                <span className="flex items-center gap-4">
                  {p.badge && <Badge>{p.badge}</Badge>}
                  <ArrowRight />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <Note className="measure mt-8">
          시설 제원과 부대시설은 9월 1일 대관 오픈과 함께 공개합니다. 그전에 치수와 부속 공간 구성을
          확인하셔야 한다면 시설소개자료를 내려받아 보십시오.
        </Note>
      </Band>

      <CTABand
        title="대관 일정과 신청 방법은 대관 공고에 있습니다."
        lead="대관 신청은 회원가입과 운영자 승인을 거쳐야 하므로, 신청 계획이 있으시면 공고 확인과 함께 가입을 먼저 진행하시는 편이 빠릅니다."
        actions={
          <>
            <ButtonLink href="/notices" variant="primary">
              대관 공고 보기
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/register" variant="secondary">
              회원가입
            </ButtonLink>
          </>
        }
      />
    </>
  );
}

/* --------------------------------------------------------- 무대 특장 ------ */

function FeaturePanel({ sections }: { sections: FeatureSection[] }) {
  return (
    <div className="space-y-20 pt-14">
      {sections.map((sec) => (
        <section key={sec.key}>
          <SectionTitle en={sec.title} ko={sec.lead} />
          <div className="mt-12 space-y-12">
            {sec.cards.map((c) => (
              <article key={c.title} className="border-t border-border/25 pt-8">
                <h3 className="type-kr-heading text-h5-m sm:text-h5">{c.title}</h3>
                <p className="measure mt-5 break-keep text-s text-muted">{c.body}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function VenueFeaturesView() {
  return (
    <>
      {/* 헤딩과 리드는 탭 밖에 둔다. 탭을 바꿀 때마다 같은 리드를 다시 읽게 하지 않는다. */}
      <Band tone="light" size="lg">
        <PageHeading
          title="무대 특장"
          lead="같은 규모의 공연장이라도 무대에서 할 수 있는 일은 상부 활하중, 반입 개구부, 리프트 적재하중에서 갈립니다. 모든 수치는 시설소개자료(V1.0)에 근거합니다."
        />
      </Band>

      <Band tone="white">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel: (
              <FeaturePanel sections={t.value === "arena" ? ARENA_FEATURES : LIVE_HALL_FEATURES} />
            ),
          }))}
        />
      </Band>

      <Band tone="light">
        <SectionTitle
          en="SOURCE"
          ko="수치 근거"
          lead="층별 도면, 분전함 회로별 용량, 배튼·커튼 개별 규격은 시설소개자료(V1.0)에 있습니다. 시설 제원과 부대시설 페이지는 9월 1일에 공개합니다."
        />
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/library" variant="primary">
            시설소개자료 내려받기
            <DownloadIcon />
          </ButtonLink>
          <ButtonLink href="/venue/specs" variant="secondary">
            시설 제원 ({OPEN_PHASE_BADGE})
          </ButtonLink>
          <ButtonLink href="/venue/amenities" variant="secondary">
            부대시설 ({OPEN_PHASE_BADGE})
          </ButtonLink>
        </div>
      </Band>

      <CTABand
        title="이 무대에서 준비 중인 공연이 성립하는지 함께 검토하겠습니다."
        lead="기술 검토 단계에서 확인이 필요한 항목은 1:1 문의로 남겨 주시면 담당자가 자료와 함께 회신합니다."
        actions={
          <>
            <ButtonLink href="/mypage/inquiries" variant="primary">
              1:1 문의하기
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/notices" variant="secondary">
              대관 공고 보기
            </ButtonLink>
          </>
        }
      />
    </>
  );
}

/* --------------------------------------------------------- 시설 제원 ------ */

function InfraTable({ rows }: { rows: InfraRow[] }) {
  return (
    <ComparisonTable
      rowLabel="장비"
      columns={[
        { key: "qty", title: "수량", align: "left" },
        { key: "spec", title: "규격", align: "left" },
        { key: "note", title: "적재하중·특징", align: "left" },
      ]}
      rows={rows.map((r) => ({ label: r.name, cells: [r.qty, r.spec, r.note] }))}
    />
  );
}

function ArenaSpecsPanel() {
  return (
    <div className="space-y-20 pt-14">
      <section>
        <SectionTitle en="CAPACITY" ko="수용인원과 층별 좌석 구성" />
        <div className="mt-12 space-y-14">
          <ComparisonTable
            rowLabel="무대 배치"
            columns={[
              { key: "seated", title: "객석 운영 시", align: "left" },
              { key: "standing", title: "스탠딩 운영 시", align: "left" },
            ]}
            rows={ARENA_CAPACITY_BY_STAGE.map((r) => ({
              label: r.stage,
              cells: [r.seated, r.standing],
            }))}
          />
          <ComparisonTable
            rowLabel="층"
            columns={[
              { key: "center", title: "센터 스테이지 기준", align: "left" },
              { key: "end", title: "엔드 스테이지 기준", align: "left" },
            ]}
            rows={ARENA_SEATS_BY_FLOOR.map((r) => ({ label: r.floor, cells: [r.center, r.end] }))}
          />
        </div>
        <Note className="measure mt-8">
          4층에는 휠체어석 4석과 보호자석 4석을 별도로 확보합니다. {CAPACITY_DISCLAIMER} 층별 좌석
          수는 설계 기준 참고치이므로, 공연별 실제 판매 좌석은 무대 배치와 객석 운영 계획을 확정한 뒤
          산정합니다.
        </Note>
      </section>

      <section>
        <SectionTitle en="KEY SPECS" ko="주요 제원" />
        <div className="mt-12 space-y-12">
          {ARENA_SPEC_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="type-kr-heading text-h6-m sm:text-h6">{g.title}</h3>
              <SpecTable className="mt-5" rows={g.rows} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle en="KEY INFRA" ko="보유 장비" />
        <div className="mt-12">
          <InfraTable rows={ARENA_INFRA} />
        </div>
      </section>
    </div>
  );
}

function LiveHallSpecsPanel() {
  return (
    <div className="space-y-20 pt-14">
      <section>
        <SectionTitle en="CAPACITY" ko="수용인원과 객석 구성" />
        <div className="mt-12 grid gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-2">
          <SpecTable rows={LIVE_HALL_CAPACITY} />
          <SpecTable rows={LIVE_HALL_SEATING} />
        </div>
        <Note className="measure mt-8">{CAPACITY_DISCLAIMER}</Note>
      </section>

      <section>
        <SectionTitle en="KEY SPECS" ko="주요 제원" />
        <div className="mt-12 space-y-12">
          {LIVE_HALL_SPEC_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="type-kr-heading text-h6-m sm:text-h6">{g.title}</h3>
              <SpecTable className="mt-5" rows={g.rows} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle en="KEY INFRA" ko="보유 장비" />
        <div className="mt-12">
          <InfraTable rows={LIVE_HALL_INFRA} />
        </div>
      </section>
    </div>
  );
}

export function VenueSpecsView() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading
          title="시설 제원"
          lead={`${DESIGN_BASIS_DISCLAIMER} 회로별 차단기 용량이나 배튼·커튼 개별 규격처럼 더 상세한 설계 자료는 시설소개자료에 있습니다.`}
        />
      </Band>

      <Band tone="white">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel: t.value === "arena" ? <ArenaSpecsPanel /> : <LiveHallSpecsPanel />,
          }))}
        />
      </Band>

      <Downloads lead="층별 도면, 출입·차량 동선도, 전기 분전함의 회로별 차단기 용량, 배튼·커튼 개별 규격, 부속실 실별 면적표, 조감도와 투시도는 시설소개자료 PDF에 있습니다." />

      <CTABand
        title="제원을 확인하셨다면 부속 공간 구성과 대관료 포함 범위가 다음 단계입니다."
        actions={
          <>
            <ButtonLink href="/venue/amenities" variant="primary">
              부대시설 보기
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/packages" variant="secondary">
              대관료 보기 (로그인 필요)
            </ButtonLink>
          </>
        }
      />
    </>
  );
}

/* --------------------------------------------------------- 부대시설 ------- */

function BackOfHouseTable({ rows }: { rows: BackOfHouseRow[] }) {
  return (
    <ComparisonTable
      rowLabel="층"
      columns={[
        { key: "room", title: "공간", align: "left" },
        { key: "area", title: "면적", align: "left" },
      ]}
      rows={rows.map((r, i) => ({ label: `${r.floor}`, cells: [r.room, r.area] }))}
    />
  );
}

function AmenitiesPanel({ venue }: { venue: "arena" | "live-hall" }) {
  const arena = venue === "arena";
  return (
    <div className="space-y-20 pt-14">
      <section>
        <SectionTitle
          en="BACK OF HOUSE"
          ko="부속 공간"
          lead={
            arena
              ? "대기실과 연습실을 포함해 30개실 이상을 운영합니다. 대기실은 지하 1층 8실과 1층 6실로 총 14실입니다."
              : undefined
          }
        />
        <div className="mt-12">
          <BackOfHouseTable rows={arena ? ARENA_BACK_OF_HOUSE : LIVE_HALL_BACK_OF_HOUSE} />
        </div>
        <Note className="measure mt-8">
          {arena
            ? "화장실·샤워실은 지하 1층과 1층에 별도로 운영합니다."
            : "화장실·샤워실은 층별로 별도 운영합니다."}
        </Note>
      </section>

      <section>
        <SectionTitle
          en="RATE INCLUDES"
          ko="대관료에 포함되는 것"
          lead={
            arena
              ? "아레나 대관료는 패키지 단위로 산정합니다. 대관 기간 1주는 셋업 4일과 공연 2일을 합한 6일입니다."
              : "중형공연장은 패키지가 없습니다. 사용한 일수를 기준으로 대관료를 계산하고, 일자마다 셋업일인지 공연일인지 지정합니다. 공연일은 평일과 주말을 나눠 단가가 달라집니다. 부대시설도 패키지 포함분 개념 없이 항목별로 신청합니다."
          }
        />
        <SpecTable
          className="mt-12"
          rows={arena ? ARENA_RATE_INCLUDES : LIVE_HALL_RATE_INCLUDES}
        />
        <div className="measure mt-8 space-y-4 break-keep text-s text-muted">
          {arena ? (
            <>
              <p>
                기준 공연시간은 1회당 최대 240분이고, 기준 이용시간은 09:00부터 22:00까지입니다.
                12:00~13:00과 18:00~19:00은 이용 제한시간이며 별도 협의로 변경할 수 있습니다.
              </p>
              <p>
                센터 리프트, 팔로우 스팟, 인터컴, 부스·팝업 공간, 지하 1층 연습실, 옥외 광고물은
                추가 항목으로 신청합니다. 항목별 요금과 프리미엄 공간 포함 조건은 대관료 페이지에
                있습니다.
              </p>
            </>
          ) : (
            <>
              <p>
                기준 공연시간은 1회당 최대 180분이고, 1일 2회 공연 시 추가 회차에 30% 할증이
                붙습니다. 기준 이용시간은 09:00부터 22:00까지이며 12:00~13:00과 18:00~19:00은 이용
                제한시간입니다.
              </p>
              <p>
                추가 대관 시간, 팝업 공간, 지하 1층 연습실, 옥외 광고, 수도광열비, 추가 주차권은
                별도 항목으로 산정합니다. 일자별 단가와 추가 항목 요금은 대관료 페이지에 있습니다.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function VenueAmenitiesView() {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHeading
          title="부대시설"
          lead="대기실과 프로덕션룸처럼 대관료에 포함된 공간은 실수가 정해져 있고, 포함되지 않은 공간은 신청하신 범위만큼 별도로 청구됩니다. 면적은 건축 설계 기준 면적으로, 준공 시 세부 면적은 달라질 수 있습니다."
        />
      </Band>

      <Band tone="white">
        <QueryTabs
          param={VENUE_TAB_PARAM}
          items={VENUE_TABS.map((t) => ({
            value: t.value,
            label: t.label,
            panel: <AmenitiesPanel venue={t.value} />,
          }))}
        />
      </Band>

      <Downloads lead="부속실 실별 면적표와 층별 도면은 시설소개자료 PDF에 있습니다." />

      <CTABand
        title="필요한 부속 공간이 확인되셨다면 대관료에서 포함 범위와 추가 항목 요금을 보실 수 있습니다."
        actions={
          <>
            <ButtonLink href="/packages" variant="primary">
              대관료 보기 (로그인 필요)
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/mypage/inquiries" variant="secondary">
              1:1 문의하기
            </ButtonLink>
          </>
        }
      />
    </>
  );
}
