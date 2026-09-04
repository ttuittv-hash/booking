"use client";

import { RichText, Multiline } from "@/components/ui/kit";
import { useStageProgress } from "@/components/home/PhotoStage";

/**
 * 선언 — **섹션을 화면에 붙여 둔 채** 항목이 한 장씩 올라와 겹쳐 쌓인다.
 *
 * 처음에는 01 만 보인다. 스크롤하면 02 가 아래에서 올라와 01 의 **설명을 완전히 덮으며**
 * 01 의 머리(번호·제목) 바로 밑에 선다. 03 · 04 도 같은 방식이고, 넷이 모두 제자리에 붙은
 * 뒤에야 섹션이 화면 밖으로 흘러 나간다.
 *
 * 제목까지 무대 안에 둔다 — 검정 지면이 화면을 채웠을 때의 그 자리 그대로 남아야 한다.
 * 섹션 전체가 `sticky` 라서 쌓이는 동안 지면은 한 픽셀도 움직이지 않는다. 항목마다
 * `sticky` 를 걸던 방식은 지면이 함께 밀려 올라가 셋째 장부터 화면이 내려가 보였다.
 *
 * 덮기는 **머리 높이(HEAD)** 로 보장한다 — 카드가 앞 카드보다 딱 머리 하나만큼 아래에 서므로,
 * 앞 카드에서 남는 것은 머리뿐이고 설명은 빠짐없이 가려진다.
 */

/**
 * 쌓였을 때 앞 항목이 남기는 높이 = **카드 머리 한 통** = `--stack-head`.
 * 위 20 + 제목 한 줄 + 아래 20 이고, 제목 크기가 폭에 따라 달라지므로 값은 CSS 가 정한다
 * (`globals.css`). 이 값이 곧 다음 장이 서는 자리라서, 앞 장에서 남는 것은 머리뿐이고
 * 설명은 빠짐없이 가려진다.
 *
 * 머리의 글자는 **세로 가운데**에 둔다. 위 여백만 주고 높이를 고정했더니 헤어라인 아래
 * 여백이 0 이 되어, 줄마다 글자가 위로 쏠린 채 위아래가 어긋나 보였다.
 */
const HEAD = "var(--stack-head)";
const HEAD_PAD = "1.25rem"; // 머리 위아래 여백과 같은 값 — 설명 아래에 준다

export interface Statement {
  title: string;
  desc: string;
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function StackedStatements({ title, items }: { title: string; items: Statement[] }) {
  // 장 수만큼의 마디 — 첫 장은 처음부터 제자리이므로 마지막 한 마디가 곧 머무는 시간이다
  const steps = items.length;
  /*
    무대 높이는 화면 `steps × 0.7` 판이고, 그중 한 판은 붙어 있는 화면 자체가 차지한다.
    실제로 굴러가는 스크롤은 그 나머지다 — 진행도를 무대 높이로 나누면 끝까지 가도 p 가
    1 에 못 미쳐, **마지막 장이 제자리에 오기 전에 스크롤이 풀렸다.**
  */
  const runway = steps * 0.7;
  const { mark, p, reduce } = useStageProgress(runway - 1);
  // 마지막 마디는 다 붙은 뒤 머무는 시간이다 — 그 뒤에야 페이지가 내려간다
  const seg = 1 / steps;

  return (
    <>
      <div ref={mark} aria-hidden className="h-0" />
      <div className="relative" style={{ height: `${runway * 100}vh` }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="container-site pt-20">
            <h2 className="type-display text-h1-m sm:text-h1">
              <Multiline text={title} />
            </h2>

            <div
              className="relative mt-14"
              // 다 쌓였을 때의 높이 — 머리 (n−1)장 + 마지막 장 한 통
              style={{ height: `calc(${items.length - 1} * ${HEAD} + 11.25rem)` }}
            >
              {items.map((s, i) => {
                const enter = reduce || i === 0 ? 1 : clamp01((p - (i - 1) * seg) / seg);
                return (
                  <div
                    key={s.title}
                    className="absolute inset-x-0 top-0 bg-inverse-bg"
                    style={{
                      // 제자리는 머리 i 장만큼 아래. 오기 전에는 화면 아래쪽에서 기다린다.
                      transform: `translateY(calc(${i} * ${HEAD} + ${(1 - enter) * 70}vh))`,
                    }}
                  >
                    <div className="border-t border-border">
                      {/*
                        머리 — **번호와 제목이 한 줄**이다. 좁은 화면에서 둘을 위아래로 두었더니
                        다음 장이 제목을 덮어, 남는 것이 번호뿐이라 무슨 항목인지 알 수 없었다.
                        높이는 `--stack-head` 한 통이고 글자는 그 안에서 세로 가운데에 선다.
                      */}
                      <div
                        style={{ height: HEAD }}
                        className="flex items-center gap-4 lg:grid-site lg:items-center"
                      >
                        <p className="type-display shrink-0 text-h5-m leading-none tabular-nums lg:col-span-2 lg:text-h5">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <h3 className="type-display min-w-0 break-keep text-h5-m leading-[1.3] lg:col-span-4 lg:text-h4">
                          {s.title}
                        </h3>
                      </div>
                      <div className="lg:grid-site">
                        <p
                          style={{ paddingBottom: HEAD_PAD }}
                          className="max-w-2xl break-keep pt-1 text-m text-muted lg:col-span-4 lg:col-start-3"
                        >
                          <RichText text={s.desc} />
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
