"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * 스크롤 리빌 — 뷰포트에 들어오는 순간 악센트(옐로) 면이 콘텐츠를 덮고 있다가
 * 위로 걷히면서 사진이 드러난다. studio-kiln 류의 와이프 인.
 *
 * 규칙
 *   · 사진·카드에만 쓴다. 텍스트 블록에는 쓰지 않는다 (읽는 흐름을 끊는다)
 *   · 한 번만 실행한다. 다시 스크롤해도 반복하지 않는다
 *   · `prefers-reduced-motion` 이면 처음부터 걷힌 상태로 둔다
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 모션을 줄이기로 한 사용자에게는 커튼을 즉시(다음 틱에) 걷어버린다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => setRevealed(true), 0);
      return () => window.clearTimeout(t);
    }

    // 이미 화면 안에 있는 요소(첫 화면)도 관찰 즉시 콜백이 돌아 리빌된다.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          window.setTimeout(() => setRevealed(true), delay);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {children}
      <span
        aria-hidden
        data-revealed={revealed ? "true" : "false"}
        className="pointer-events-none absolute inset-0 bg-accent transition-transform duration-[620ms] ease-[cubic-bezier(0.65,0,0.35,1)] data-[revealed=true]:-translate-y-full"
      />
    </div>
  );
}
