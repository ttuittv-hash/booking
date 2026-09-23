import type {
  BonusItem,
  QuoteScoreBreakdown,
  ScoreBand,
  ScoreConfidence,
  ScoreItem,
  VenueScoreResult,
} from "@/lib/scoring/types";
import { ERROR_NOTE, NONE, SECTION_TITLE, SUB_TITLE, HELP } from "@/components/admin/adminUi";

/* ============================================================================
   심사 채점 화면 재설계 (2026-09-23)

   기존 화면은 표 다섯 장에 숫자만 나와서, 운영자가 "몇 점인지 · 왜 그 점수인지"를
   rule 문장을 직접 읽어 항목마다 다시 계산해야 알 수 있었다. 실제 화면을 보고 나온
   요청("직관적이면서 잘보이고, 왜 그런 점수가 도출되었는지도 명확하게 인식되는")에
   맞춰 시안(대관 심사 스코어보드)을 먼저 만들어 승인받은 뒤 그 구조로 다시 짰다.

   핵심은 세 가지:
   1) 항목마다 "기준 사다리"(ScoreItem.bands)로 값 → 구간 → 점수를 직접 보여준다.
      rule 문장을 안 읽어도 어느 구간이 적중했는지 바로 보인다(하단 참고).
   2) 신뢰도(AUTO/PROVISIONAL/UNAVAILABLE/EXCLUDED)를 색·모양으로 구분한다.
   3) 카테고리 막대·전체 구성 막대가 실제 배점 구성과 항상 일치하게 한다 — 기존
      categoryStats()는 EXCLUDED 항목을 막대에서 통째로 빼버려서, computeVenueScore()가
      계산하는 unresolvedMax(EXCLUDED 포함)와 화면의 막대가 서로 다른 숫자를 말하고
      있었다(예: 마케팅 카테고리 20점 중 10점이 "정책상 제외"인데 막대에는 안 보였다).
      아래 categoryStats3()는 항목을 언제나 산정(earned) · 보류(unresolved, 위원 판단
      필요) · 제외(excluded, 정책상) 셋으로 나누고, 셋의 합이 항상 nominalMax와 같다.
   ========================================================================= */

const CONFIDENCE_LABEL: Record<ScoreConfidence, string> = {
  AUTO: "자동확정",
  PROVISIONAL: "확인 필요",
  EXCLUDED: "정책상 제외",
  UNAVAILABLE: "판단 보류",
};

function ConfidenceBadge({ c }: { c: ScoreConfidence }) {
  const cls: Record<ScoreConfidence, string> = {
    AUTO: "border-foreground bg-foreground text-panel",
    PROVISIONAL: "border-accent-hover bg-accent-soft text-muted-strong",
    UNAVAILABLE: "border-dashed border-border-soft text-muted",
    EXCLUDED: "border-border-soft text-muted line-through decoration-muted",
  };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-bold ${cls[c]}`}>
      {CONFIDENCE_LABEL[c]}
    </span>
  );
}

/** 값 → 구간 → 점수를 직접 보여주는 "기준 사다리". score 가 어느 구간과 같은 값이면 그 구간을 적중으로 강조한다. */
function BandLadder({ bands, score }: { bands: ScoreBand[]; score: number | null }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1">
      {bands.map((b) => {
        const hit = score !== null && b.score === score;
        return (
          <span
            key={b.label}
            className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs ${
              hit ? "border-foreground bg-foreground font-bold text-panel" : "border-border-soft text-muted"
            }`}
          >
            {b.label}
            <b className="tabular-nums">{b.score}</b>
          </span>
        );
      })}
    </div>
  );
}

interface Bucket {
  earned: number;
  unresolved: number; // 위원 판단 필요 (UNAVAILABLE 등, score===null 이지만 정책상 제외는 아님)
  excluded: number; // 정책상 제외 (EXCLUDED)
  max: number;
}

/** ScoreItem[] 을 산정·보류·제외 세 값으로 나눈다 — 셋의 합은 항상 항목 maxScore 합과 같다. */
function bucketize(items: { score: number | null; maxScore: number; confidence: ScoreConfidence }[]): Bucket {
  let earned = 0;
  let unresolved = 0;
  let excluded = 0;
  let max = 0;
  for (const item of items) {
    max += item.maxScore;
    if (item.score !== null) earned += item.score;
    else if (item.confidence === "EXCLUDED") excluded += item.maxScore;
    else unresolved += item.maxScore;
  }
  return { earned, unresolved, excluded, max };
}

