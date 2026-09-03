import type { Metadata } from "next";
import { getCurrentUser, requireAccess } from "@/lib/auth";
import { getSeoulArenaContent } from "@/lib/db";
import type { AboutCard, SeoulArenaContent } from "@/lib/content/pageContent";
import { PublicHeader } from "@/components/PublicHeader";
import { ScrollFillText } from "@/components/ScrollFillText";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { CONTENT_TAB_PARAM } from "@/components/ui/nav-items";
import {
  Band,
  type FeatureItem,
  FeatureList,
  Multiline,
  PageHead,
  PLAIN_SURFACE_VARS,
  PhotoHero,
  Prose,
  SectionHead,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "서울아레나",
};

/**
 * YOUR STAGE › 서울아레나 — 탭: 시설개요 / 시설 특징.
 *
 * 헤딩 위계는 Notion 구조를 따른다 — H1 영문 슬로건, H3 국문 제목, H5 항목.
 * 공간 소개 두 블록은 Figma `02 공간 안내 › Header / 5` 의 전면 사진 섹션이므로
 * 탭 바만 마진 안에 두고 패널은 풀블리드로 흐르게 한다.
 * 문구·사진·항목은 모두 콘텐츠 관리에서 편집한다.
 */

/**
 * 소개 카드 세 장 — 서울아레나가 무엇으로 이루어져 있는지를 한 장에 하나씩.
 *
 * 제목은 카드 위, 설명은 **카드 바닥**에 붙는다. 셋의 설명 길이가 제각각이라
 * 위에서부터 흘리면 카드마다 글이 끝나는 자리가 달라 줄이 맞지 않아 보인다.
 *
 * 폭은 셋에서 곧바로 하나로 떨어진다 — 가운데에 둘씩 놓이는 단을 두면 셋 중
 * 하나만 아래로 내려가 짝이 어긋난 것처럼 읽힌다.
 */
/** 카드 한 장의 규격 — 제목 32 Bold · 130%, 설명 18 Regular. 두 탭이 같은 것을 쓴다. */
const CARD =
  "flex flex-col justify-between rounded-surface bg-panel p-8";
const CARD_TITLE =
  "break-keep text-[2rem] font-bold leading-[1.3] [font-family:var(--font-sans)]";
const CARD_BODY =
  "break-keep text-[1.125rem] font-normal leading-[1.6] text-muted [font-family:var(--font-sans)]";
/**
 * 공간명 라벨(아레나 · 중형공연장).
 * 색을 고정값으로 박는다 — 이 라벨은 흰 카드 위에도, 검정 지면의 리드에도 올라간다.
 * 지면 색을 따라가게 두면 검정 지면에서는 옅은 면에 흰 글자가 되어 읽히지 않는다.
 */
const PILL =
  "inline-flex items-center rounded-full bg-panel-strong px-3 py-1 text-[0.875rem] font-bold text-n-darkest";

/** 「공간명｜설명」 한 줄을 라벨과 본문으로 가른다. 구분자가 없으면 설명만 있는 것으로 본다 */
function splitLabel(line: string): { label: string; body: string } {
  const at = line.indexOf("｜");
  return at > 0
    ? { label: line.slice(0, at), body: line.slice(at + 1) }
    : { label: "", body: line };
}

