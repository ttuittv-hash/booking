import type { BonusItem, QuoteScoreBreakdown, ScoreConfidence, ScoreItem, VenueScoreResult } from "@/lib/scoring/types";
import {
  ERROR_NOTE,
  NONE,
  SECTION_TITLE,
  SUB_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  HELP,
  TABLE_SCROLL,
  TD,
  TD_ID,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
  WARN_NOTE,
} from "@/components/admin/adminUi";

const CONFIDENCE_LABEL: Record<ScoreConfidence, string> = {
  AUTO: "자동 확정",
  PROVISIONAL: "잠정치",
  EXCLUDED: "정책상 제외",
  UNAVAILABLE: "산정 불가",
};

const CONFIDENCE_CLASS: Record<ScoreConfidence, string> = {
  AUTO: "text-foreground",
  PROVISIONAL: "text-muted-strong",
  EXCLUDED: "text-muted line-through decoration-muted",
  UNAVAILABLE: "text-muted",
};

function confidenceBadge(c: ScoreConfidence) {
  return <span className={`text-2xs font-bold uppercase tracking-wide ${CONFIDENCE_CLASS[c]}`}>{CONFIDENCE_LABEL[c]}</span>;
}

function ItemRow({ item }: { item: ScoreItem }) {
  return (
    <tr className={TR}>
      <td className={`${TD_ID} font-mono text-xs`}>{item.code}</td>
      <td className={TD}>
        <div className="font-bold">{item.label}</div>
        <div className="mt-0.5 text-xs text-muted">{item.rule}</div>
        {item.evidence && <div className="mt-0.5 text-xs text-muted">근거: {item.evidence}</div>}
        {item.note && <div className="mt-1 text-xs text-muted-strong">⚠ {item.note}</div>}
      </td>
      <td className={TD}>{confidenceBadge(item.confidence)}</td>
      <td className={TD_NUM}>
        {item.score === null ? NONE : <span className="font-bold tabular-nums">{item.score}</span>}
        <span className="text-muted"> / {item.maxScore}</span>
      </td>
    </tr>
  );
}

function BonusRow({ item }: { item: BonusItem }) {
  return (
    <tr className={TR}>
      <td className={`${TD_ID} font-mono text-xs`}>{item.code}</td>
      <td className={TD}>
        <div className="font-bold">{item.label}</div>
        {item.note && <div className="mt-1 text-xs text-muted-strong">⚠ {item.note}</div>}
      </td>
      <td className={TD}>{confidenceBadge(item.confidence)}</td>
      <td className={TD_NUM}>
        {item.score === null ? NONE : <span className="font-bold tabular-nums">+{item.score}</span>}
        <span className="text-muted"> / {item.maxScore}</span>
      </td>
    </tr>
  );
}


/* ============================================================================
   채점 요약 도식 (2026-09-02)

   자동 산정 결과가 표 다섯 장으로만 나와서, 운영자가 "몇 점인지 · 어디서 깎였는지"를
   숫자를 훑어 더해야 알 수 있었다. 맨 위에 총점 하나와 항목별 막대를 둔다.

   형태: 크기(magnitude) 비교 한 종류뿐이라 색으로 계열을 나누지 않는다 — 지면과 같은
   단색에 농도만 셋으로 쓴다(산정 / 보류 / 남은 배점). 값은 모두 막대 옆에 직접 적으므로
   범례 대신 이 세 마디를 위쪽 한 줄에 적어 둔다.
   ========================================================================= */

interface CategoryStat {
  key: string;
  label: string;
  earned: number;
  pending: number;
  max: number;
}

/** 카테고리별 [산정 점수 / 보류 배점 / 만점]. 표에 이미 있는 값을 그대로 더한다. */
function categoryStats(result: VenueScoreResult): CategoryStat[] {
  return result.categories.map((cat) => {
    let earned = 0;
    let pending = 0;
    for (const item of cat.items) {
      if (item.score !== null) earned += item.score;
      else if (item.confidence !== "EXCLUDED") pending += item.maxScore;
    }
    return { key: cat.key, label: cat.label, earned, pending, max: cat.nominalMax };
  });
}

