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