function AboutCards({ items }: { items: AboutCard[] }) {
  return (
    <ul className="mt-14 grid gap-[var(--gutter)] lg:grid-cols-3">
      {items.map((card, i) => (
        <li
          key={`${card.title}-${i}`}
          /*
            높이는 넓은 화면에서만 맞춘다 — 세 장이 나란히 설 때만 아래 선이 맞아야 하고,
            좁은 화면에서는 세로로 쌓이므로 내용만큼만 차지하는 편이 낫다.
          */
          className={`${CARD} lg:min-h-[20rem]`}
        >
          <h3 className={CARD_TITLE}>
            <Multiline text={card.title} />
          </h3>
          <p className={`${CARD_BODY} pt-10`}>
            <Multiline text={card.desc} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function AboutPanel({ c }: { c: SeoulArenaContent }) {
  return (
    <>
      <Band tone="light" size="lg">
        <PageHead en="ABOUT SEOUL ARENA" ko="시설 개요" />
        {/* 머리 인용 — 본문 크기 18 Regular */}
        {c.aboutQuote && (
          <p className="mt-14 break-keep text-[1.125rem] font-normal leading-[1.6] [font-family:var(--font-sans)]">
            <Multiline text={c.aboutQuote} />
          </p>
        )}
        {c.aboutCards.length > 0 && <AboutCards items={c.aboutCards} />}
      </Band>

      {/*
        가운데 선언 — **화면 한 판을 이 문장만으로 채운다.**
        앞은 무엇을 갖췄는지, 뒤는 그곳이 어떤 곳인지다. 다른 것과 같은 지면에 두면
        카드 목록의 꼬리로 읽혀, 화면을 통째로 비우고 문장만 남겼다.
      */}
      {c.aboutStatements.length > 0 && (
        <section
          className="container-site flex flex-col items-center justify-center gap-12 text-center"
          // 지면색에서 흰색으로 내려가며 옅어진다 — 다음에 오는 사진 지면(흰색)으로 이어 붙는다
          style={{
            minHeight: "100vh",
            background: "linear-gradient(to bottom, var(--surface), var(--n-white))",
          }}
        >
          {/*
            글자 크기를 화면 폭에 매단다. 브레이크포인트에서만 크기가 바뀌면 그 사이
            구간에서 폭만 좁아져 같은 문장이 두 줄, 세 줄로 늘어났다 — 이 문장은
            줄바꿈 자체가 형태라서 줄 수가 바뀌면 다른 문장으로 보인다.
            6칼럼 지면(1024 이상)에서는 루트 크기가 이미 폭을 따라가므로 H1 을 그대로 쓴다.

            스크롤을 내리면 글자가 앞에서부터 한 자씩 채워진다 — 화면 한 판을 차지하는
            선언이라, 지나가는 동안 읽는 속도가 스크롤에 맞물린다.
          */}
          <ScrollFillText
            blocks={c.aboutStatements}
            className="type-kr-heading break-keep text-[5.2vw] leading-[1.3] lg:text-h1"
          />
        </section>
      )}

      {/* 사진 두 장은 흰 지면 위에 놓인다 — 회색 지면이면 사진 카드의 모서리가 묻힌다 */}
      <div className="bg-n-white">
        {c.heroes.map((v, i) => (
          <PhotoHero
            key={`${v.title}-${i}`}
            title={v.title}
            eyebrow={v.eyebrow}
            desc={v.desc}
            image={v.image}
          />
        ))}
      </div>

      {c.complexFeatures.length > 0 && (
        <Band tone="dark">
          <SectionHead title="FEATURES" lead={c.complexFeaturesLead} />
          <div className="mt-10">
            <FeatureList items={c.complexFeatures.map((t) => ({ title: t, lines: [] }))} numbered />
          </div>
        </Band>
      )}
    </>
  );
}

/**
 * 시설 특징 카드 — 시설개요와 같은 규격의 카드를 3열로 늘어놓는다.
 *
 * 표로 두었을 때는 항목마다 아레나·중형공연장 두 줄이 좌우로 갈려, 한 항목을 읽으려면
 * 눈이 표를 가로질러야 했다. 카드 안에서는 제목 아래 두 줄이 이어진다.
 */
function StageFeatureCards({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="mt-10 grid gap-[var(--gutter)] lg:grid-cols-3">
      {items.map((it, i) => (
        <li
          key={`${it.title}-${i}`}
          // 검정 지면 안의 카드 한 장만 밝은 면으로 되돌린다 — 안 그러면 검정 위 검정 글자가 된다
          style={PLAIN_SURFACE_VARS}
          className={`${CARD} text-foreground lg:min-h-[20rem]`}
        >
          <h3 className={CARD_TITLE}>
            <Multiline text={it.title} />
          </h3>
          {it.lines.length > 0 && (
            <div className="space-y-5 pt-10">
              {it.lines.map((line) => {
                /*
                  공간명을 알약 라벨로 떼어 내면 두 공간의 설명이 같은 자리에서 시작해,
                  카드 안에서 아레나와 중형공연장을 나란히 견줄 수 있다.
                */
                const { label, body } = splitLabel(line);
                return (
                  <div key={line}>
                    {label && <span className={PILL}>{label}</span>}
                    <p className={`${CARD_BODY} ${label ? "mt-2" : ""}`}>{body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function WhyPanel({ c }: { c: SeoulArenaContent }) {
  /*
    첫 항목은 카드가 아니라 **섹션 리드**다. 두 공연장을 함께 쓴다는 총론이라,
    나머지와 같은 크기의 카드로 놓으면 일곱 중 하나로 묻혔다. 남는 여섯이 3열 두 줄이다.
  */
  const [lead, ...cards] = c.stageFeatures;

  return (
    <>
      <Band tone="light" size="lg">
        <PageHead
          en="WHY SEOUL ARENA"
          ko="시설 특징"
          lead={<Prose text={c.whyLead} />}
          wideLead
        />
      </Band>

      {c.stageFeatures.length > 0 && (
        <Band tone="dark">
          <SectionHead
            title="FEATURES"
            lead={
              lead && (
                <>
                  <Multiline text={lead.title} />
                  {/* 공간명은 카드와 같은 알약 라벨로 — 리드에서는 설명과 한 줄에 붙는다 */}
                  {lead.lines.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {lead.lines.map((line) => {
                        const { label, body } = splitLabel(line);
                        return (
                          <p key={line} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {label && <span className={PILL}>{label}</span>}
                            <span>{body}</span>
                          </p>
                        );
                      })}
                    </div>
                  )}
                </>
              )
            }
          />
          {cards.length > 0 && <StageFeatureCards items={cards} />}
        </Band>
      )}
    </>
  );
}

export default async function SeoulArenaPage() {
  // 기획서 A15 접근권한 매트릭스 — 규칙은 accessPolicy.ts 한 곳에만 둔다
  await requireAccess("/seoularena");
  const [currentUser, content] = await Promise.all([getCurrentUser(), getSeoulArenaContent()]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/seoularena" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <QueryTabs
          param={CONTENT_TAB_PARAM}
          ariaLabel="서울아레나 소개"
          items={[
            { value: "about", label: "시설개요", panel: <AboutPanel c={content} /> },
            { value: "features", label: "시설 특징", panel: <WhyPanel c={content} /> },
          ]}
        />

      </main>

      {/* 두 탭 모두 검정 FEATURES 로 끝난다 — 푸터도 같은 지면으로 이어 둔다 */}
      <SiteFooter tone="dark" />
    </div>
  );
}
