"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/home/PhotoStage";

/**
 * 스크롤을 따라 **글자가 한 자씩 채워지는** 문장.
 *
 * 처음에는 옅은 회색으로 전부 놓여 있고, 문장이 화면 가운데를 지나는 동안 앞에서부터
 * 한 자씩 지면 글자색으로 바뀐다. 읽는 속도를 스크롤에 맡기는 방식이라, 여러 문단을
 * 넘겨도 한 줄기로 이어진다 — 그래서 진행도는 문단마다가 아니라 **전체 글자 수** 로 센다.
 *
 * 글자마다 요소를 만들지만 색만 바뀌므로 레이아웃 계산이 다시 일어나지 않는다.
 * 스크롤 계산은 `requestAnimationFrame` 으로 한 프레임에 한 번만 한다 — 스크롤 이벤트는
 * 프레임보다 자주 오고, 그때마다 위치를 읽으면 버벅인다.
 *
 * 움직임을 줄여 달라는 설정에서는 처음부터 다 채워진 상태로 그린다.
 */
function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function ScrollFillText({
  blocks,
  className = "",
  gap = "gap-12",
}: {
  /** 문단들. 문단 안의 줄바꿈(`\n`)은 그대로 지킨다 */
  blocks: string[];
  /** 각 문단에 붙일 타이포 클래스 */
  className?: string;
  /** 문단 사이 간격 */
  gap?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const read = () => {
      const el = host.current;
      if (!el) return;
      const { top } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      /*
        문장 윗줄이 화면 아래쪽(90%)에 들어오면 시작해, **윗줄이 화면 꼭대기 가까이
        올라왔을 때(13%) 다 채워진다.** 채우는 구간이 화면 한 판에 가깝다.
        완료를 화면 중턱에 두었더니 문장이 아직 한가운데에 있는데 이미 다 검어져,
        스크롤을 내려도 아무 일이 없는 구간이 길게 남았다.
      */
      const start = vh * 0.9;
      const end = vh * 0.13;
      setP(clamp01((start - top) / (start - end)));
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
  }, [reduce]);

  const total = blocks.reduce((n, b) => n + b.replace(/\n/g, "").length, 0);
  const filled = reduce ? total : Math.round(p * total);
  // 문단을 가로지르며 세는 색인. 렌더마다 0 부터 다시 센다.
  let seen = 0;

  return (
    <div ref={host} className={`flex flex-col items-center ${gap}`}>
      {blocks.map((block, bi) => (
        <p key={bi} className={className}>
          {[...block].map((ch, i) => {
            if (ch === "\n") return <br key={i} />;
            const idx = seen++;
            return (
              <span
                key={i}
                style={{
                  color: idx < filled ? "var(--foreground)" : "var(--n-lighter)",
                  transition: "color 120ms linear",
                }}
              >
                {ch}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
