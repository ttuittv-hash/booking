"use client";

import Link from "next/link";
import type {
  DocumentsContent,
  FeaturesContent,
  GuidePageContent,
  Pair,
  RatesContent,
  RulesContent,
  ScreenTextContent,
  SeoulArenaContent,
  VenueFacilityContent,
  VenueRateContent,
} from "@/lib/content/pageContent";
import {
  DEFAULT_RATE_SECTION_TITLES,
  DEFAULT_RULES_CONTENT,
  EMPTY_VENUE_RATE_CONTENT,
} from "@/lib/content/pageContent";
import {
  Area,
  ContentFormShell,
  DocumentField,
  ImageField,
  ListEditor,
  Section,
  StringList,
  Text,
} from "./fields";
import { HELP } from "./adminUi";
import { RuleBodyEditor } from "./RuleBodyEditor";
import { SPECIAL_VENUE_ID, VENUES } from "@/lib/pricing/types";
import {
  defaultVenueName,
  defaultVenueRateTab,
  venueLabelKey,
  venueRateTabKey,
} from "@/lib/content/venueLabels";
import { LEGEND_COLORS, LEGEND_COLOR_LABELS, LEGEND_KEYS } from "@/lib/content/scheduleLegend";
import { normalizeDiscountPercent } from "@/lib/content/rateDiscount";

/* ============================================================================
   페이지별 콘텐츠 편집 폼.

   각 폼은 그 화면이 실제로 렌더하는 값만 다룬다 — 편집해도 반영되지 않는
   입력란을 두지 않는 것이 이 파일의 규칙이다.
   ========================================================================= */

const blankPair = (): Pair => ({ label: "", value: "" });

/**
 * 본문 성격의 입력칸에 붙는 안내 (2026-09-03).
 * 제목·라벨을 뺀 모든 문구는 여러 줄 입력칸이고, 줄바꿈과 굵게를 운영자가 정한다.
 * 굵게 표기는 홈 선언문이 쓰던 `**…**` 를 사이트 전체로 넓힌 것이다(`kit` 의 `RichText`).
 */
const COPY_FIELD_HELP = "줄바꿈은 그대로 나갑니다. **굵게** 로 감싸면 굵게 나옵니다.";

