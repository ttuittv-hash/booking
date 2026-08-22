"use client";

// 탭 상태를 URL 쿼리에 싣는다 — 공개 화면(QueryTabs)과 같은 규칙.
//
// 로컬 useState 탭은 새로고침하면 첫 탭으로 돌아가고, 특정 탭을 링크로 공유할 수도
// 없다. 클릭 뒤에는 항상 파라미터를 명시해 주소 모양이 들쭉날쭉하지 않게 한다
// (파라미터 없이 들어온 첫 진입만 기본 탭).
//
// 공간 탭의 URL 값은 공개 화면과 같은 이름을 쓴다 — ?venue=arena | live-hall.
// 내부 venueId("medium-hall")와 다를 수 있으므로 호출부에서 매핑한다.

import { useRouter, useSearchParams } from "next/navigation";

export function useQueryTab<T extends string>(
  param: string,
  values: readonly T[],
  fallback: T,
): [T, (v: T) => void] {
  const router = useRouter();
  const search = useSearchParams();
  const raw = search.get(param);
  const active = (values as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;

  function select(v: T) {
    const next = new URLSearchParams(search.toString());
    next.set(param, v);
    router.replace(`?${next.toString()}`, { scroll: false });
  }
  return [active, select];
}
