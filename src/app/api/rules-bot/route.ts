import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { answerRulesQuestion, isRulesBotConfigured, type RulesBotTurn } from "@/lib/rulesBot";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 대관 규약 문답 봇 (2026-08-29).
//
// /rules 는 로그인하면 볼 수 있는 화면이라(기획서 A15) 봇도 같은 선을 지킨다 —
// 승인 완료까지 요구하지 않는다. 다만 호출마다 모델 비용이 들어가므로 사람 단위로
// 횟수를 제한한다. 카운터는 rate_limits 테이블에 있다(pod 가 여러 개라 프로세스
// 메모리에 두면 안 된다).
const LIMIT_PER_USER = 30;
const WINDOW_MS = 60 * 60 * 1000;

/** 직전 대화 몇 턴만 이어 붙인다 — 통째로 보내면 토큰이 계속 불어난다. */
const MAX_HISTORY_TURNS = 6;
const MAX_QUESTION_CHARS = 1000;

function parseHistory(raw: unknown): RulesBotTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (turn): turn is RulesBotTurn =>
        !!turn &&
        typeof turn === "object" &&
        (turn as RulesBotTurn).role !== undefined &&
        ((turn as RulesBotTurn).role === "user" || (turn as RulesBotTurn).role === "assistant") &&
        typeof (turn as RulesBotTurn).content === "string" &&
        (turn as RulesBotTurn).content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_QUESTION_CHARS) }));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!isRulesBotConfigured()) {
    return NextResponse.json({ error: "규약 문답이 설정되지 않았습니다." }, { status: 503 });
  }

  // 아이디 기준이 실질 방어다. IP 는 프록시 뒤에서 위조될 수 있어 보조로만 쓴다.
  if (!(await rateLimit(`rules-bot:${user.id}`, LIMIT_PER_USER, WINDOW_MS))) {
    return NextResponse.json(
      { error: "질문 횟수를 모두 사용했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }
  if (!(await rateLimit(`rules-bot-ip:${clientIpFrom(request)}`, LIMIT_PER_USER * 3, WINDOW_MS))) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.slice(0, MAX_QUESTION_CHARS) : "";
  if (!question.trim()) {
    return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  }

  const result = await answerRulesQuestion(question, parseHistory(body?.history));
  if (result.status === "OK") return NextResponse.json({ answer: result.answer });
  if (result.status === "UNCONFIGURED") {
    return NextResponse.json({ error: "규약 문답이 설정되지 않았습니다." }, { status: 503 });
  }
  return NextResponse.json({ error: result.message }, { status: 502 });
}
