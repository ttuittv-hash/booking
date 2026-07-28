import type { Quote } from "./pricing/types";

const STORAGE_KEY = "seoularena.applications.v1";

function generateId(): string {
  return `SA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * 1차 구현: 신청서 스냅샷을 브라우저 localStorage에 저장한다.
 * 추후 백엔드(DB) 연동 시 이 함수 내부만 API 호출로 교체하면 된다.
 */
export function saveQuoteSnapshot(quote: Omit<Quote, "id" | "createdAt">): Quote {
  const saved: Quote = {
    ...quote,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const existing = listQuoteSnapshots();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, saved]));
  }

  return saved;
}

export function listQuoteSnapshots(): Quote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Quote[]) : [];
  } catch {
    return [];
  }
}
