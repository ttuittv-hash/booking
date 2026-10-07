"use client";

import { useState } from "react";
import s from "./ReportTrendChart.module.css";

type Point = { label: string; values: number[]; detail?:string };
type Series = { label: string; unit: string; color: string };

/** Same values are available through hover, keyboard focus, and touch. */
export function ReportTrendChart({ points, series }: { points: Point[]; series: Series[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = series.map((item, index) => ({ ...item, index })).filter(item => !hidden.includes(item.label));
  const max = Math.max(1, ...points.flatMap(point => visible.map(item => point.values[item.index] ?? 0)));
  const ceiling = Math.ceil(max / 4) * 4;
  const x = (index: number) => points.length < 2 ? 500 : 50 + (index + 0.5) / points.length * 900;
  const y = (value: number) => 210 - value / ceiling * 180;
  const current = selected !== null ? points[selected] : undefined;
  return <div className={s.chart}>
    <div className={s.legend}>{series.map(item => <button key={item.label} type="button" aria-pressed={!hidden.includes(item.label)} onClick={() => setHidden(prev => prev.includes(item.label) ? prev.filter(label => label !== item.label) : [...prev, item.label])}><span style={{ background: item.color }}/>{item.label}</button>)}</div>
    {!points.length ? <p className={s.empty}>선택한 기간에 수집된 기록이 없습니다.</p> : <>
      <div className={s.plot}>
        <svg viewBox="0 0 1000 250" role="img" aria-label="기간별 추이. 아래 날짜 버튼에서 정확한 값을 확인할 수 있습니다.">
          {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="50" x2="950" y1={y(ceiling * tick / 4)} y2={y(ceiling * tick / 4)} stroke="#deddd9"/><text x="40" y={y(ceiling * tick / 4) + 4} textAnchor="end" fill="#777" fontSize="12">{new Intl.NumberFormat('ko-KR',{notation:'compact',maximumFractionDigits:1}).format(ceiling * tick / 4)}</text></g>)}
          {visible.map(item => <g key={item.label}><polyline points={points.map((point, index) => `${x(index)},${y(point.values[item.index] ?? 0)}`).join(' ')} fill="none" stroke={item.color} strokeWidth="3" vectorEffect="non-scaling-stroke"/>{points.map((point, index) => <circle key={index} cx={x(index)} cy={y(point.values[item.index] ?? 0)} r={selected === index ? 5 : 3} fill={item.color}/>)}</g>)}
          {selected !== null && <line x1={x(selected)} x2={x(selected)} y1="20" y2="215" stroke="#777" strokeDasharray="4 4"/>}
        </svg>
        <div className={s.targets}>{points.map((point, index) => <button type="button" key={`${point.label}-${index}`} aria-label={`${point.label}: ${series.map((item, i) => `${item.label} ${(point.values[i] ?? 0).toLocaleString('ko-KR')}${item.unit}`).join(', ')}`} onMouseEnter={() => setSelected(index)} onFocus={() => setSelected(index)} onClick={() => setSelected(index)}><span>{point.label}</span></button>)}</div>
      </div>
      <div className={s.readout} aria-live="polite">{current ? <><strong>{current.label}</strong>{current.detail&&<span>{current.detail}</span>}{series.map((item, index) => <span key={item.label}><i style={{ background: item.color }}/>{item.label} <b>{(current.values[index] ?? 0).toLocaleString('ko-KR')}{item.unit}</b></span>)}</> : <span>그래프 위에 마우스를 올리거나 터치하면 정확한 수치를 확인할 수 있습니다.</span>}</div>
    </>}
  </div>;
}
