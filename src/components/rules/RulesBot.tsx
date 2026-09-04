"use client";

// 대관 규약 문답 (2026-08-29).
//
// 규약은 40개 조가 넘고 위약금·해지·안전·정산이 서로 다른 장에 흩어져 있다. 전문을
// 처음부터 읽게 하는 대신 물어보게 한다. 답에는 근거 조문이 함께 나오므로 원문에서
// 다시 확인할 수 있다.

import { useEffect, useRef, useState } from "react";
import { btnClass } from "@/components/ui/kit";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** 처음 열었을 때 무엇을 물어도 되는지 보여 준다 — 빈 입력창만 두면 아무도 안 쓴다. */
const SAMPLES = [
  "공연을 취소하면 위약금이 얼마인가요?",
  "대관료는 언제까지 나눠 내야 하나요?",
  "안전관리자는 언제까지 명단을 제출하나요?",
  "티켓 오픈 전에 제출할 자료가 뭔가요?",
];

export function RulesBot() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // 답이 길면 아래가 잘려 보인다 — 새 턴이 붙을 때마다 끝으로 내린다.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (busy) return;
    // 비어 있어도 버튼은 잠그지 않는다(잠긴 버튼 패턴 금지) — 눌렀을 때 이유를 알려 준다.
    if (!trimmed) {
      setError("질문을 입력해 주세요.");
      return;
    }
    setError(null);
    setQuestion("");
    // 보낸 질문을 먼저 붙여 둔다 — 답을 기다리는 동안 화면이 비면 눌렸는지 알 수 없다.
    const next: Turn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(next);
    setBusy(true);
    try {
      const res = await fetch("/api/rules-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 직전 대화를 함께 보내 "그럼 그건 언제까지예요?" 같은 이어지는 질문이 통하게 한다.
        body: JSON.stringify({ question: trimmed, history: turns }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "답변을 가져오지 못했습니다.");
        return;
      }
      setTurns([...next, { role: "assistant", content: data.answer }]);
    } catch {
      setError("답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-border-soft" data-testid="rules-bot">
      <div className="border-b border-border-soft px-5 py-4">
        <h2 className="type-kr-heading text-h6-m sm:text-h6">규약 문답</h2>
        <p className="mt-1.5 break-keep text-xs leading-6 text-muted">
          규약 내용을 물어보시면 <b>근거 조문과 함께</b> 답해 드립니다. 규약에 없는 내용은
          지어내지 않고 &ldquo;없다&rdquo;고 알려 드립니다. 안내이며 법률 자문이나 계약 확답은
          아닙니다 — 해석이 갈리는 대목은 운영사에 확인해 주세요.
        </p>
      </div>

      {turns.length > 0 && (
        <div ref={logRef} className="max-h-[28rem] overflow-y-auto px-5 py-4">
          <ul className="space-y-4">
            {turns.map((turn, i) => (
              <li key={i}>
                <p className="text-xs font-bold text-muted">
                  {turn.role === "user" ? "질문" : "답변"}
                </p>
                <p
                  className={`mt-1 break-keep text-s leading-7 ${
                    turn.role === "user" ? "font-bold" : "whitespace-pre-wrap"
                  }`}
                >
                  {turn.content}
                </p>
              </li>
            ))}
            {busy && (
              <li>
                <p className="text-xs font-bold text-muted">답변</p>
                <p className="mt-1 text-s leading-7 text-muted">규약을 찾아보는 중…</p>
              </li>
            )}
          </ul>
        </div>
      )}

      {turns.length === 0 && (
        <div className="px-5 pt-4">
          <p className="text-xs text-muted">이런 것을 물어볼 수 있습니다</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <li key={sample}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(sample)}
                  className="border border-border-soft px-3 py-1.5 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
                >
                  {sample}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="flex flex-wrap items-end gap-2 px-5 py-4"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">규약에 대해 질문하기</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
            maxLength={1000}
            placeholder="예: 준비 대관 기간에도 대관료가 붙나요?"
            className="w-full border border-border-soft bg-background px-3 py-2 text-s"
          />
        </label>
        <button type="submit" disabled={busy} className={btnClass("primary", "md")}>
          {busy ? "찾는 중…" : "질문"}
        </button>
      </form>

      {error && (
        <p className="border-t border-border-soft px-5 py-3 text-xs leading-6 text-danger">{error}</p>
      )}
    </section>
  );
}
