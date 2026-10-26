"use client";
import { useState } from "react";
import { selectPreviewWeek } from "./bookingPreviewScheduleState";
import { isoDate, resolveSelectedDates } from "@/lib/pricing/dateRange";
import { SPECIAL_VENUE_ID, type DateBlock, type QuoteSelection, type WeekDemand } from "@/lib/pricing/types";
import s from "./BookingPreview.module.css";
type Props = {
    selection: QuoteSelection;
    onChange: (update: (previous: QuoteSelection) => QuoteSelection) => void;
    dateBlocks: DateBlock[];
    weekDemand?: WeekDemand[];
    midHallWeekDemand?: Record<string, number>;
    monthBounds?: {
        start: string | null;
        end: string | null;
    };
};
const displayDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))} (${["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T12:00:00`).getDay()]})`;
const addDays = (date: string, n: number) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + n);
    return isoDate(value);
};
/** Shared redesigned calendar; uses live availability and the canonical schedule fields. */
export function BookingPreviewSchedule({ selection, onChange, dateBlocks, monthBounds, weekDemand = [], midHallWeekDemand = {} }: Props) {
    const simultaneous = selection.bookingMode === "SIMULTANEOUS";
    const allInOne = selection.venueId === SPECIAL_VENUE_ID;
    const [tab, setTab] = useState<"arena" | "medium-hall">(selection.venueId === "medium-hall" ? "medium-hall" : "arena");
    const mid = tab === "medium-hall";
    const [month, setMonth] = useState({ year: selection.week.year, month: selection.week.month });
    const [editingWeek, setEditingWeek] = useState(false);
    const [countPopover, setCountPopover] = useState<string | null>(null);
    const arenaDates = Object.keys(selection.dayTags).sort();
    const midDates = Object.keys(selection.midHallDays).sort();
    const selected = mid ? midDates : arenaDates;
    const hasWeek = selected.length > 0 && !editingWeek;
    const performances = selected.filter(date => mid ? selection.midHallDays[date]?.role === "PERFORMANCE" : selection.dayTags[date] === "PERFORMANCE");
    const baseDates = mid ? selected.filter(date => selection.midHallDays[date]?.role !== "LOAD_OUT") : resolveSelectedDates({ ...selection, extraDays: 0 });
    const first = new Date(month.year, month.month - 1, 1);
    const gridStart = new Date(month.year, month.month - 1, 1 - (first.getDay() + 6) % 7);
    let count = 0;
    const weeks = Array.from({ length: 6 }, (_, row) => {
        const days = Array.from({ length: 7 }, (_, col) => { const d = new Date(gridStart); d.setDate(d.getDate() + row * 7 + col); return isoDate(d); });
        const inMonth = new Date(`${days[1]}T12:00:00`).getMonth() === month.month - 1;
        if (inMonth)
            count++;
        return { days, week: { year: month.year, month: month.month, weekOfMonth: inMonth ? count : 0 }, available: inMonth || (row === 0 && days.some(d => Number(d.slice(5, 7)) === month.month)) };
    });
    function demandFor(week: QuoteSelection["week"], tuesday: string) {
        return mid ? (midHallWeekDemand[tuesday] ?? 0) :
            (weekDemand.find(item => item.year === week.year && item.month === week.month && item.weekOfMonth === week.weekOfMonth)?.companyCount ?? 0);
    }
    const today = isoDate(new Date());
    function blocked(date: string) {
        return date < today || dateBlocks.some(b => b.date === date && (b.venueId === "ALL" || b.venueId === tab || (allInOne && b.venueId === "medium-hall")));
    }
    function weekBlocked(days: string[]) {
        return days.some(blocked) || (mid && simultaneous && arenaDates.length > 0 && days.some(date => !resolveSelectedDates(selection).includes(date)));
    }
    function chooseWeek(week: QuoteSelection["week"], dates: string[]) {
        if (weekBlocked(dates))
            return;
        onChange(previous => selectPreviewWeek(previous, week, mid));
        setEditingWeek(false);
    }
    function togglePerformance(date: string) {
        onChange(prev => {
            if (mid) {
                const role = prev.midHallDays[date]?.role === "PERFORMANCE" ? "SETUP" as const : "PERFORMANCE" as const;
                return { ...prev, midHallDays: { ...prev.midHallDays, [date]: { role, shows: 1 } } };
            }
            const role = prev.dayTags[date] === "PERFORMANCE" ? "PREP" as const : "PERFORMANCE" as const;
            return { ...prev, dayTags: { ...prev.dayTags, [date]: role }, dayShowCounts: { ...prev.dayShowCounts, [date]: 1 }, ...(allInOne ? { midHallDays: { ...prev.midHallDays, [date]: { role: role === "PREP" ? "SETUP" : role, shows: 1 } } } : {}) };
        });
    }
    function changeShows(date: string, shows: number) {
        if (shows === 0) {
            setCountPopover(null);
            togglePerformance(date);
            return;
        }
        if (shows < 1 || shows > 3) return;
        onChange(prev => mid
            ? { ...prev, midHallDays: { ...prev.midHallDays, [date]: { role: "PERFORMANCE", shows } } }
            : { ...prev, dayShowCounts: { ...prev.dayShowCounts, [date]: shows },
                ...(allInOne ? { midHallDays: { ...prev.midHallDays, [date]: { role: "PERFORMANCE", shows } } } : {}) });
    }
    const loadOutDates = selected.filter(d => mid ? selection.midHallDays[d].role === "LOAD_OUT" : selection.dayTags[d] === "LOAD_OUT");
    const last = selected.at(-1);
    const next = last ? addDays(last, 1) : "";
    const canExtend = !!next && !blocked(next) && (!monthBounds?.end || next.slice(0, 7) <= monthBounds.end) && (mid ? (!simultaneous || !arenaDates.length || resolveSelectedDates(selection).includes(next)) : selection.extraDays < 30);
    function extend() {
        if (!canExtend)
            return;
        onChange(prev => mid ? { ...prev, midHallDays: { ...prev.midHallDays, [next]: { role: "LOAD_OUT", shows: 1 } } } : { ...prev, extraDays: prev.extraDays + 1, dayTags: { ...prev.dayTags, [next]: "LOAD_OUT" }, ...(allInOne ? { midHallDays: { ...prev.midHallDays, [next]: { role: "LOAD_OUT", shows: 1 } } } : {}) });
    }
    // Load-out dates are consecutive and carry no per-date input; shortening the tail
    // compacts the remaining dates regardless of which load-out block was clicked.
    function removeLoadOut() {
        if (!last)
            return;
        onChange(prev => {
            const dayTags = { ...prev.dayTags }, midHallDays = { ...prev.midHallDays }, dayShowCounts = { ...prev.dayShowCounts };
            if (mid) {
                delete midHallDays[last];
                return { ...prev, midHallDays };
            }
            delete dayTags[last];
            delete dayShowCounts[last];
            if (allInOne || simultaneous)
                delete midHallDays[last];
            return { ...prev, dayTags, dayShowCounts, midHallDays, extraDays: Math.max(0, prev.extraDays - 1) };
        });
    }
    function monthKey(delta: number) { const d = new Date(month.year, month.month - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
    function move(delta: number) { const d = new Date(month.year, month.month - 1 + delta, 1); setMonth({ year: d.getFullYear(), month: d.getMonth() + 1 }); }
    return <section className={s.panel}>
    <h3>일정 선택</h3>
    {simultaneous && <div className={s.segment} role="group" aria-label="일정 공간"><button type="button" aria-pressed={!mid} onClick={() => { setTab("arena"); setEditingWeek(false); }}>아레나</button><button type="button" aria-pressed={mid} onClick={() => { setTab("medium-hall"); setEditingWeek(false); }}>중형공연장</button></div>}

    <p className={s.scheduleHint}>{!hasWeek ? "대관할 주를 선택하세요. 기본 대관기간은 화요일부터 일요일입니다." : "공연할 날짜를 눌러주세요. 선택하지 않은 날짜는 준비일로 자동 설정됩니다."}{allInOne && " All in One은 두 공간에 같은 일정을 적용합니다."}</p>
    {!hasWeek ? <>
      <div className={s.calendarHead}><button type="button" aria-label="이전 달" disabled={!!monthBounds?.start && monthKey(-1) < monthBounds.start} onClick={() => move(-1)}>‹</button><h4>{month.year}년 {month.month}월</h4><button type="button" aria-label="다음 달" disabled={!!monthBounds?.end && monthKey(1) > monthBounds.end} onClick={() => move(1)}>›</button></div>
      <div className={s.weekdayGrid}>{["월", "화", "수", "목", "금", "토", "일"].map(day => <span key={day}>{day}</span>)}</div>
      <div className={s.weekList}>{weeks.filter(w => w.available).map(w => <button type="button" key={w.days[0]} disabled={weekBlocked(w.days.slice(1))} onClick={() => chooseWeek(w.week, w.days.slice(1))} aria-label={`${w.days[1]}부터 ${w.days[6]}까지 주 선택`}>{w.days.map((d, i) => <span key={d} data-excluded={i === 0}>{Number(d.slice(-2))}</span>)}{demandFor(w.week, w.days[1]) > 0 && <small className={s.weekDemand}>신청 {demandFor(w.week, w.days[1])}개사</small>}</button>)}</div>
      <p className={s.scheduleHint}>대관 불가일이 포함된 주는 선택할 수 없습니다.{mid && simultaneous && " 중형공연장은 아레나 대관기간 안에서 선택하세요."}</p>
    </> : <>
      <div className={s.scheduleRange}><button type="button" onClick={() => setEditingWeek(true)} aria-label="이전: 주 선택으로">← 이전</button><strong>{baseDates[0]} ~ {baseDates.at(-1)}</strong></div>
      <div className={s.weekdayGrid}>{["월", "화", "수", "목", "금", "토", "일"].map(day => <span key={day}>{day}</span>)}</div>
      <div className={`${s.performanceDates} ${s.scheduleCalendar}`}>
        {Array.from({ length: baseDates[0] ? (new Date(`${baseDates[0]}T12:00:00`).getDay() + 6) % 7 : 0 }, (_, index) => <div key={`empty-${index}`} aria-hidden="true" />)}
        {baseDates.map(date => {
        const performance = performances.includes(date);
        const shows = mid ? selection.midHallDays[date]?.shows ?? 1 : selection.dayShowCounts[date] ?? 1;
        return <div className={s.scheduleDay} key={date}
          onPointerEnter={event => { if (performance && event.pointerType === "mouse") setCountPopover(date); }}
          onPointerLeave={event => { if (event.pointerType === "mouse") setCountPopover(null); }}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCountPopover(null); }}
          onKeyDown={event => { if (event.key === "Escape") setCountPopover(null); }}>
          <button className={s.dateChoice} type="button" aria-pressed={performance} aria-label={`${date} ${performance ? "공연" : "준비"}`} onClick={() => { setCountPopover(null); togglePerformance(date); }}>
            <span>{Number(date.slice(5, 7))}/{Number(date.slice(8))}</span><b aria-hidden={performance} data-count-placeholder={performance}>{performance ? `공연 · ${shows}회` : "준비"}</b>
          </button>
          {performance && <button className={s.showCountTrigger} type="button" aria-label={`${date} 공연 횟수 ${shows}회 조절`} aria-expanded={countPopover === date} aria-controls={`shows-popover-${tab}-${date}`} onClick={() => setCountPopover(date)}>공연 · {shows}회</button>}
          {performance && countPopover === date && <div className={s.showCountField} id={`shows-popover-${tab}-${date}`}>
            <span className={s.showCountLabel} id={`shows-label-${tab}-${date}`}>{displayDate(date)}<br />공연 횟수</span>
            <div className={s.showCountControl} role="group" aria-labelledby={`shows-label-${tab}-${date}`}>
            <button type="button" aria-label={`${date} 공연 횟수 줄이기`} onClick={() => changeShows(date, shows - 1)}>−</button>
            <output aria-live="polite" aria-label={`${date} 공연 횟수`}>{shows}회</output>
            <button type="button" aria-label={`${date} 공연 횟수 늘리기`} disabled={shows >= 3} onClick={() => changeShows(date, shows + 1)}>＋</button>
            </div>
          </div>}
        </div>;
      })}
        {loadOutDates.map(date => <button className={s.loadOutCard} type="button" key={date} aria-label={`${date} 철수일 삭제`} title="클릭하여 철수일 삭제" onClick={removeLoadOut}><span>{Number(date.slice(5, 7))}/{Number(date.slice(8))}</span><b>철수</b><span className={s.loadOutDeleteLabel} aria-hidden="true">×</span></button>)}
        <button className={s.addLoadOut} type="button" disabled={!performances.length || !canExtend} onClick={extend}><span aria-hidden="true">＋</span><span>철수일 추가</span></button>
      </div>
    </>}
  </section>;
}