/** 한 줄짜리 막대 — 산정분·보류분·남은 배점. 사이는 2px 씩 띄워 경계를 만든다. */
function ScoreBar({ earned, pending, max }: { earned: number; pending: number; max: number }) {
  const span = Math.max(max, earned + pending, 1);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / span) * 100))}%`;
  return (
    <div className="flex h-2.5 w-full gap-0.5 bg-border-soft" aria-hidden>
      <div className="bg-foreground" style={{ width: pct(earned) }} />
      {pending > 0 && <div className="bg-muted/45" style={{ width: pct(pending) }} />}
    </div>
  );
}

function ScoreSummary({ result }: { result: VenueScoreResult }) {
  const stats = categoryStats(result);
  const nominalTotal = stats.reduce((sum, c) => sum + c.max, 0);

  return (
    <div className="border-b border-border-soft p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={HELP}>잠정 총점</p>
          <p className="type-display mt-1 text-h4-m tabular-nums sm:text-h4">
            {result.provisionalFinal}
            <span className="text-h6-m text-muted"> / {nominalTotal}점</span>
          </p>
        </div>
        <p className={HELP}>
          산정 {result.computedSubtotal} · 보류 {result.unresolvedMax} · 가점 +{result.bonusTotal} ·
          감점 −{result.penaltyTotal}
        </p>
      </div>

      <div className="mt-3">
        <ScoreBar
          earned={result.computedSubtotal}
          pending={result.unresolvedMax}
          max={nominalTotal}
        />
      </div>

      {/* 항목별 — 어디서 깎였는지는 결국 이 줄들에서 읽힌다 */}
      <dl className="mt-5 space-y-2.5">
        {stats.map((c) => (
          <div key={c.key} className="grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-3">
            <dt className="truncate text-xs text-muted-strong">{c.label}</dt>
            <dd>
              <ScoreBar earned={c.earned} pending={c.pending} max={c.max} />
            </dd>
            <dd className="text-right text-xs tabular-nums">
              <span className="font-bold">{c.earned}</span>
              <span className="text-muted"> / {c.max}점</span>
              {c.pending > 0 && <span className="block text-2xs text-muted">보류 {c.pending}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function VenueScoreBlock({ result }: { result: VenueScoreResult }) {
  const autoDq = result.disqualifiers.find((d) => d.auto && d.triggered);
  return (
    <div className={TABLE_CARD}>
      <div className={TABLE_HEAD}>
        <div>
          <div className={TABLE_HEAD_TITLE}>{result.venueLabel} 채점 초안</div>
          <div className={TABLE_HEAD_DESC}>
            산정: {result.computedSubtotal}점 · 보류(미반영/산정불가): {result.unresolvedMax}점 · 가점 +{result.bonusTotal} · 감점 −{result.penaltyTotal}
          </div>
        </div>
        <div className="text-right">
          <div className="text-h6-m font-bold tabular-nums">{result.provisionalFinal}점</div>
          <div className={`text-xs font-bold ${result.provisionalEligible ? "text-good" : "text-danger"}`}>
            {result.provisionalEligible ? "잠정 적격(60점↑)" : "잠정 미달"}
          </div>
        </div>
      </div>

      <ScoreSummary result={result} />

      {autoDq && <div className={`${ERROR_NOTE} m-4`}>부적격 게이트 자동 발동 — {autoDq.label}. 점수와 무관하게 대관 불가입니다.</div>}

      {result.categories.map((cat) => (
        <div key={cat.key} className="border-b border-border-soft p-4 last:border-b-0">
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className={SUB_TITLE}>{cat.label}</h4>
            <span className="text-xs text-muted">배점 {cat.nominalMax}점</span>
          </div>
          <div className={TABLE_SCROLL}>
            <table className={TABLE}>
              <thead className={THEAD_ROW}>
                <tr>
                  <th className={TH} style={{ width: "10%" }}>
                    코드
                  </th>
                  <th className={TH}>항목 · 산정 근거</th>
                  <th className={TH} style={{ width: "12%" }}>
                    신뢰도
                  </th>
                  <th className={TH_NUM} style={{ width: "12%" }}>
                    점수
                  </th>
                </tr>
              </thead>
              <tbody>
                {cat.items.map((item) => (
                  <ItemRow key={item.code} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className={SUB_TITLE}>가점</h4>
        </div>
        <div className={TABLE_SCROLL}>
          <table className={TABLE}>
            <thead className={THEAD_ROW}>
              <tr>
                <th className={TH} style={{ width: "10%" }}>
                  코드
                </th>
                <th className={TH}>항목</th>
                <th className={TH} style={{ width: "12%" }}>
                  신뢰도
                </th>
                <th className={TH_NUM} style={{ width: "12%" }}>
                  점수
                </th>
              </tr>
            </thead>
            <tbody>
              {result.bonuses.map((b) => (
                <BonusRow key={b.code} item={b} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          감점(A-PEN-01~05)은 대관 취소·정산 분쟁·정책 위반 등 신청사 이력 조회 기능이 아직 없어 항상 0으로 취급합니다 — &ldquo;이력 없음&rdquo;이 아니라
          &ldquo;조회 불가&rdquo;로 이해해 주세요.
        </p>
      </div>

      <div className="p-4 pt-0">
        <h4 className={`${SUB_TITLE} mb-2`}>부적격 게이트</h4>
        <ul className="space-y-1 text-xs">
          {result.disqualifiers.map((d) => (
            <li key={d.code} className="flex items-center gap-2">
              <span className="font-mono text-muted">{d.code}</span>
              <span>{d.label}</span>
              {d.auto ? (
                <span className={`font-bold ${d.triggered ? "text-danger" : "text-good"}`}>
                  {d.triggered ? "발동" : "정상"}
                </span>
              ) : (
                <span className="text-muted">위원 확인 필요</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ScoringPanel({ breakdown }: { breakdown: QuoteScoreBreakdown }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className={SECTION_TITLE}>심사 채점 초안 (자동 산정)</h3>
        <p className="mt-1 text-xs text-muted">
          「서울아레나 대관 심의 평가 세부 기준」 Ver. {breakdown.rubricVersion} 기준 자동 산정 초안입니다. 참고용이며 저장되지 않습니다 — 최종
          점수·판정은 아래 심사 폼에서 직접 입력해 주세요.
        </p>
      </div>
      <div className={`${WARN_NOTE}`}>
        경합 시 순위·동점 tie-break·이력 기반 감점·시뮬레이션은 아직 반영되지 않았습니다. 협조 동의 항목(공동 프로모션·실적 데이터 제공, 10점)은
        대관계약 동의서와의 충돌 소지로 법무 확정 전까지 제외했습니다.
      </div>
      {breakdown.results.map((result) => (
        <VenueScoreBlock key={result.venueId} result={result} />
      ))}
    </div>
  );
}
