import type {
  BonusItem,
  PenaltyItem,
  QuoteScoreBreakdown,
  ScoreBand,
  ScoreCategory,
  ScoreConfidence,
  ScoreItem,
  VenueScoreResult,
} from "@/lib/scoring/types";
/* ============================================================================
   심사 채점 화면 — 애플 스타일 재설계 (2026-09-25)

   기존 화면은 표 다섯 장에 숫자만 나와서 "몇 점인지 · 왜 그 점수인지"를 rule
   문장을 읽어 항목마다 다시 계산해야 알 수 있었다. 실제 화면을 보고 나온 요청
   ("직관적이면서 잘보이고, 왜 그런 점수가 도출되었는지도 명확하게 인식되는")부터
   시작해, 시안(대관 심사 스코어보드 → 심사 채점, 한눈에)을 먼저 만들어 라운드를
   거듭하며 승인받은 뒤 그 구조로 다시 짰다. 라운드별로 반영한 요청:
   1) 항목마다 "기준 사다리"(bands)로 값→구간→점수를 직접 보여준다.
   2) 신뢰도(자동확정/확인필요/판단보류/정책제외)를 색·모양으로 구분한다.
   3) 카테고리는 기본 접힘(점수만) · 펼치면 근거.
   4) 총점 그래프는 "지금 몇 점 · 합격선이 어딘지"만 답하게 단순화.
   5) "원형그래프에서 점수별로 표기" → 카테고리별 색을 나눈 도넛으로.
   6) "위아래를 다 봐야 아는거 말고 그래프 상에도 보이는게 좋지" → 각 조각에서
      선이 뻗어나와 이름표를 바로 붙이는 콜아웃 리더 라인으로.
   7) "총점 언급 + 어느 영역이 뛰어나고 뭐가 부족한지 설명" → 카테고리
      earned/nominalMax 비율을 문장으로 풀어낸 총평(buildSummarySentence).
   8) "왼쪽 그래프 · 오른쪽 해석"이 한눈에 들어오게 좌우 배치.
   9) "애플처럼 예쁘게" → 이 컴포넌트에서만 Inter 서체 + 둥근 카드·그림자 +
      카테고리별 고정 악센트 색을 쓴다. adminUi.ts 의 "각진 톤·하드코딩 색 없음"
      규칙은 백오피스 나머지 화면 전부에 적용되는 것이고, 이 화면만 의도적으로
      깬 예외다(다른 컴포넌트에 이 톤을 복붙하지 말 것).

   가점·감점을 표가 아니라 체크리스트 카드로 바꾼 것, 지금 실제로 적용된 감점은
   0이라는 걸 색으로도 드러낸 것(감점 카드는 채워진 빨강이 아니라 "확인 필요"
   중립 배지)도 시안에서 나온 요청이다.

   카테고리·전체 링이 실제 배점 구성과 항상 일치하도록 bucketize()는 항목을
   산정(earned)·보류(unresolved, 위원 판단 필요)·제외(excluded, 정책상) 셋으로
   나눈다 — 기존처럼 EXCLUDED 항목을 그냥 빼버리면 computeVenueScore() 가 계산하는
   unresolvedMax(EXCLUDED 포함)와 화면이 다른 숫자를 말하게 된다.
   ========================================================================= */

const CONFIDENCE_LABEL: Record<ScoreConfidence, string> = {
  AUTO: "자동확정",
  PROVISIONAL: "확인 필요",
  EXCLUDED: "정책상 제외",
  UNAVAILABLE: "판단 보류",
};