function PairList({
  label,
  help,
  items,
  onChange,
  labelName = "항목",
  valueName = "내용",
  addLabel,
}: {
  label?: string;
  help?: string;
  items: Pair[];
  onChange: (items: Pair[]) => void;
  labelName?: string;
  valueName?: string;
  addLabel?: string;
}) {
  return (
    <ListEditor
      label={label}
      help={help}
      items={items}
      onChange={onChange}
      blank={blankPair}
      addLabel={addLabel}
      titleOf={(it, i) => it.label || `${i + 1}`}
      render={(it, patch) => (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Text label={labelName} value={it.label} onChange={(label) => patch({ label })} />
          <Area label={valueName} rows={2} value={it.value} onChange={(value) => patch({ value })} />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------- 서울아레나 ------ */

export function SeoulArenaForm({ content }: { content: SeoulArenaContent }) {
  return (
    <ContentFormShell page="seoularena" initial={content}>
      {(v, patch) => (
        <>
          <Section title="시설개요 — 리드 문단">
            <Area label="" rows={6} value={v.aboutLead} onChange={(aboutLead) => patch({ aboutLead })} />
          </Section>

          <Section
            title="공간 소개 (전면 사진 섹션)"
            help="사진 위에 공간명·수용 규모·설명이 얹힙니다. 사진을 비우면 회색 플레이스홀더가 나옵니다."
          >
            <ListEditor
              items={v.heroes}
              onChange={(heroes) => patch({ heroes })}
              blank={() => ({ title: "", eyebrow: "", desc: "", image: null })}
              addLabel="+ 공간 추가"
              titleOf={(it, i) => it.title || `공간 ${i + 1}`}
              render={(it, p) => (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Text label="공간명 (H2)" value={it.title} onChange={(title) => p({ title })} />
                    <Text
                      label="수용 규모 (eyebrow)"
                      value={it.eyebrow}
                      onChange={(eyebrow) => p({ eyebrow })}
                    />
                  </div>
                  <Area label="설명" rows={3} value={it.desc} onChange={(desc) => p({ desc })} />
                  <ImageField
                    label="배경 사진"
                    value={it.image}
                    onChange={(image) => p({ image })}
                  />
                </div>
              )}
            />
          </Section>

          <Section title="시설개요 — FEATURES">
            <Text
              label="리드 문구"
              value={v.complexFeaturesLead}
              onChange={(complexFeaturesLead) => patch({ complexFeaturesLead })}
            />
            <StringList
              label="항목 (번호가 자동으로 붙습니다)"
              items={v.complexFeatures}
              onChange={(complexFeatures) => patch({ complexFeatures })}
            />
          </Section>

          <Section title="시설 특징 — 리드 문단">
            <Area label="" rows={6} value={v.whyLead} onChange={(whyLead) => patch({ whyLead })} />
          </Section>

          <Section
            title="시설 특징 — FEATURES"
            help="시설 제원(아레나 탭)의 FEATURES 와는 별개로 관리됩니다."
          >
            <FeatureListEditor
              items={v.stageFeatures}
              onChange={(stageFeatures) => patch({ stageFeatures })}
            />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}

function FeatureListEditor({
  items,
  onChange,
}: {
  items: { title: string; lines: string[] }[];
  onChange: (items: { title: string; lines: string[] }[]) => void;
}) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      blank={() => ({ title: "", lines: [""] })}
      addLabel="+ 특징 추가"
      titleOf={(it, i) => it.title || `특징 ${i + 1}`}
      render={(it, p) => (
        <div className="space-y-3">
          <Text label="제목 (H5)" value={it.title} onChange={(title) => p({ title })} />
          <StringList
            label="설명 줄"
            items={it.lines}
            onChange={(lines) => p({ lines })}
            addLabel="+ 줄 추가"
          />
        </div>
      )}
    />
  );
}

/* --------------------------------------------------------- 시설 제원 ----- */

function VenueFacilityFields({
  value,
  onChange,
}: {
  value: VenueFacilityContent;
  onChange: (v: VenueFacilityContent) => void;
}) {
  const p = (patch: Partial<VenueFacilityContent>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-7">
      <PairList
        label="개요 카드 (제목은 작은 라벨, 내용은 큰 글씨)"
        items={value.overview}
        onChange={(overview) => p({ overview })}
        labelName="라벨"
        valueName="내용"
        addLabel="+ 카드 추가"
      />

      <ListEditor
        label="CAPACITY & CONFIGURATION"
        help="구성마다 카드 한 장입니다. SEATED·STANDING 을 비우면 아래 '층별 구성'이 카드의 줄이 됩니다(중형 FIXED SEATS)."
        items={value.capacity}
        onChange={(capacity) => p({ capacity })}
        blank={() => ({ stage: "", desc: "", seated: "", standing: "", floors: [] })}
        addLabel="+ 구성 추가"
        titleOf={(it, i) => it.stage || `구성 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Text label="카드 제목" value={it.stage} onChange={(stage) => patch({ stage })} />
              <Text label="SEATED" value={it.seated} onChange={(seated) => patch({ seated })} />
              <Text
                label="STANDING"
                value={it.standing}
                onChange={(standing) => patch({ standing })}
              />
            </div>
            <Area
              label="카드 부제"
              rows={2}
              help={COPY_FIELD_HELP}
              value={it.desc ?? ""}
              onChange={(desc) => patch({ desc })}
            />
            <PairList
              label="층별 구성"
              help="SEATED·STANDING 이 비어 있을 때만 카드에 나옵니다."
              items={it.floors}
              onChange={(floors) => patch({ floors })}
              labelName="층"
              valueName="좌석"
              addLabel="+ 층 추가"
            />
          </div>
        )}
      />

      <div>
        <p className={HELP}>FLOOR &amp; SEATING — 비워 두면 해당 탭에서 섹션이 나오지 않습니다.</p>
        <div className="mt-2">
          <FeatureListEditor items={value.features} onChange={(features) => p({ features })} />
        </div>
      </div>

      {/* 검정 지면 위 4칼럼 스펙 카드 — PRODUCTION & RIGGING · LOAD-IN & SUPPORT 등 */}
      <ListEditor
        label="스펙 카드 섹션 (검정 지면)"
        help="섹션마다 제목 하나 + 카드 4칼럼입니다. 카드는 [라벨 / 큰 수치 / 설명] 세 줄입니다."
        items={value.specGroups}
        onChange={(specGroups) => p({ specGroups })}
        blank={() => ({ title: "", cards: [] })}
        addLabel="+ 섹션 추가"
        titleOf={(it, i) => it.title || `섹션 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-3">
            <Text label="섹션 제목" value={it.title} onChange={(title) => patch({ title })} />
            <ListEditor
              label="카드"
              items={it.cards}
              onChange={(cards) => patch({ cards })}
              blank={() => ({ label: "", value: "", desc: "" })}
              addLabel="+ 카드 추가"
              titleOf={(card, i) => card.label || `카드 ${i + 1}`}
              render={(card, cardPatch) => (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Text
                      label="라벨"
                      value={card.label}
                      onChange={(label) => cardPatch({ label })}
                    />
                    <Text
                      label="수치 (큰 글씨)"
                      value={card.value}
                      onChange={(v) => cardPatch({ value: v })}
                    />
                  </div>
                  <Area
                    label="설명"
                    rows={2}
                    help={COPY_FIELD_HELP}
                    value={card.desc}
                    onChange={(desc) => cardPatch({ desc })}
                  />
                </div>
              )}
            />
          </div>
        )}
      />

      {/* 부대시설은 카테고리 카드로 나온다 — 묶음마다 카드 한 장(Figma 「additional facilities」) */}
      <ListEditor
        label="ADDITIONAL FACILITIES (카테고리 카드)"
        help="카테고리마다 카드 한 장이 나옵니다. 카드는 한 줄에 두 장씩 놓입니다. 비워 두면 섹션이 나오지 않습니다."
        items={value.facilityGroups}
        onChange={(facilityGroups) => p({ facilityGroups })}
        blank={() => ({ title: "", items: [] })}
        addLabel="+ 카테고리 추가"
        titleOf={(it, i) => it.title || `카테고리 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-3">
            <Text label="카테고리명" value={it.title} onChange={(title) => patch({ title })} />
            <PairList
              label="시설"
              items={it.items}
              onChange={(items) => patch({ items })}
              labelName="시설명"
              valueName="설명"
              addLabel="+ 시설 추가"
            />
          </div>
        )}
      />
    </div>
  );
}

export function FeaturesForm({ content }: { content: FeaturesContent }) {
  return (
    <ContentFormShell page="features" initial={content}>
      {(v, patch) => (
        <>
          <Section title="아레나 탭">
            <VenueFacilityFields value={v.arena} onChange={(arena) => patch({ arena })} />
          </Section>
          <Section title="중형공연장 탭">
            <VenueFacilityFields value={v.liveHall} onChange={(liveHall) => patch({ liveHall })} />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}

/* --------------------------------------------------------- 대관 절차 ----- */

export function GuideForm({ content }: { content: GuidePageContent }) {
  return (
    <ContentFormShell page="guide" initial={content}>
      {(v, patch) => (
        <>
          <Section title="대관 절차 — 리드 문단">
            <Area label="" rows={6} value={v.intro} onChange={(intro) => patch({ intro })} />
          </Section>

          <Section
            title="대관 절차"
            help="한 줄에 4박스씩 두 줄로 그려집니다. 8단계를 기준으로 하되 개수는 자유입니다."
          >
            <ListEditor
              items={v.process}
              onChange={(process) => patch({ process })}
              blank={() => ({ no: "", title: "", desc: "" })}
              addLabel="+ 단계 추가"
              titleOf={(it, i) => `${it.no || i + 1} ${it.title}`}
              render={(it, p) => (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,6rem)_minmax(0,1fr)]">
                    <Text label="번호" value={it.no} onChange={(no) => p({ no })} />
                    <Text label="제목" value={it.title} onChange={(title) => p({ title })} />
                  </div>
                  <Area label="설명" rows={3} value={it.desc} onChange={(desc) => p({ desc })} />
                </div>
              )}
            />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}

/* ------------------------------------------------------------ 대관료 ----- */

function RateTableFields({
  value,
  onChange,
}: {
  value: VenueRateContent;
  onChange: (v: VenueRateContent) => void;
}) {
  const p = (patch: Partial<VenueRateContent>) => onChange({ ...value, ...patch });

  /** 행 이름을 바꾸면 각 열의 값 배열 길이도 함께 맞춘다 */
  function setRowLabels(next: string[], key: "rowLabels" | "detailLabels") {
    const colKey = key === "rowLabels" ? "columns" : "detailColumns";
    const cols = value[colKey].map((c) => ({
      ...c,
      values: next.map((_, i) => c.values[i] ?? ""),
    }));
    onChange({ ...value, [key]: next, [colKey]: cols } as VenueRateContent);
  }

  return (
    <div className="space-y-7">
      <Area
        label="페이지 리드 (제목 아래 한 문단)"
        value={value.intro}
        onChange={(intro) => p({ intro })}
      />

      {/* [신규 2026-09-02] 섹션 제목(대분류) — 화면에 코드로 박혀 있어 못 고쳤다.
          요금 체계가 바뀌면 같이 바뀌는 말이라 운영자 손에 둔다. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["packages", "1. 패키지 섹션 제목"],
            ["includes", "2. 포함 항목 섹션 제목"],
            ["limits", "3. 이용 기준 섹션 제목"],
            ["charges", "4. 추가 사용료 섹션 제목"],
          ] as const
        ).map(([key, label]) => (
          <Text
            key={key}
            label={label}
            value={value.sectionTitles?.[key] ?? ""}
            placeholder={DEFAULT_RATE_SECTION_TITLES[key]}
            onChange={(next) => p({ sectionTitles: { ...value.sectionTitles, [key]: next } })}
            help="비우면 기본 제목이 나갑니다."
          />
        ))}
      </div>

      <Text
        label="대관 기간 표기 (비우면 행이 나오지 않습니다)"
        value={value.rentalPeriod}
        onChange={(rentalPeriod) => p({ rentalPeriod })}
      />

      <StringList
        label="요금표 항목 (행) 추가·삭제"
        help="항목 이름은 아래 각 열 안에서도 고칠 수 있습니다 — 이름은 모든 열이 함께 씁니다."
        items={value.rowLabels}
        onChange={(next) => setRowLabels(next, "rowLabels")}
        addLabel="+ 행 추가"
      />

      <ListEditor
        label="요금표 열 (요금 구분)"
        items={value.columns}
        onChange={(columns) => p({ columns })}
        blank={() => ({
          key: `col${Date.now()}`,
          name: "",
          values: value.rowLabels.map(() => ""),
          extras: [],
        })}
        addLabel="+ 열 추가"
        titleOf={(it, i) => it.name || `열 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-2">
            <Text label="열 이름" value={it.name} onChange={(name) => patch({ name })} />
            {/* [2026-09-03 팀 요청] 할인율 — 있으면 대관료 카드에 ~~정상가~~ N% 와 할인가가 함께 나간다 */}
            <Text
              label="할인 % (선택 · 1~99, 비우면 할인 표시 없음)"
              value={it.discountPercent ? String(it.discountPercent) : ""}
              onChange={(v) => patch({ discountPercent: normalizeDiscountPercent(v) })}
              help="대관료 값에 적힌 금액에서 계산합니다. 예) 518,300,000원 + 10 → ~~518,300,000원~~ 10% / 466,470,000원"
            />
            {/* [신규 2026-09-02] 항목 이름을 값 바로 위에서 고친다. 예전에는 위쪽
                「요금표 행 이름」 목록에서만 바꿀 수 있어, 값을 보면서 이름을 못 고쳤다.
                이름은 모든 열이 함께 쓰는 값이라 한 곳만 고쳐도 전부 바뀐다. */}
            {value.rowLabels.map((rl, ri) => (
              <div key={ri} className="border-l-2 border-border-soft pl-3">
                <Text
                  label={`항목 ${ri + 1} 이름 (모든 열 공통)`}
                  value={rl}
                  onChange={(nextLabel) =>
                    setRowLabels(
                      value.rowLabels.map((v, k) => (k === ri ? nextLabel : v)),
                      "rowLabels",
                    )
                  }
                />
                <div className="mt-2">
                  <Area
                    label={rl || `항목 ${ri + 1}`}
                    rows={2}
                    value={it.values[ri] ?? ""}
                    onChange={(nv) =>
                      patch({
                        values: value.rowLabels.map((_, k) => (k === ri ? nv : it.values[k] ?? "")),
                      })
                    }
                  />
                </div>
              </div>
            ))}
            {/* [신규 2026-09-02] 카드 맨 아래 헤어라인 밑에 붙는 행(준비일 추가 · 공연일 추가).
                화면에는 나가는데 편집할 자리가 없어 금액도 문구도 못 고쳤다. */}
            <PairList
              label="카드 하단 추가 요금 (준비일 추가 · 공연일 추가)"
              help="라벨과 금액을 그대로 찍습니다. 비우면 카드 아래 헤어라인과 이 행이 나오지 않습니다."
              items={it.extras ?? []}
              onChange={(extras) => patch({ extras })}
              labelName="라벨"
              valueName="금액"
              addLabel="+ 행 추가"
            />
          </div>
        )}
      />

      <StringList
        label="Details 토글 행 이름"
        items={value.detailLabels}
        onChange={(next) => setRowLabels(next, "detailLabels")}
        addLabel="+ 행 추가"
      />

      <ListEditor
        label="Details 토글 열"
        items={value.detailColumns}
        onChange={(detailColumns) => p({ detailColumns })}
        blank={() => ({
          key: `dcol${Date.now()}`,
          name: "",
          values: value.detailLabels.map(() => ""),
        })}
        addLabel="+ 열 추가"
        titleOf={(it, i) => it.name || `열 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-2">
            <Text label="열 이름" value={it.name} onChange={(name) => patch({ name })} />
            {value.detailLabels.map((rl, ri) => (
              <Area
                key={ri}
                label={rl}
                rows={2}
                value={it.values[ri] ?? ""}
                onChange={(nv) =>
                  patch({
                    values: value.detailLabels.map((_, k) => (k === ri ? nv : it.values[k] ?? "")),
                  })
                }
              />
            ))}
          </div>
        )}
      />

      <PairList
        label="기본 항목 — 위저드용 (RATE INCLUDES)"
        help="중형공연장 대관 신청 위저드의 '구성 · 옵션' 화면에 '기본 항목' 박스로 그대로 노출됩니다. 대관료 화면에는 아래 '포함 항목 카드'가 나갑니다 — 두 곳의 내용이 어긋나지 않게 함께 고쳐 주세요."
        items={value.includes}
        onChange={(includes) => p({ includes })}
        labelName="구분"
        valueName="포함 내용"
        addLabel="+ 기본 항목 추가"
      />

      <Area
        label="포함 항목 섹션 리드"
        value={value.includesLead}
        onChange={(includesLead) => p({ includesLead })}
      />

      <ListEditor
        label="포함 항목 카드 (대관료 화면)"
        help="카드 한 장씩 나옵니다. 카드 안은 [항목 / 설명] 두 열이고, 한 줄에 두 장씩 놓입니다."
        items={value.includeGroups}
        onChange={(includeGroups) => p({ includeGroups })}
        blank={() => ({ title: "", rows: [] })}
        addLabel="+ 카드 추가"
        titleOf={(it, i) => it.title || `카드 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-3">
            <Text label="카드 제목" value={it.title} onChange={(title) => patch({ title })} />
            <PairList
              label="항목"
              items={it.rows}
              onChange={(rows) => patch({ rows })}
              labelName="항목"
              valueName="설명"
              addLabel="+ 항목 추가"
            />
          </div>
        )}
      />

      <ListEditor
        label="옵션 (ADDITIONAL CHARGES)"
        help="추가 비용이 발생하는 항목입니다. '구분'은 위저드 화면에서 항목을 묶는 그룹 제목으로 쓰입니다(예: 추가대관, 공간·프로모션, 기타). 중형공연장의 '추가대관' 그룹은 위저드에서 시간 단위로 직접 조정할 수 있게 연동되어 있고, 그 외 항목은 금액을 그대로 보여주는 참고용으로 노출됩니다."
        items={value.charges}
        onChange={(charges) => p({ charges })}
        blank={() => ({ group: "", item: "", cost: "", unit: "", note: "" })}
        addLabel="+ 옵션 항목 추가"
        titleOf={(it, i) => `${it.group || "-"} · ${it.item || i + 1}`}
        render={(it, patch) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Text label="구분 (그룹)" value={it.group} onChange={(group) => patch({ group })} />
            <Text label="항목" value={it.item} onChange={(item) => patch({ item })} />
            <Text label="비용" value={it.cost} onChange={(cost) => patch({ cost })} />
            <Text
              label="단위·조건 (금액 아래 작게)"
              value={it.unit ?? ""}
              onChange={(unit) => patch({ unit })}
            />
            <Area
              label="비고"
              rows={2}
              help={COPY_FIELD_HELP}
              value={it.note}
              onChange={(note) => patch({ note })}
            />
          </div>
        )}
      />

      <ListEditor
        label="기본 이용 기준"
        help="대관료 화면에 4-up 카드로 나오고(라벨 · 큰 값 · 부연), 위저드의 기본 항목 박스 아래에도 안내 문구로 함께 노출됩니다."
        items={value.limits}
        onChange={(limits) => p({ limits })}
        blank={() => ({ label: "", value: "", note: "" })}
        addLabel="+ 기준 추가"
        titleOf={(it, i) => it.label || `기준 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Text label="라벨" value={it.label} onChange={(label) => patch({ label })} />
              <Text label="값 (큰 글씨)" value={it.value} onChange={(v) => patch({ value: v })} />
            </div>
            <Area
              label="부연"
              rows={2}
              help={COPY_FIELD_HELP}
              value={it.note ?? ""}
              onChange={(note) => patch({ note })}
            />
          </div>
        )}
      />

      <StringList
        label="하단 주석 (※ 가 자동으로 붙습니다)"
        items={value.notes}
        onChange={(notes) => p({ notes })}
        addLabel="+ 주석 추가"
      />
    </div>
  );
}

export function RatesForm({ content }: { content: RatesContent }) {
  return (
    <ContentFormShell page="rates" initial={content}>
      {/*
        주의 — 이 표는 공개 /rates 페이지의 "보여주는" 콘텐츠다.
        대관 신청의 견적 계산은 "요금표 관리"의 요금표를 쓴다. 두 곳이 어긋나면
        공개 페이지의 금액과 실제 견적이 달라지므로, 요금을 바꿀 때는 함께 확인할 것.
      */}
      {(v, patch) => (
        <>
          <Section title="아레나 탭">
            <RateTableFields value={v.arena} onChange={(arena) => patch({ arena })} />
          </Section>
          <Section title="중형공연장 탭">
            <RateTableFields value={v.liveHall} onChange={(liveHall) => patch({ liveHall })} />
          </Section>
          {/* [신규 2026-09-02] 세 번째 공간 탭. 예전 저장본에는 없어 기본 빈 값으로 연다. */}
          <Section
            title={`${defaultVenueName(SPECIAL_VENUE_ID)} 탭`}
            help="이름은 「공간 이름」에서 바꿉니다. 비워 두면 대관료 페이지의 해당 탭이 빈 화면으로 나옵니다."
          >
            <RateTableFields
              value={v.special ?? EMPTY_VENUE_RATE_CONTENT}
              onChange={(special) => patch({ special })}
            />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}

/* --------------------------------------------------------- 대관 자료 ----- */

function DocList({
  items,
  onChange,
}: {
  items: DocumentsContent["arena"];
  onChange: (items: DocumentsContent["arena"]) => void;
}) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      blank={() => ({ title: "", desc: "", meta: [], href: "", fileName: "", pendingNote: "" })}
      addLabel="+ 자료 추가"
      titleOf={(it, i) => it.title || `자료 ${i + 1}`}
      render={(it, p) => (
        <div className="space-y-3">
          <Text label="자료명" value={it.title} onChange={(title) => p({ title })} />
          <Area label="설명" rows={3} value={it.desc} onChange={(desc) => p({ desc })} />
          <PairList
            label="메타 (형식 · 버전 · 갱신일)"
            items={it.meta}
            onChange={(meta) => p({ meta })}
            labelName="라벨"
            valueName="값"
            addLabel="+ 메타 추가"
          />
          {/* [신규 2026-09-02] 파일을 백오피스에서 바로 올린다 — 예전에는 주소를 손으로
              적어야 해서, 파일을 어딘가에 먼저 올려 둔 사람만 자료를 등록할 수 있었다. */}
          <DocumentField
            label="파일"
            help="비워 두면 다운로드 버튼 대신 아래 안내 문구가 나옵니다."
            url={it.href}
            name={it.fileName ?? ""}
            onChange={({ url, name }) => p({ href: url, fileName: name })}
          />
          <Text
            label="파일 미등록 안내"
            value={it.pendingNote}
            onChange={(pendingNote) => p({ pendingNote })}
          />
        </div>
      )}
    />
  );
}

export function DocumentsForm({ content }: { content: DocumentsContent }) {
  return (
    <ContentFormShell page="documents" initial={content}>
      {(v, patch) => (
        <>
          <Section title="리드 문단">
            <Area label="" rows={3} value={v.lead} onChange={(lead) => patch({ lead })} />
          </Section>
          <Section
            title="시설소개 탭 자료"
            help="두 공간을 함께 담은 자료입니다. 아레나·중형 탭에 같은 파일을 또 올리지 않습니다."
          >
            <DocList items={v.facility} onChange={(facility) => patch({ facility })} />
          </Section>
          <Section title="아레나 탭 자료">
            <DocList items={v.arena} onChange={(arena) => patch({ arena })} />
          </Section>
          <Section title="중형공연장 탭 자료">
            <DocList items={v.liveHall} onChange={(liveHall) => patch({ liveHall })} />
          </Section>
          <Section title="자료가 없는 탭의 안내 문구">
            <Text
              label=""
              value={v.emptyNote}
              onChange={(emptyNote) => patch({ emptyNote })}
              help="목록이 빈 탭에서 자료 목록 자리에 대신 나옵니다."
            />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}

/* ------------------------------------------------------- 화면 문구 ------- */

export function ScreenTextForm({ content }: { content: ScreenTextContent }) {
  return (
    <ContentFormShell page="screenText" initial={content}>
      {(v, patch) => (
        <>
          {/* [신규 2026-09-02] 공간 이름 — 대관 신청 위저드의 이용 시설 버튼·구성/옵션
              탭과 백오피스 패키지 관리 탭이 모두 이 값을 읽는다. 예전에는 코드에 박혀
              있어 이름 하나 바꾸려면 배포를 해야 했다. 비우면 기본 이름으로 돌아간다. */}
          <Section
            title="공간 이름"
            help="대관 신청 위저드의 이용 시설 버튼 · 구성/옵션 탭과 패키지 관리 탭에 함께 쓰입니다. 비워 두면 기본 이름으로 돌아갑니다."
          >
            {VENUES.map((venue) => (
              <Text
                key={venue.id}
                label={`${defaultVenueName(venue.id)} (${venue.id})`}
                value={v.wizardStrings[venueLabelKey(venue.id)] ?? ""}
                onChange={(name) =>
                  patch({
                    wizardStrings: { ...v.wizardStrings, [venueLabelKey(venue.id)]: name },
                  })
                }
              />
            ))}
          </Section>

          {/* [2026-09-03 팀 요청] 일정 달력 범주의 문구와 색 — 공고 달력과 어드민 일정 관리가 같이 쓴다.
              색은 사이트 토큰 4개만 고른다. 비워 두면 지금까지의 기본 문구·색이다. */}
          <Section
            title="일정 달력 범주"
            help="대관 확정 · 심사 중 · 대관 불가 일정의 문구와 색입니다. 공고 페이지 달력과 일정 관리 화면에 함께 반영됩니다. 비워 두면 기본값입니다."
          >
            {(
              [
                ["confirmed", "대관 확정", true],
                ["reviewing", "심사 중", false],
                ["blocked", "대관 불가 일정", true],
              ] as const
            ).map(([key, fallback, fixed]) => {
              const labelKey = LEGEND_KEYS[`${key}Label`];
              const colorKey = LEGEND_KEYS[`${key}Color`];
              return (
                <div key={key} className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <Text
                    label={`${fallback} — 문구`}
                    value={v.wizardStrings[labelKey] ?? ""}
                    onChange={(t) => patch({ wizardStrings: { ...v.wizardStrings, [labelKey]: t } })}
                  />
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold">{fallback} — 색</span>
                    <select
                      className="field-base"
                      value={v.wizardStrings[colorKey] ?? ""}
                      onChange={(e) => patch({ wizardStrings: { ...v.wizardStrings, [colorKey]: e.target.value } })}
                    >
                      <option value="">{fixed ? "기본" : "기본(공간별: 아레나 노랑 · 중형 초록)"}</option>
                      {LEGEND_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {LEGEND_COLOR_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </Section>

          {/* [신규 2026-09-02] 대관료 페이지의 투뎁스 탭만 영문 표기를 쓴다
              (2026-09-03 부터 한글: 아레나 대관료 / 중형공연장 대관료 / 올인원 대관료). 공간 이름과 같은 값을 쓰면 위저드까지
              영문이 되므로 key 를 따로 둔다. */}
          <Section
            title="대관료 페이지 탭 이름"
            help="대관료 화면 위쪽 토글에만 쓰는 이름입니다. 비워 두면 아레나 대관료 · 중형공연장 대관료 · 올인원 대관료 로 나갑니다."
          >
            {VENUES.map((venue) => (
              <Text
                key={venue.id}
                label={`${defaultVenueName(venue.id)} 탭 (${venue.id})`}
                placeholder={defaultVenueRateTab(venue.id)}
                value={v.wizardStrings[venueRateTabKey(venue.id)] ?? ""}
                onChange={(name) =>
                  patch({
                    wizardStrings: { ...v.wizardStrings, [venueRateTabKey(venue.id)]: name },
                  })
                }
              />
            ))}
          </Section>

          {/* [신규 2026-09-03] 1차 오픈 동안 대관 신청을 받지 않을 때 쓰는 안내.
              신청이 열리는 날 배포 없이 여기서 끈다. */}
          <Section
            title="BOOK IT 「오픈 예정」 안내"
            help="켜면 상단바 BOOK IT 이 신청 화면으로 가지 않고, 올려 두거나 누를 때 아래 안내를 띄웁니다. 신청 접수를 시작하면 끄세요."
          >
            <label className="flex items-center gap-2 text-s">
              <input
                type="checkbox"
                checked={v.bookItNotice.enabled}
                onChange={(e) =>
                  patch({ bookItNotice: { ...v.bookItNotice, enabled: e.target.checked } })
                }
              />
              오픈 예정 안내를 띄운다 (BOOK IT 을 눌러도 신청 화면으로 가지 않음)
            </label>
            <Text
              label="제목"
              value={v.bookItNotice.title}
              onChange={(title) => patch({ bookItNotice: { ...v.bookItNotice, title } })}
            />
            <Area
              label="안내 문구"
              rows={2}
              value={v.bookItNotice.body}
              onChange={(body) => patch({ bookItNotice: { ...v.bookItNotice, body } })}
            />
          </Section>

          <Section
            title="회원가입 안내 카드"
            help="회원가입 첫 화면(/register STEP1)의 안내 카드입니다. 가입 조건과 심사 흐름을 여기서 알립니다."
          >
            <Text
              label="화면 제목"
              value={v.registerIntro.heading}
              onChange={(heading) => patch({ registerIntro: { ...v.registerIntro, heading } })}
            />
            <Text
              label="카드 제목"
              value={v.registerIntro.title}
              onChange={(title) => patch({ registerIntro: { ...v.registerIntro, title } })}
            />
            <Text
              label="카드 부제"
              value={v.registerIntro.subtitle}
              onChange={(subtitle) => patch({ registerIntro: { ...v.registerIntro, subtitle } })}
            />
            <StringList
              label="안내 항목"
              items={v.registerIntro.bullets}
              placeholder="예: 접수 후 심사를 거쳐 승인되면 이용할 수 있습니다"
              onChange={(bullets) => patch({ registerIntro: { ...v.registerIntro, bullets } })}
            />
            <Text
              label="버튼 문구"
              value={v.registerIntro.cta}
              onChange={(cta) => patch({ registerIntro: { ...v.registerIntro, cta } })}
            />
          </Section>

          <Section title="공지사항" help="공지사항 목록 화면(/notices)의 문구입니다.">
            <Area
              label="리드 문단"
              rows={3}
              value={v.noticesLead}
              onChange={(noticesLead) => patch({ noticesLead })}
            />
            <Area
              label="공지가 없을 때 안내"
              rows={2}
              value={v.noticesEmptyDesc}
              onChange={(noticesEmptyDesc) => patch({ noticesEmptyDesc })}
            />
          </Section>

          <Section title="FAQ" help="자주 묻는 질문 화면(/faq)의 리드입니다.">
            <Area label="" rows={3} value={v.faqLead} onChange={(faqLead) => patch({ faqLead })} />
          </Section>

          <Section title="대관 신청" help="신청 위저드 화면(/apply) 상단의 리드입니다.">
            <Area label="" rows={3} value={v.applyLead} onChange={(applyLead) => patch({ applyLead })} />
          </Section>

          <Section title="오시는 길" help="오시는길 화면(/location)의 리드와 안내 표입니다.">
            <Area
              label="리드 문단"
              rows={3}
              value={v.locationLead}
              onChange={(locationLead) => patch({ locationLead })}
            />
            <ListEditor
              label="안내 표"
              items={v.locationRows}
              onChange={(locationRows) => patch({ locationRows })}
              blank={() => ({ label: "", value: "" })}
              titleOf={(it) => it.label || "항목"}
              render={(it, p) => (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
                  <Text label="항목" value={it.label} onChange={(label) => p({ label })} />
                  <Text label="내용" value={it.value} onChange={(value) => p({ value })} />
                </div>
              )}
            />
          </Section>

          <Section
            title="대관 위저드 — 스텝 제목·설명"
            help="신청 위저드(/apply) 각 스텝 상단의 제목과 설명(리드) 문구입니다."
          >
            {/* [2026-08-24] "그냥 화면 전체를 복제해서 화면 자체에서 리드문구나 텍스트를
                모두 수정할 수 있게해줘 .. 입력하고 실제 프론트에 반영된거를 확인하고
                다시 어드민에 입력하고 이런게 너무 힘든거야" — 여기 있던 20개 입력칸
                폼은 지우고, 실제 위저드 컴포넌트로 그 자리에서 바로 고치는 미리보기
                화면(WizardTextPreview)으로 옮겼다. 입력칸만 있으면 어느 화면인지
                가늠이 안 되던 문제를 컴포넌트 재사용으로 없앤다. */}
            <Link
              href="/admin/content/wizard-preview"
              className="inline-flex items-center gap-1.5 border border-border bg-panel px-4 py-2.5 text-s font-bold text-foreground hover:border-foreground"
            >
              실제 위저드 화면처럼 보면서 수정하기 →
            </Link>
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}

/* --------------------------------------------------------- 대관 규약 ----- */

export function RulesForm({ content }: { content: RulesContent }) {
  return (
    <ContentFormShell page="rules" initial={content}>
      {(v, patch) => (
        <>
          <Section title="리드 문단" help="페이지 상단 제목 아래에 나오는 소개 문장입니다.">
            <Area label="" rows={3} value={v.intro} onChange={(intro) => patch({ intro })} />
          </Section>

          <Section title="개정 안내 박스" help="판본 아래 회색 박스 문구입니다. 비우면 박스가 나오지 않습니다.">
            <Area
              label=""
              rows={3}
              value={v.revisionNote}
              onChange={(revisionNote) => patch({ revisionNote })}
            />
          </Section>

          <Section title="판본">
            <div className="grid gap-2 sm:grid-cols-3">
              <Text label="문서명" value={v.title} onChange={(title) => patch({ title })} />
              <Text label="버전" value={v.version} onChange={(version) => patch({ version })} />
              <Text
                label="시행일"
                value={v.effectiveDate}
                onChange={(effectiveDate) => patch({ effectiveDate })}
              />
            </div>
          </Section>

          <Section
            title="규약 파일"
            help={
              "화면 상단에 [대관 규약 내려받기] 버튼으로 나옵니다. 웹 본문(아래 규약 전문)이 " +
              "정본이고 이 파일은 사본이므로, 규약을 고칠 때 파일도 함께 올려 주세요. " +
              "승인 완료된 회원만 내려받을 수 있습니다."
            }
          >
            <DocumentField
              label=""
              url={v.fileUrl}
              name={v.fileName}
              onChange={({ url, name }) => patch({ fileUrl: url, fileName: name })}
            />
          </Section>

          <Section
            title="규약 전문"
            help={
              "규약은 조문을 한 칸씩 고치는 문서가 아니라 판본을 통째로 갈아 끼우는 문서입니다. " +
              "확정본 원문을 그대로 붙여 넣으세요. `제N장 …` 으로 시작하는 줄은 장 제목, " +
              "`제N조 (…)` 로 시작하는 줄은 조 제목이 되고, 나머지 줄은 그 조의 항이 됩니다. " +
              "목차는 장 제목으로 자동 생성됩니다. 표가 필요하면 [+ 표 넣기] 로 넣으세요 — " +
              "별표·부칙처럼 조 번호가 없는 자리에 넣어도 그대로 나옵니다."
            }
          >
            <RuleBodyEditor
              value={v.body}
              onChange={(body) => patch({ body })}
              defaultBody={DEFAULT_RULES_CONTENT.body}
            />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}
