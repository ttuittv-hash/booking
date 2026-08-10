"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * 스크롤 리빌 — 뷰포트에 들어오는 순간 악센트(옐로) 면이 콘텐츠를 덮고 있다가
 * 위로 걷히면서 사진이 드러난다. studio-kiln 류의 와이프 인.
 *
 * **반복 재생한다.** 화면 밖으로 완전히 나가면 커튼을 다시 덮어두고, 다시 들어올 때
 * 또 걷는다. 한 번만 실행하면 위로 올렸다 내렸을 때 아무 일도 일어나지 않아
 * "처음 한 번만 되는" 것처럼 보인다.
 *
 * 되돌릴 때는 트랜지션을 끄고 즉시 원위치시킨다 — 화면 밖에서 커튼이 스르륵
 * 내려오는 역재생이 보이면 안 되기 때문이다.
 *
 * 규칙
 *   · 사진·카드에만 쓴다. 텍스트 블록에는 쓰지 않는다 (읽는 흐름을 끊는다)
 *   · `prefers-reduced-motion` 이면 처음부터 걷힌 상태로 두고 관찰하지 않는다
 *
 * 커튼은 `pointer-events-none` 이라 위에 있어도 클릭을 막지 않는다.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** 그리드에서 항목마다 조금씩 늦추고 싶을 때 (ms) */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<"armed" | "revealed" | "reset">("armed");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setState("revealed"), 0);
      return () => window.clearTimeout(t);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            // 들어옴 — 지연 후 커튼을 걷는다.
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setState("revealed"), delay);
          } else {
            // 완전히 나감 — 트랜지션 없이 즉시 덮어 다음 진입을 준비한다.
            window.clearTimeout(timer.current);
            setState("reset");
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer.current);
    };
  }, [delay]);

  // reset 프레임에서 다시 armed 로 돌려 트랜지션을 되살린다.
  useEffect(() => {
    if (state !== "reset") return;
    const id = window.requestAnimationFrame(() => setState("armed"));
    return () => window.cancelAnimationFrame(id);
  }, [state]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {children}
      <span
        aria-hidden
        data-state={state}
        className={[
          "pointer-events-none absolute inset-0 bg-accent",
          "transition-transform duration-[620ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
          "data-[state=revealed]:-translate-y-full",
          // 되돌리는 프레임에서만 트랜지션을 끈다 (역재생 방지)
          "data-[state=reset]:transition-none",
        ].join(" ")}
      />
    </div>
  );
}