// 이 화면 전용 악센트 — Apple 시스템 색(다크모드 변형)을 그대로 쓴다. 밝은/어두운
// 배경 둘 다에서 채도가 충분해 라이트·다크 모드를 따로 안 만들어도 읽힌다.
const CATEGORY_ACCENT: Record<ScoreCategory["key"], string> = {
  REVENUE: "#0a84ff",
  PUBLIC: "#30d158",
  MARKETING: "#ff9f0a",
  SAFETY: "#bf5af2",
};
const BONUS_ACCENT = "var(--accent-hover)"; // 브랜드 옐로 토큰 재사용 — 다크모드 자동 대응
const PENDING_ACCENT = "#ff9f0a";

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function CategoryIcon({ categoryKey }: { categoryKey: ScoreCategory["key"] }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const };
  switch (categoryKey) {
    case "REVENUE":
      return (
        <svg {...common}>
          <path d="M4 20V10M12 20V4M20 20v-7" />
        </svg>
      );
    case "PUBLIC":
      return (
        <svg {...common} strokeLinejoin="round">
          <path d="M12 21s-7-4.6-9.5-9C.6 8.4 2 5 5.5 5c2 0 3.4 1.2 4.5 2.6C11.1 6.2 12.5 5 14.5 5 18 5 19.4 8.4 17.5 12 15 16.4 12 21 12 21z" />
        </svg>
      );
    case "MARKETING":
      return (
        <svg {...common} strokeLinejoin="round">
          <path d="M3 11l18-7-7 18-2-8-8-3z" />
        </svg>
      );
    case "SAFETY":
      return (
        <svg {...common} strokeLinejoin="round">
          <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z" />
        </svg>
      );
  }
}

