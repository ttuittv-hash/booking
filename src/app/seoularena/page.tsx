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
  "flex flex-col justify-between rounded-surface bg-panel p-card-pad";
const CARD_TITLE = "break-keep text-h4 font-bold";
const CARD_BODY = "break-keep text-m font-normal text-muted";
/**
 * 공간명 라벨(아레나 · 중형공연장) — **대관료의 아이브로와 같은 규격**이다.
 *
 * 알약(면 + 라운드)으로 두었더니 사이트에서 이 화면에만 있는 형태라, 값을 읽기 전에
 * 라벨이 먼저 눈에 띄었다. 라벨은 값을 가리키는 이름표지 그 자체가 볼거리가 아니다.
 * 면을 걷어내고 작은 글자로 얹는다.
 *
 * 대관료 쪽은 영문 캡스라 Archivo 를 지정하지만 여기는 한글이라 뺀다 —
 * Archivo 에는 한글 글립이 없어 지정하면 시스템 서체로 떨어진다.
 */
/*
  공간명(아레나 · 중형공연장)은 **알약 레이블**이다. 설명 글과 같은 흐름의 글자로 두면
  어느 공간 이야기인지 훑어서 찾기 어렵다 — 테두리로 감싸 이름표라는 걸 드러낸다.
  색은 토큰으로만 잡는다: 흰 카드 안에서는 검정 테두리, 검정 지면 위에서는 밝은 테두리로
  각 자리의 지면색을 따라간다.
*/
const PILL_LABEL =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border px-3 py-0.5 text-xs font-bold text-foreground";

/** 「공간명｜설명」 한 줄을 라벨과 본문으로 가른다. 구분자가 없으면 설명만 있는 것으로 본다 */
function splitLabel(line: string): { label: string; body: string } {
  const at = line.indexOf("｜");
  return at > 0
    ? { label: line.slice(0, at), body: line.slice(at + 1) }
    : { label: "", body: line };
}

function AboutCards({ items }: { items: AboutCard[] }) {
  return (
    <ul className="mt-head-block grid gap-gutter lg:grid-cols-3">
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
          <p className={`${CARD_BODY} pt-card-body`}>
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
          <p className="mt-head-lead break-keep text-m font-normal">
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
          className="container-site flex flex-col items-center justify-center gap-block text-center"
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

      {/*
        사진 두 장은 흰 지면 위에 놓인다 — 회색 지면이면 사진 카드의 모서리가 묻힌다.
        사이는 카드끼리의 간격(거터)과 같고, 아래 여백은 지면 좌우 여백과 같은 값이다.
        사진도 마진 안에 앉는 한 장이라, 네 변의 여백이 같아야 지면 위에 놓인 것으로 보인다.
      */}
      <div className="bg-panel pb-margin-x">
        <div className="space-y-gutter">
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
      </div>

      {c.complexFeatures.length > 0 && (
        <Band tone="dark">
          <SectionHead title="FEATURES" lead={c.complexFeaturesLead} />
          <div className="mt-head-block">
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
    <ul className="mt-head-block grid gap-gutter lg:grid-cols-3">
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
            <div className="space-y-5 pt-card-body">
              {it.lines.map((line) => {
                /*
                  공간명을 아이브로로 떼어 내면 두 공간의 설명이 같은 자리에서 시작해,
                  카드 안에서 아레나와 중형공연장을 나란히 견줄 수 있다.
                */
                const { label, body } = splitLabel(line);
                return (
                  <div key={line}>
                    {label && <span className={PILL_LABEL}>{label}</span>}
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
                  {/* 공간명은 카드와 같은 아이브로로 — 리드에서는 설명과 한 줄에 붙는다 */}
                  {lead.lines.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {lead.lines.map((line) => {
                        const { label, body } = splitLabel(line);
                        return (
                          <p key={line} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {label && <span className={PILL_LABEL}>{label}</span>}
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
