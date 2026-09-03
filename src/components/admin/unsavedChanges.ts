"use client";

/**
 * 저장하지 않은 편집을 지키는 문지기 (2026-09-03).
 *
 * 콘텐츠 관리는 탭마다 폼이 따로 뜨고, 탭을 바꾸면 그 폼이 통째로 사라진다(언마운트).
 * 편집 내용은 저장 버튼을 눌러야 DB 로 가므로, 탭을 옮기는 순간 조용히 없어졌다.
 *
 * 특히 파일 업로드에서 사고가 났다 — 파일을 고르면 **곧바로 서버에 올라가고** 화면에도
 * 새 파일 이름이 뜬다. 그래서 다 됐다고 믿고 탭을 옮기거나 화면을 닫으면, 주소는
 * 저장되지 않은 채 사라지고 공개 화면은 계속 옛 파일을 내려준다("파일을 바꿨는데
 * 프론트는 예전 파일이 받아진다"는 신고가 이것이었다).
 *
 * 폼이 스스로 "지금 저장 안 한 변경이 있다"를 여기에 등록하고, 탭 전환·새로고침처럼
 * 편집을 날리는 동작 앞에서 물어본다. 상태는 브라우저 안에서만 산다.
 */

const dirty = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

/** 폼 하나의 «저장 안 됨» 표시를 켜고 끈다. */
export function setUnsaved(id: string, value: boolean) {
  const had = dirty.has(id);
  if (value === had) return;
  if (value) dirty.add(id);
  else dirty.delete(id);
  emit();
}

export function hasUnsaved(): boolean {
  return dirty.size > 0;
}

export function subscribeUnsaved(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * 편집을 버리게 되는 이동 앞에서 확인한다. 저장할 것이 없으면 묻지 않고 그냥 지나간다.
 * 확인 창을 띄우는 것이 과해 보일 수 있지만, 잃는 쪽의 대가가 훨씬 크다 —
 * 운영자는 무엇이 사라졌는지조차 모른 채 공개 화면이 옛 내용으로 남는다.
 */
export function confirmDiscardUnsaved(): boolean {
  if (!hasUnsaved()) return true;
  return window.confirm(
    "저장하지 않은 변경이 있습니다. 지금 이동하면 그 내용은 사라집니다.\n그래도 이동할까요?",
  );
}
