import type { ReactNode } from "react";

/**
 * 위저드 각 단계의 제목 블록.
 *
 * **좌측 정렬 · 콘텐츠 트랙 전폭**이다. 단계마다 제목이 가운데였다 좌측이었다,
 * 본문 폭이 640 이었다 전폭이었다 하면 01→05 를 넘길 때 화면이 계속 흔들린다.
 * 모든 단계가 이 컴포넌트(제목)와 `StepForm`(본문)만 쓰도록 맞춘다.
 *
 *   제목 H5 (24 / 모바일 20) · 리드 Body/S 14 muted, 읽기 폭(measure) 안쪽
 */
export function StepHeading({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <div>
      <h2 className="type-kr-heading text-h5-m sm:text-h5">{title}</h2>
      {lead && <p className="measure mt-3 break-keep text-s text-muted">{lead}</p>}
    </div>
  );
}

/**
 * 단계 본문. 제목과 같은 왼쪽 선에서 시작하고 트랙 전폭을 쓴다 —
 * 폼 입력은 각 필드가 `max-w-xs` 등으로 스스로 폭을 잡는다.
 */
export function StepForm({ children }: { children: ReactNode }) {
  return <div className="mt-8">{children}</div>;
}
