"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * 홈 — 히어로 다음에 오는 사진 무대.
 *
 * 첫 화면에는 문장만 있고 사진은 아래에 있다. 스크롤을 내리면 사진이 올라와 화면에 붙고,
 * 그때부터 두 마디로 움직인다.
 *
 *   0 → 0.5   **가운데 3칼럼 폭에서 지면 전체 폭까지** 자란다.
 *   0.5 → 1   옅어지며 살짝 작아진다. 그동안 아래 검정 지면이 위로 올라와 덮는다.
 *
 * 덮는 동작은 CSS 가 맡는다 — 사진은 `sticky` 로 붙어 있고, **같은 부모 안에서** 뒤에 오는
 * 검정 지면이 더 높은 z 로 그 위를 지나간다. 그래서 이 컴포넌트는 호출부에서 검정 섹션과
 * 같은 `relative` 부모 안에 놓여야 한다(`app/page.tsx` 참고).
 *
 * 스크롤 핸들러는 `requestAnimationFrame` 으로 한 프레임에 한 번만 계산한다 —
 * 스크롤 이벤트는 프레임보다 자주 오고, 그때마다 레이아웃을 읽으면 버벅인다.
 */

/** 사진이 처음 서는 폭 — 6칼럼 기준 가운데 3칼럼(3c + 2 gutter) = 지면의 절반 */
const START_WIDTH = "calc((100% - 5 * var(--gutter)) / 6 * 3 + 2 * var(--gutter))";

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

const REDUCED = "(prefers-reduced-motion: reduce)";

/** 움직임을 줄여 달라는 설정. 서버에서는 없다고 보고(false) 클라이언트에서 맞춘다 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(REDUCED);
      m.addEventListener("change", notify);
      return () => m.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/**
 * 무대 진행도 — 표식이 화면 위로 얼마나 지나갔는지를 0~1 로 돌려준다.
 * `run` 은 그 무대가 쓰는 스크롤 양(화면 판 수).
 */
export function useStageProgress(run: number) {
  const mark = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const read = () => {
      const el = mark.current;
      if (!el) return;
      setP(clamp01(-el.getBoundingClientRect().top / (window.innerHeight * run)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(read);
    };
    // 첫 값도 다음 프레임에 읽는다 — 효과 안에서 바로 상태를 바꾸면 렌더가 한 번 더 돈다
    raf = requestAnimationFrame(read);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduce, run]);

  return { mark, p, reduce };
}

export function PhotoStage({ image, alt }: { image?: string | null; alt: string }) {
  const { mark, p, reduce } = useStageProgress(2);

  /*
    0 → 0.4   자란다
    0.4 → 0.7 **다 자란 채로 머문다** — 한 번 더 내려도 사진이 그대로 있는 구간이다.
              곧바로 옅어지면 다 자란 모습을 볼 새가 없었다.
    0.7 → 1   옅어지며 작아진다
  */
  const grow = reduce ? 1 : clamp01(p / 0.4);
  const leave = reduce ? 0 : clamp01((p - 0.7) / 0.3);

  return (
    <>
      <div ref={mark} aria-hidden className="h-0" />
      <div className="sticky top-0 z-0 flex h-screen items-center overflow-hidden">
        <div
          className="container-site"
          style={{
            opacity: 1 - leave,
            transform: `scale(${1 - leave * 0.08})`,
            transformOrigin: "50% 50%",
          }}
        >
          <div
            className="mx-auto overflow-hidden rounded-surface"
            // 폭만 바꾼다 — transform 으로 키우면 사진이 늘어나 보이고 코너도 함께 커진다
            style={{ width: `calc(${START_WIDTH} + (100% - ${START_WIDTH}) * ${grow})` }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={alt}
                style={{ aspectRatio: "21 / 9" }}
                className="block max-h-[70vh] w-full object-cover"
              />
            ) : (
              <div
                style={{ aspectRatio: "21 / 9" }}
                role="img"
                aria-label={alt}
                className="max-h-[70vh] w-full bg-placeholder"
              />
            )}
          </div>
        </div>
      </div>
      {/* 사진이 자라는 구간의 스크롤을 만드는 빈 칸 — 이만큼 지난 뒤 검정 지면이 올라온다 */}
      <div aria-hidden className="h-screen" />
    </>
  );
}