function ConfidencePill({ c }: { c: ScoreConfidence }) {
  const style: Record<ScoreConfidence, { className: string; bg?: string; color?: string }> = {
    AUTO: { className: "bg-foreground text-panel" },
    PROVISIONAL: { className: "font-bold", bg: hexToRgba(PENDING_ACCENT, 0.16), color: PENDING_ACCENT },
    UNAVAILABLE: { className: "text-muted" },
    EXCLUDED: { className: "text-muted line-through decoration-muted" },
  };
  const s = style[c];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${s.className}`}
      style={s.bg ? { background: s.bg, color: s.color } : undefined}
    >
      {CONFIDENCE_LABEL[c]}
    </span>
  );
}

/** 값 → 구간 → 점수를 보여주는 기준 사다리(알약 모양). score 와 같은 값의 구간을 적중으로 강조한다. */
function BandPills({ bands, score }: { bands: ScoreBand[]; score: number | null }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {bands.map((b) => {
        const hit = score !== null && b.score === score;
        return (
          <span
            key={b.label}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={hit ? { background: "var(--foreground)", color: "var(--panel)" } : { background: "var(--panel-strong)", color: "var(--muted)" }}
          >
            {b.label} <b className="tabular-nums">{b.score}</b>
          </span>
        );
      })}
    </div>
  );
}

interface Bucket {
  earned: number;
  unresolved: number; // 위원 판단 필요 (score===null, 정책상 제외는 아님)
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

/**
 * [신규 2026-09-25] "총점에 대한 언급도 있고 .. 무슨 영역이 뛰어나고 뭐가
 * 부족하고 특징에 대한 설명도 있어야지" — 카테고리 4개는 언제나 같은 고정
 * 라벨(수익성·흥행성 / 공공성·공익성 / 마케팅 계획·협업 / 안전관리·수행역량)이라
 * 조사(은/는, 이/가)를 하드코딩해도 안전하다. 넷 다 받침 있는 글자로 끝나서
 * "은"·"이" 만 쓰면 어떤 조합이 와도 문법이 깨지지 않는다 — 임의 텍스트를 받는
 * 범용 NLG가 아니라는 전제를 명시해 둔다. AI 판단이 아니라 이미 계산된
 * earned/nominalMax 비율을 규칙적으로 문장화한 것 — 신청 상세의 "AI 분석"과 별개다.
 */
function buildSummarySentence(categories: ScoreCategory[], buckets: Bucket[]): string {
  const rows = categories.map((c, i) => ({
    label: c.label,
    earned: buckets[i].earned,
    max: c.nominalMax,
    ratio: c.nominalMax > 0 ? buckets[i].earned / c.nominalMax : 0,
  }));
  if (rows.every((r) => r.earned === 0)) {
    return "아직 산정된 점수가 없어 전 영역이 위원 판단을 기다리고 있어요.";
  }
  const sorted = [...rows].sort((a, b) => b.ratio - a.ratio);
  const best = sorted[0];
  const zeros = rows.filter((r) => r.earned === 0);
  const mids = rows.filter((r) => r !== best && r.earned > 0);
  const bestPhrase = best.ratio >= 0.7 ? "특히 좋아요" : best.ratio >= 0.4 ? "상대적으로 나은 편이에요" : "그나마 나은 편이에요";
  let s = `${best.label}(${best.earned}/${best.max})이 ${bestPhrase}.`;
  if (zeros.length > 0) {
    s += ` ${zeros.map((z) => z.label).join("·")}은 거의 채점되지 않아 가장 약해요.`;
  }
  if (mids.length > 0) {
    s += ` ${mids.map((m) => `${m.label}도 ${m.earned}/${m.max}으로 낮은 편이에요`).join(", ")}.`;
  }
  return s;
}

/* ---------------------------------------------------------------- 도넛 링 ---- */

const RING_R = 86;
const RING_C = 2 * Math.PI * RING_R;

function polarPoint(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 100 + r * Math.sin(rad), y: 100 - r * Math.cos(rad) };
}

interface RingSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * [신규 2026-09-25] "원형그래프에서 점수별로 표기" → "그래프 상에도 보이는게
 * 좋지" 두 라운드를 거쳐 나온 도넛 계산. 세그먼트를 순서대로 이어붙이고
 * (dashoffset 을 누적 길이만큼 민다), 값이 있는 조각만 리더 라인 좌표를 낸다.
 *
 * [알려진 단순화] 이름표는 항상 링 오른쪽에 세로로 쌓는다(시안 승인 범위).
 * 이 화면 특성상 대부분 총점이 낮아(마케팅 카테고리가 항상 위원판단으로
 * 빠지는 등) 채워진 호가 원 왼쪽 절반까지 넘어가는 경우가 드물다 — 만약
 * 총점이 아주 높아 조각이 원 왼쪽까지 걸치면 리더 선이 링을 가로지를 수
 * 있다(왼쪽에도 이름표 열을 만드는 양방향 배치는 하지 않았다).
 */
function computeRing(segments: RingSegment[], axisMax: number) {
  let cum = 0;
  const arcs: { key: string; color: string; dasharray: string; dashoffset: number }[] = [];
  const callouts: { key: string; label: string; value: number; color: string; edge: { x: number; y: number } }[] = [];
  for (const seg of segments) {
    const startFrac = axisMax > 0 ? cum / axisMax : 0;
    if (seg.value > 0) {
      const lenFrac = seg.value / axisMax;
      const len = RING_C * lenFrac;
      arcs.push({ key: seg.key, color: seg.color, dasharray: `${len} ${Math.max(RING_C - len, 0)}`, dashoffset: -(RING_C * startFrac) });
      const midAngle = (startFrac + lenFrac / 2) * 360;
      callouts.push({ key: seg.key, label: seg.label, value: seg.value, color: seg.color, edge: polarPoint(midAngle, RING_R + 8) });
    }
    cum += seg.value;
  }
  return { arcs, callouts };
}

function passLineDash(axisMax: number) {
  const dashLen = 2.4;
  const frac = axisMax > 0 ? 60 / axisMax : 0;
  return { dasharray: `${dashLen} ${RING_C - dashLen}`, dashoffset: -(RING_C * frac) };
}

function DonutHero({
  result,
  categories,
  catBuckets,
  axisMax,
}: {
  result: VenueScoreResult;
  categories: ScoreCategory[];
  catBuckets: Bucket[];
  axisMax: number;
}) {
  const segments: RingSegment[] = categories.map((cat, i) => ({
    key: cat.key,
    label: cat.label.split("·")[0],
    value: catBuckets[i].earned,
    color: CATEGORY_ACCENT[cat.key],
  }));
  if (result.bonusTotal > 0) {
    segments.push({ key: "BONUS", label: "가점", value: result.bonusTotal, color: BONUS_ACCENT });
  }
  const { arcs, callouts } = computeRing(segments, axisMax);
  const zeros = segments.filter((s) => s.value === 0);
  const nominalTotal = categories.reduce((sum, c) => sum + c.nominalMax, 0);
  const pass = passLineDash(axisMax);

  return (
    <div className="relative shrink-0" style={{ width: 300, height: 200 }}>
      <svg viewBox="0 0 200 200" width={200} height={200} className="absolute left-0 top-0" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={100} cy={100} r={RING_R} fill="none" style={{ stroke: "var(--border-soft)" }} strokeWidth={16} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={100}
            cy={100}
            r={RING_R}
            fill="none"
            style={{ stroke: a.color }}
            strokeWidth={16}
            strokeDasharray={a.dasharray}
            strokeDashoffset={a.dashoffset}
          />
        ))}
        <circle
          cx={100}
          cy={100}
          r={RING_R}
          fill="none"
          style={{ stroke: "var(--foreground)" }}
          strokeWidth={16}
          strokeDasharray={pass.dasharray}
          strokeDashoffset={pass.dashoffset}
        />
      </svg>
      <svg viewBox="0 0 300 200" width={300} height={200} className="absolute left-0 top-0">
        {callouts.map((c, i) => {
          const y = 15 + i * 36;
          return (
            <g key={c.key}>
              <line x1={c.edge.x} y1={c.edge.y} x2={200} y2={y} style={{ stroke: "var(--border-soft)" }} strokeWidth={1.5} />
              <circle cx={200} cy={y} r={3.5} style={{ fill: c.color }} />
              <text x={209} y={y} dominantBaseline="middle" fontSize={13} fontWeight={700} style={{ fill: "var(--foreground)" }}>
                {c.label} {c.value}점
              </text>
            </g>
          );
        })}
        {zeros.map((z, i) => {
          const y = 15 + callouts.length * 36 + (callouts.length > 0 ? 6 : 0) + i * 24;
          return (
            <g key={z.key} opacity={0.55}>
              <circle cx={200} cy={y} r={3.5} style={{ fill: z.color }} />
              <text x={209} y={y} dominantBaseline="middle" fontSize={12} style={{ fill: "var(--muted)" }}>
                {z.label} 0점
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center" style={{ left: 14, top: 14, width: 172, height: 172 }}>
        <div className="text-[40px] font-extrabold leading-none tracking-tight text-foreground tabular-nums">{result.provisionalFinal}</div>
        <div className="mt-1 text-[13px] font-semibold text-muted">/ {nominalTotal}점</div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-[10px] bg-panel-strong px-2.5 py-1.5 text-xs font-semibold text-muted">
      {label} <b className="font-bold text-foreground">{value}</b>
    </span>
  );
}

function HeroInfo({
  result,
  categories,
  catBuckets,
  resolvable,
  totalUnresolved,
  totalExcluded,
}: {
  result: VenueScoreResult;
  categories: ScoreCategory[];
  catBuckets: Bucket[];
  resolvable: number;
  totalUnresolved: number;
  totalExcluded: number;
}) {
  const pass = result.provisionalEligible;
  const summary = buildSummarySentence(categories, catBuckets);
  const headroomTotal = result.provisionalFinal + resolvable;

  return (
    <div className="max-w-[380px] text-left">
      <span
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[15px] font-bold"
        style={pass ? { background: "var(--good-soft)", color: "var(--good)" } : { background: "var(--danger-soft)", color: "var(--danger)" }}
      >
        {pass ? `✓  합격선(60점) 통과 · +${result.provisionalFinal - 60}점` : `✕  합격선(60점)에 ${60 - result.provisionalFinal}점 모자라요`}
      </span>

      <p className="mt-3 text-[15px] font-medium leading-relaxed text-foreground">{summary}</p>

      {resolvable > 0 && (
        <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted">
          아직 <b className="font-bold text-foreground">확인이 안 된 {totalUnresolved}점</b>이 위원 판단으로 채워지고
          {totalExcluded > 0 && (
            <>
              , <b className="font-bold text-foreground">정책상 아예 안 매기는 {totalExcluded}점</b>이 있어요
            </>
          )}
          . 지금 상태로는 최대 <b className="font-bold text-foreground">{headroomTotal}점</b>까지 오를 수 있어요
          {headroomTotal >= 60 && result.provisionalFinal < 60 ? " — 딱 합격선이에요." : "."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <StatChip label="확정" value={`${result.computedSubtotal}점`} />
        {totalUnresolved > 0 && <StatChip label="확인 필요" value={`${totalUnresolved}점`} />}
        {totalExcluded > 0 && <StatChip label="채점 안 함" value={`${totalExcluded}점`} />}
        <StatChip label="가점" value={`+${result.bonusTotal}점`} />
        {result.penaltyTotal > 0 && <StatChip label="감점" value={`−${result.penaltyTotal}점`} />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 카테고리 ---- */

function ItemCard({ item }: { item: ScoreItem }) {
  return (
    <div className="rounded-[14px] bg-panel p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{item.code}</div>
      <div className="mt-0.5 text-[14px] font-bold text-foreground">{item.label}</div>
      <div className="mt-2">
        <ConfidencePill c={item.confidence} />
      </div>
      {item.bands ? (
        <BandPills bands={item.bands} score={item.score} />
      ) : (
        <p className="mt-2 text-xs text-muted">기준: {item.rule}</p>
      )}
      {item.evidence && (
        <p className="mt-2 text-xs text-muted-strong">
          근거: <b className="font-bold text-foreground">{item.evidence}</b>
        </p>
      )}
      {item.note && <p className="mt-1.5 border-l-2 border-border-soft pl-2.5 text-xs leading-relaxed text-muted">{item.note}</p>}
      <div className="mt-2.5 text-right">
        <span className="text-[15px] font-extrabold tabular-nums text-foreground">{item.score === null ? "—" : item.score}</span>
        <span className="ml-1 text-xs font-semibold text-muted">/ {item.maxScore}</span>
      </div>
    </div>
  );
}

function CategoryCard({ cat, bucket }: { cat: ScoreCategory; bucket: Bucket }) {
  const color = CATEGORY_ACCENT[cat.key];
  const pct = cat.nominalMax > 0 ? Math.max(0, Math.min(100, (bucket.earned / cat.nominalMax) * 100)) : 0;
  return (
    <details className="group overflow-hidden rounded-[18px] bg-panel-strong">
      <summary className="cursor-pointer list-none p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: hexToRgba(color, 0.14), color }}
            >
              <span className="h-[18px] w-[18px]">
                <CategoryIcon categoryKey={cat.key} />
              </span>
            </span>
            <span className="text-sm font-bold text-foreground">{cat.label}</span>
          </div>
          <span className="shrink-0 text-muted transition-transform group-open:rotate-90">›</span>
        </div>
        <div className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
          {bucket.earned}
          <span className="ml-1 text-[13px] font-semibold text-muted">/ {cat.nominalMax}</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-panel">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </summary>
      <div className="space-y-3 px-5 pb-5 pt-1">
        {cat.items.map((item) => (
          <ItemCard key={item.code} item={item} />
        ))}
      </div>
    </details>
  );
}

/* ------------------------------------------------------------ 가점·감점 ---- */

function StatusDot({ state }: { state: "earned" | "zero" | "pending" }) {
  if (state === "pending") {
    return (
      <span
        className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
        style={{ background: hexToRgba(PENDING_ACCENT, 0.16), color: PENDING_ACCENT }}
      >
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M12 8v5M12 16h.01" />
          <circle cx={12} cy={12} r={9} />
        </svg>
      </span>
    );
  }
  if (state === "earned") {
    return (
      <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-good-soft text-good">
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-panel text-muted">
      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </span>
  );
}

function BonusRow({ item }: { item: BonusItem }) {
  const pending = item.score === null;
  const earned = !pending && (item.score as number) > 0;
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-panel p-3.5">
      <StatusDot state={pending ? "pending" : earned ? "earned" : "zero"} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-foreground">{item.label}</div>
        {item.bands && <BandPills bands={item.bands} score={item.score} />}
        {item.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{item.note}</p>}
      </div>
      <span
        className="shrink-0 text-[13px] font-extrabold tabular-nums"
        style={{ color: pending ? PENDING_ACCENT : earned ? "var(--good)" : "var(--muted)" }}
      >
        {pending ? "확인 필요" : `+${item.score} / ${item.maxScore}`}
      </span>
    </div>
  );
}

function PenaltyRow({ item }: { item: PenaltyItem }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-panel p-3.5">
      <span className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-panel-strong text-muted">
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.3 3.9L1.8 18a1.6 1.6 0 001.4 2.4h17.6a1.6 1.6 0 001.4-2.4L13.7 3.9a1.6 1.6 0 00-2.8 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-foreground">{item.label}</div>
        <div className="mt-0.5 text-xs text-muted">해당 사유가 있는지 위원이 직접 확인해요.</div>
      </div>
      <span className="shrink-0 rounded-full bg-panel-strong px-2.5 py-1 text-xs font-extrabold tabular-nums text-muted">{item.penalty}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- 본문 ---- */

function VenueScoreBlock({ result }: { result: VenueScoreResult }) {
  const autoDq = result.disqualifiers.find((d) => d.auto && d.triggered);
  const catBuckets = result.categories.map((cat) => bucketize(cat.items));
  const nominalTotal = result.categories.reduce((sum, c) => sum + c.nominalMax, 0);
  const totalUnresolved = catBuckets.reduce((sum, b) => sum + b.unresolved, 0);
  const totalExcluded = catBuckets.reduce((sum, b) => sum + b.excluded, 0);
  const bonusBucket = bucketize(result.bonuses);
  // 위원 판단으로 지금 당장 더 오를 수 있는 여지 — 정책상 제외(excluded)는 법무
  // 확정 전까지는 어차피 0으로 고정이라 "당장의 headroom" 에 넣지 않는다.
  const resolvable = totalUnresolved + bonusBucket.unresolved;
  const axisMax = Math.max(nominalTotal, result.provisionalFinal, 1);

  return (
    <div className="overflow-hidden rounded-[24px] bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.07)]">
      <div className="border-b border-border-soft px-7 py-5 text-[15px] font-bold text-foreground">{result.venueLabel} 채점 초안</div>

      <div className="p-7">
        <div className="flex flex-wrap items-center gap-7">
          <DonutHero result={result} categories={result.categories} catBuckets={catBuckets} axisMax={axisMax} />
          <HeroInfo
            result={result}
            categories={result.categories}
            catBuckets={catBuckets}
            resolvable={resolvable}
            totalUnresolved={totalUnresolved}
            totalExcluded={totalExcluded}
          />
        </div>

        {autoDq && (
          <div className="mt-6 rounded-[14px] bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            부적격 게이트 자동 발동 — {autoDq.label}. 점수와 무관하게 대관 불가입니다.
          </div>
        )}

        <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {result.categories.map((cat, i) => (
            <CategoryCard key={cat.key} cat={cat} bucket={catBuckets[i]} />
          ))}
        </div>

        <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
          <div className="rounded-[18px] bg-panel-strong p-5">
            <h4 className="text-[15px] font-bold text-foreground">가점</h4>
            <p className="mt-0.5 text-xs text-muted">기본 {nominalTotal}점과 별도로 더 받을 수 있는 점수예요.</p>
            <div className="mt-3 space-y-2.5">
              {result.bonuses.map((b) => (
                <BonusRow key={b.code} item={b} />
              ))}
            </div>
          </div>

          <div className="rounded-[18px] bg-panel-strong p-5">
            <h4 className="text-[15px] font-bold text-foreground">감점</h4>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              회사의 과거 이력에 따른 감점이에요. 이력을 조회하는 기능이 아직 없어서 지금은 전부{" "}
              <b className="text-foreground">0점 — 아무 것도 깎이지 않았어요.</b> 해당 사유를 위원이 알고 있다면 아래
              점수만큼 직접 최종 점수에서 빼 주세요. 같은 사건이면 가장 큰 사유 하나만 적용합니다.
            </p>
            <div className="mt-3 space-y-2.5">
              {result.penalties.map((p) => (
                <PenaltyRow key={p.code} item={p} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3.5 rounded-[18px] bg-panel-strong p-5">
          <h4 className="text-[15px] font-bold text-foreground">부적격 게이트</h4>
          <p className="mt-0.5 text-xs text-muted">발동되면 점수와 상관없이 대관이 불가해요.</p>
          <div className="mt-3 space-y-2">
            {result.disqualifiers.map((d) => (
              <div key={d.code} className="flex items-center justify-between gap-3 border-t border-border-soft pt-2 first:border-t-0 first:pt-0 text-[13px]">
                <span className="min-w-0 truncate font-semibold text-foreground">{d.label}</span>
                {d.auto ? (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={
                      d.triggered
                        ? { background: "var(--danger-soft)", color: "var(--danger)" }
                        : { background: "var(--good-soft)", color: "var(--good)" }
                    }
                  >
                    {d.triggered ? "발동" : "정상 (자동 확인됨)"}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-panel px-2.5 py-1 text-xs font-bold text-muted">위원 확인 필요</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoringPanel({ breakdown }: { breakdown: QuoteScoreBreakdown }) {
  return (
    <div
      className="space-y-5"
      style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: "-0.011em" }}
    >
      <div>
        <h3 className="text-[17px] font-bold text-foreground">심사 채점, 한눈에</h3>
        <p className="mt-1 text-xs text-muted">
          「서울아레나 대관 심의 평가 세부 기준」 Ver. {breakdown.rubricVersion} 기준 자동 산정 초안이에요. 참고용이며
          저장되지 않아요 — 최종 점수·판정은 아래 심사 폼에서 직접 입력해 주세요.
        </p>
      </div>

      {breakdown.results.map((result) => (
        <VenueScoreBlock key={result.venueId} result={result} />
      ))}

      <details className="overflow-hidden rounded-[18px] bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-[13.5px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
          유의사항 · 동점 시 판단 순서
        </summary>
        <div className="space-y-2.5 border-t border-border-soft px-6 py-4 text-xs leading-relaxed text-muted">
          <p>
            경합 시 순위·동점 tie-break·이력 기반 감점·시뮬레이션은 아직 자동 반영되지 않았어요. 협조 동의
            항목(공동 프로모션·실적 데이터 제공, 10점)은 대관계약 동의서와의 충돌 소지로 법무 확정 전까지
            제외했어요.
          </p>
          <p>
            동일 일정에 2건 이상이면 <b className="text-foreground">적격 판정을 받은 건 중 최종 점수 최고 득점자</b>
            를 우선 선정하고, 점수가 같으면 ① 대관 수익성(20점) → ② 예상 관객 규모(20점) → ③ 마케팅 협조(공동
            프로모션 + 공연 실적 데이터 협조) 합산 → ④ 마케팅 파급력(출연 IP 공식 채널 구독자·팔로워 합산, 활용
            가능한 외부 채널 수) 순으로 판단해요.
          </p>
        </div>
      </details>
    </div>
  );
}
