"use client";

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
  Area,
  ContentFormShell,
  ImageField,
  ListEditor,
  Rich,
  Section,
  StringList,
  Text,
} from "./fields";
import { HELP } from "./adminUi";

/* ============================================================================
   페이지별 콘텐츠 편집 폼.

   각 폼은 그 화면이 실제로 렌더하는 값만 다룬다 — 편집해도 반영되지 않는
   입력란을 두지 않는 것이 이 파일의 규칙이다.
   ========================================================================= */

const blankPair = (): Pair => ({ label: "", value: "" });

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
          <Text label={valueName} value={it.value} onChange={(value) => patch({ value })} />
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
            <Rich label="" value={v.aboutLead} onChange={(aboutLead) => patch({ aboutLead })} />
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
            <Rich label="" value={v.whyLead} onChange={(whyLead) => patch({ whyLead })} />
          </Section>

          <Section
            title="시설 특징 — FEATURES"
            help="시설 소개(아레나 탭)의 FEATURES 와는 별개로 관리됩니다."
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

/* --------------------------------------------------------- 시설 소개 ----- */

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
        label="STAGE & CAPACITY"
        help="무대 배치별로 하나씩 만듭니다. 배치 구분이 없으면 배치명을 비워 두세요."
        items={value.capacity}
        onChange={(capacity) => p({ capacity })}
        blank={() => ({ stage: "", seated: "", standing: "", floors: [] })}
        addLabel="+ 배치 추가"
        titleOf={(it, i) => it.stage || `구성 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Text label="배치명" value={it.stage} onChange={(stage) => patch({ stage })} />
              <Text label="SEATED" value={it.seated} onChange={(seated) => patch({ seated })} />
              <Text
                label="STANDING"
                value={it.standing}
                onChange={(standing) => patch({ standing })}
              />
            </div>
            <PairList
              label="층별 구성"
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
        <p className={HELP}>FEATURES — 비워 두면 해당 탭에서 섹션이 나오지 않습니다.</p>
        <div className="mt-2">
          <FeatureListEditor items={value.features} onChange={(features) => p({ features })} />
        </div>
      </div>

      <PairList
        label="ADDITIONAL FACILITIES"
        items={value.facilities}
        onChange={(facilities) => p({ facilities })}
        labelName="시설명"
        valueName="설명"
        addLabel="+ 시설 추가"
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

/* --------------------------------------------------------- 대관 안내 ----- */

export function GuideForm({ content }: { content: GuidePageContent }) {
  return (
    <ContentFormShell page="guide" initial={content}>
      {(v, patch) => (
        <>
          <Section title="대관 안내 — 리드 문단">
            <Rich label="" value={v.intro} onChange={(intro) => patch({ intro })} />
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
      <Text
        label="대관 기간 표기 (비우면 행이 나오지 않습니다)"
        value={value.rentalPeriod}
        onChange={(rentalPeriod) => p({ rentalPeriod })}
      />

      <StringList
        label="요금표 행 이름"
        items={value.rowLabels}
        onChange={(next) => setRowLabels(next, "rowLabels")}
        addLabel="+ 행 추가"
      />

      <ListEditor
        label="요금표 열 (요금 구분)"
        items={value.columns}
        onChange={(columns) => p({ columns })}
        blank={() => ({ key: `col${Date.now()}`, name: "", values: value.rowLabels.map(() => "") })}
        addLabel="+ 열 추가"
        titleOf={(it, i) => it.name || `열 ${i + 1}`}
        render={(it, patch) => (
          <div className="space-y-2">
            <Text label="열 이름" value={it.name} onChange={(name) => patch({ name })} />
            {value.rowLabels.map((rl, ri) => (
              <Text
                key={ri}
                label={rl}
                value={it.values[ri] ?? ""}
                onChange={(nv) =>
                  patch({ values: value.rowLabels.map((_, k) => (k === ri ? nv : it.values[k] ?? "")) })
                }
              />
            ))}
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
              <Text
                key={ri}
                label={rl}
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
        label="기본 항목 (RATE INCLUDES)"
        help="대관료에 무상으로 포함되는 항목입니다. 중형공연장은 대관 신청 위저드의 '구성 · 옵션' 화면에 '기본 항목' 박스로 그대로 노출됩니다."
        items={value.includes}
        onChange={(includes) => p({ includes })}
        labelName="구분"
        valueName="포함 내용"
        addLabel="+ 기본 항목 추가"
      />

      <ListEditor
        label="옵션 (ADDITIONAL CHARGES)"
        help="추가 비용이 발생하는 항목입니다. '구분'은 위저드 화면에서 항목을 묶는 그룹 제목으로 쓰입니다(예: 추가대관, 공간·프로모션, 기타). 중형공연장의 '추가대관' 그룹은 위저드에서 시간 단위로 직접 조정할 수 있게 연동되어 있고, 그 외 항목은 금액을 그대로 보여주는 참고용으로 노출됩니다."
        items={value.charges}
        onChange={(charges) => p({ charges })}
        blank={() => ({ group: "", item: "", cost: "", note: "" })}
        addLabel="+ 옵션 항목 추가"
        titleOf={(it, i) => `${it.group || "-"} · ${it.item || i + 1}`}
        render={(it, patch) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Text label="구분 (그룹)" value={it.group} onChange={(group) => patch({ group })} />
            <Text label="항목" value={it.item} onChange={(item) => patch({ item })} />
            <Text label="비용" value={it.cost} onChange={(cost) => patch({ cost })} />
            <Text label="비고" value={it.note} onChange={(note) => patch({ note })} />
          </div>
        )}
      />

      <PairList
        label="기준·제한 사항"
        help="기본 항목 박스 아래에 안내 문구로 함께 노출됩니다(예: 기준 이용시간, 1일 2회 공연 할증 등)."
        items={value.limits}
        onChange={(limits) => p({ limits })}
        labelName="구분"
        valueName="내용"
        addLabel="+ 기준 추가"
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
      blank={() => ({ title: "", desc: "", meta: [], href: "", pendingNote: "" })}
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
          <Text
            label="파일 주소"
            value={it.href}
            onChange={(href) => p({ href })}
            help="비워 두면 다운로드 버튼 대신 아래 안내 문구가 나옵니다."
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
            title="규약 전문"
            help={
              "규약은 조문을 한 칸씩 고치는 문서가 아니라 판본을 통째로 갈아 끼우는 문서입니다. " +
              "확정본 원문을 그대로 붙여 넣으세요. `제N장 …` 으로 시작하는 줄은 장 제목, " +
              "`제N조 (…)` 로 시작하는 줄은 조 제목이 되고, 나머지 줄은 그 조의 항이 됩니다. " +
              "목차는 장 제목으로 자동 생성됩니다."
            }
          >
            <Area
              label=""
              rows={28}
              paragraph={false}
              value={v.body}
              onChange={(body) => patch({ body })}
            />
          </Section>
        </>
      )}
    </ContentFormShell>
  );
}
