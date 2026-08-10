import type { ReactNode } from "react";

/**
 * 위저드 각 단계의 제목 블록 — Figma Multi Form / 5 › Section Title.
 *   Heading 32(h4) · Text 16(r) · **가운데 정렬**, 폭 640 안쪽.
 * 모든 단계가 이 컴포넌트를 쓰므로 단계마다 제목 크기·정렬이 달라지지 않는다.
 */
export function StepHeading({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[40rem] text-center">
      <h2 className="type-kr-heading text-h4-m sm:text-h4">{title}</h2>
      {lead && <p className="mt-4 break-keep text-r text-muted">{lead}</p>}
    </div>
  );
}

/** 폼 입력이 들어가는 좁은 컬럼 — Multi Form / 5 의 640px 폼 폭 */
export function StepForm({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-10 max-w-[40rem]">{children}</div>;
}