/** earned/unresolved/excluded 세 구간을 쌓은 얇은 막대 — 카테고리 미니바 · 구성 막대 세그먼트가 공유한다. */
function StackedBar({ bucket, tone = "foreground" }: { bucket: Bucket; tone?: "foreground" | "accent" }) {
  const span = Math.max(bucket.max, 1);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / span) * 100))}%`;
  const fillClass = tone === "accent" ? "bg-accent-hover" : "bg-foreground";
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-panel-strong">
      <div className={`h-full ${fillClass}`} style={{ width: pct(bucket.earned) }} />
      {bucket.unresolved > 0 && (
        <div
          className="h-full"
          style={{
            width: pct(bucket.unresolved),
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--n-light) 0, var(--n-light) 1px, transparent 1px, transparent 6px)",
          }}
        />
      )}
      {bucket.excluded > 0 && (
        <div
          className="h-full"
          style={{
            width: pct(bucket.excluded),
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--border-soft) 0, var(--border-soft) 3px, var(--panel) 3px, var(--panel) 6px)",
          }}
        />
      )}
    </div>
  );
}

function ItemRow({ item }: { item: ScoreItem }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-t border-border-soft p-4">
      <div className="min-w-0">
        <div className="font-mono text-xs text-muted">{item.code}</div>
        <div className="mt-0.5 text-s font-bold">{item.label}</div>
        <div className="mt-1.5">
          <ConfidenceBadge c={item.confidence} />
        </div>
        {item.bands ? (
          <BandLadder bands={item.bands} score={item.score} />
        ) : (
          <p className="mt-2 text-xs text-muted">기준: {item.rule}</p>
        )}
        {item.evidence && (
          <p className="mt-2 text-xs text-muted-strong">
            근거: <b className="font-bold text-foreground">{item.evidence}</b>
          </p>
        )}
        {item.note && <p className="mt-1.5 border-l-2 border-border-soft pl-2.5 text-xs leading-relaxed text-muted">{item.note}</p>}
      </div>
      <div className="text-right">
        {item.score === null ? (
          <div className="text-s font-bold text-muted">{NONE}</div>
        ) : (
          <div className="text-h6-m font-bold tabular-nums">{item.score}</div>
        )}
        <div className="text-xs text-muted">/ {item.maxScore}</div>
      </div>
    </div>
  );
}

function BonusRow({ item }: { item: BonusItem }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border-soft py-2.5 first:border-t-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-xs text-muted">{item.code}</span>
          <span className="text-s font-bold">{item.label}</span>
        </div>
        {item.bands && <BandLadder bands={item.bands} score={item.score} />}
        {item.note && <p className="mt-1.5 border-l-2 border-border-soft pl-2.5 text-xs leading-relaxed text-muted">{item.note}</p>}
      </div>
      <div className={`shrink-0 text-s font-bold tabular-nums ${item.score ? "text-good" : "text-muted"}`}>
        {item.score === null ? NONE : `+${item.score}`}
        <span className="font-normal text-muted"> / {item.maxScore}</span>
      </div>
    </div>
  );
}

function VenueScoreBlock({ result }: { result: VenueScoreResult }) {
  const autoDq = result.disqualifiers.find((d) => d.auto && d.triggered);
  const catBuckets = result.categories.map((cat) => bucketize(cat.items));
  const bonusBucket = bucketize(result.bonuses);
  const nominalTotal = result.categories.reduce((sum, c) => sum + c.nominalMax, 0);
  const bonusMax = result.bonuses.reduce((sum, b) => sum + b.maxScore, 0);
  const axisMax = Math.max(nominalTotal + bonusMax, 1);
  const passLinePct = Math.min(100, (60 / axisMax) * 100);
  // 위원 판단으로 지금 당장 더 오를 수 있는 여지 — 정책상 제외(excluded)는 법무 확정
  // 전까지는 어차피 0으로 고정이라 "당장의 headroom" 에 넣지 않는다.
  const resolvable = catBuckets.reduce((sum, b) => sum + b.unresolved, 0) + bonusBucket.unresolved;
  const totalUnresolved = catBuckets.reduce((sum, b) => sum + b.unresolved, 0);
  const totalExcluded = catBuckets.reduce((sum, b) => sum + b.excluded, 0);

  return (
    <div className="border border-border-soft bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-3.5">
        <div>
          <div className="text-s font-bold">{result.venueLabel} 채점 초안</div>
        </div>
      </div>

      {/* ---- 히어로: 총점 + 구성 --------------------------------------- */}
      <div className="border-b border-border-soft p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="type-display text-h4-m tabular-nums sm:text-h4">
              {result.provisionalFinal}
              <span className="text-h6-m text-muted"> / {nominalTotal}점</span>
            </p>
          </div>
          <span
            className={`border px-3 py-1.5 text-xs font-bold ${
              result.provisionalEligible
                ? "border-good bg-good-soft text-good"
                : "border-danger bg-danger-soft text-danger"
            }`}
          >
            {result.provisionalEligible ? "잠정 적격" : "잠정 미달"} · 합격선(60점) 대비{" "}
            {result.provisionalFinal - 60 >= 0 ? "+" : ""}
            {result.provisionalFinal - 60}
          </span>
        </div>

        <p className={`mt-3 ${HELP}`}>
          산정 <b className="font-bold text-foreground">{result.computedSubtotal}</b> · 보류(위원 판단 필요){" "}
          <b className="font-bold text-foreground">{totalUnresolved}</b> · 제외(정책상){" "}
          <b className="font-bold text-foreground">{totalExcluded}</b> · 가점{" "}
          <b className="font-bold text-foreground">+{result.bonusTotal}</b> · 감점{" "}
          <b className="font-bold text-foreground">−{result.penaltyTotal}</b>
        </p>

        {resolvable > 0 && (
          <p className="mt-3 border border-dashed border-accent-hover bg-accent-soft px-3 py-2 text-xs text-muted-strong">
            보류된 <b className="font-bold text-foreground">{resolvable}점</b>이 위원 판단으로 최고 구간까지 확정되면
            최대 <b className="font-bold text-foreground">{result.provisionalFinal + resolvable}점</b>까지 오를 수
            있습니다.
          </p>
        )}

        {/* [수정 2026-09-23] "채점 그래프도 무슨 뜻인지 모르겠어" — 카테고리 5개를
            한 막대에 이어붙이고 빗금·해칭 4종을 범례로 풀어야 했던 이전 "점수 구성"
            막대를 지웠다. 카테고리별 내역은 바로 아래 각 카테고리 요약 줄·접으면
            나오는 미니바로 이미 보이므로, 맨 위는 "지금 몇 점이고 얼마나 더 갈 수
            있는지, 합격선은 어딘지" 딱 하나만 답하는 막대 하나로 단순화한다. */}
        <div className="mt-5">
          <div className="relative h-7 border border-border-soft bg-panel-strong">
            <div className="h-full bg-foreground" style={{ width: `${(result.provisionalFinal / axisMax) * 100}%` }} />
            {resolvable > 0 && (
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${(result.provisionalFinal / axisMax) * 100}%`,
                  width: `${(resolvable / axisMax) * 100}%`,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, var(--n-light) 0, var(--n-light) 1px, transparent 1px, transparent 6px)",
                }}
              />
            )}
            {/* 정규 배점(100점) 끝을 가는 눈금으로만 표시 — 그 너머는 가점 구간이다.
                텍스트 라벨을 넣으면 오른쪽 끝 라벨과 겹쳐 아래 범례로 뜻을 옮겼다. */}
            {bonusMax > 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 border-l border-border-soft"
                style={{ left: `${(nominalTotal / axisMax) * 100}%` }}
              />
            )}
            <div className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-danger" style={{ left: `${passLinePct}%` }} />
          </div>
          <div className="relative mt-1 h-4 text-xs text-muted">
            <span className="absolute left-0">0점</span>
            <span className="absolute font-bold text-danger" style={{ left: `${passLinePct}%` }}>
              합격선 60
            </span>
            <span className="absolute right-0">{axisMax}점</span>
          </div>
          {bonusMax > 0 && (
            <p className="mt-1 text-xs text-muted">
              가는 눈금 = 정규 배점({nominalTotal}점) 끝 — 그 오른쪽은 가점 구간(최대 +{bonusMax}점)입니다.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-strong">
            <span>
              <i className="mr-1.5 inline-block h-2.5 w-2.5 border border-foreground bg-foreground align-[-1px]" />
              지금 점수 (가점 포함 {result.provisionalFinal}점)
            </span>
            {resolvable > 0 && (
              <span>
                <i
                  className="mr-1.5 inline-block h-2.5 w-2.5 border border-border-soft align-[-1px]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(135deg, var(--n-light) 0, var(--n-light) 1px, transparent 1px, transparent 4px)",
                  }}
                />
                위원 판단으로 더 오를 수 있는 점수 (+{resolvable}점)
              </span>
            )}
          </div>
        </div>
      </div>

      {autoDq && (
        <div className={`${ERROR_NOTE} m-4`}>
          부적격 게이트 자동 발동 — {autoDq.label}. 점수와 무관하게 대관 불가입니다.
        </div>
      )}

      {/* [수정 2026-09-23] "심사 내역 각 슬롯별로 접기 펼치기 되어야지 .. 최종 점수
          슬롯은 열려있고 각 세부 심사 슬롯들은 점수만 노출 상세 내역은 접혀있어야지" —
          최종 점수(히어로)는 항상 보이고, 카테고리별 세부 항목은 기본 접힘 · 점수만
          요약으로 보이게 한다. 펼치면 항목별 기준 사다리·근거까지 볼 수 있다. */}
      {result.categories.map((cat, i) => (
        <details key={cat.key} className="group border-b border-border-soft last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center gap-x-2.5">
              <span className="text-muted transition-transform group-open:rotate-90">▸</span>
              <h4 className={SUB_TITLE}>{cat.label}</h4>
              <span className="text-xs text-muted">
                코드 {cat.items[0]?.code.split("-").slice(0, 2).join("-")} · 배점 {cat.nominalMax}점
              </span>
            </div>
            <span className="text-s font-bold tabular-nums">
              {catBuckets[i].earned}
              <span className="text-xs font-normal text-muted"> / {cat.nominalMax}</span>
            </span>
          </summary>
          <div className="h-1.5 border-t border-border-soft">
            <StackedBar bucket={catBuckets[i]} />
          </div>
          {cat.items.map((item) => (
            <ItemRow key={item.code} item={item} />
          ))}
        </details>
      ))}

      {/* ---- 조정 항목: 가점 · 감점 · 부적격 게이트 --------------------- */}
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
        <div className="border border-border-soft p-4">
          <h4 className={SUB_TITLE}>가점</h4>
          <p className={`mt-0.5 ${HELP}`}>배점 {nominalTotal}점과 별개로 최종 점수에 더해집니다.</p>
          <div className="mt-2">
            {result.bonuses.map((b) => (
              <BonusRow key={b.code} item={b} />
            ))}
          </div>
        </div>

        <div className="border border-border-soft p-4">
          <h4 className={SUB_TITLE}>감점 (배점표 3)</h4>
          <p className={`mt-0.5 ${HELP}`}>
            신청사 이력 조회 기능이 없어 자동 판정할 수 없습니다 — 전부 위원 판단입니다. 동일 사건이면 사유별 최대값
            1개만 적용합니다.
          </p>
          <ul className="mt-2">
            {result.penalties.map((p) => (
              <li key={p.code} className="flex items-center justify-between gap-2 border-t border-border-soft py-2 first:border-t-0 text-xs">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-muted">{p.code}</span>
                  <span className="truncate">{p.label}</span>
                </span>
                <span className="shrink-0 font-bold text-muted-strong">
                  위원 판단 · <span className="tabular-nums text-danger">{p.penalty}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-border-soft p-4 lg:col-span-2">
          <h4 className={SUB_TITLE}>부적격 게이트</h4>
          <p className={`mt-0.5 ${HELP}`}>발동되면 점수와 무관하게 대관이 불가합니다.</p>
          <ul className="mt-2">
            {result.disqualifiers.map((d) => (
              <li key={d.code} className="flex items-center justify-between gap-2 border-t border-border-soft py-2 first:border-t-0 text-xs">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-muted">{d.code}</span>
                  <span className="truncate">{d.label}</span>
                </span>
                <span className="shrink-0 font-bold">
                  {d.auto ? (
                    <span className={d.triggered ? "text-danger" : "text-good"}>
                      자동 판정 · {d.triggered ? "발동" : "정상"}
                    </span>
                  ) : (
                    <span className="text-muted-strong">위원 확인 필요</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
          「서울아레나 대관 심의 평가 세부 기준」 Ver. {breakdown.rubricVersion} 기준 자동 산정 초안입니다. 참고용이며
          저장되지 않습니다 — 최종 점수·판정은 아래 심사 폼에서 직접 입력해 주세요.
        </p>
      </div>

      {breakdown.results.map((result) => (
        <VenueScoreBlock key={result.venueId} result={result} />
      ))}

      <details className="border border-border-soft bg-panel">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-s font-bold [&::-webkit-details-marker]:hidden">
          유의사항 · 동점 시 판단 순서
        </summary>
        <div className="space-y-2.5 border-t border-border-soft px-5 py-4 text-xs leading-relaxed text-muted-strong">
          <p>
            경합 시 순위·동점 tie-break·이력 기반 감점·시뮬레이션은 아직 자동 반영되지 않았습니다. 협조 동의
            항목(공동 프로모션·실적 데이터 제공, 10점)은 대관계약 동의서와의 충돌 소지로 법무 확정 전까지
            제외했습니다.
          </p>
          <p>
            동일 일정에 2건 이상이면 <b className="text-foreground">적격 판정을 받은 건 중 최종 점수 최고 득점자</b>
            를 우선 선정하고, 점수가 같으면 ① 대관 수익성(20점) → ② 예상 관객 규모(20점) → ③ 마케팅 협조(공동
            프로모션 + 공연 실적 데이터 협조) 합산 → ④ 마케팅 파급력(출연 IP 공식 채널 구독자·팔로워 합산, 활용
            가능한 외부 채널 수) 순으로 판단합니다.
          </p>
        </div>
      </details>
    </div>
  );
}
