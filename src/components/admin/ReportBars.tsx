import s from "./ReportSummary.module.css";
export type ReportBar = {label:string;value:number;unit?:string;detail?:string;rate?:number|null};
const colors=['var(--admin-chart-blue)','var(--admin-chart-approved)','var(--admin-chart-gold)','var(--admin-chart-hold)','var(--admin-chart-neutral)','var(--admin-chart-rejected)'];
const statusColors:Record<string,string>={'승인':'var(--admin-chart-approved)','승인 완료':'var(--admin-chart-approved)','보류':'var(--admin-chart-hold)','거절':'var(--admin-chart-rejected)','승인 대기':'var(--admin-chart-neutral)','정지':'var(--admin-chart-rejected)'};
const color=(label:string,i:number)=>statusColors[label]??colors[i%colors.length];
const number=(n:number)=>n.toLocaleString('ko-KR');
export function ReportBars({rows,variant='table'}:{rows:ReportBar[];variant?:'table'|'donut'|'steps'|'gauges'}) {
 if(!rows.length)return <p className={s.empty}>이 기간에 표시할 기록이 없습니다.</p>;
 if(variant==='steps')return <ol className={s.steps}>{rows.map((r,i)=><li key={`${r.label}-${i}`}><span className={s.stepNumber}>{String(i+1).padStart(2,'0')}</span><h3>{r.label}</h3><strong>{number(r.value)}{r.unit??'건'}</strong>{r.rate!==undefined&&<div className={s.rate}><span>직전 대비</span><b>{r.rate===null?'—':`${r.rate}%`}</b></div>}<p>{r.detail}</p></li>)}</ol>;
 if(variant==='gauges')return <div className={s.gauges}>{rows.map((r,i)=><article key={r.label}><h3>{r.label}</h3><div className={s.ring} role="img" aria-label={`${r.label} ${number(r.value)}%`} style={{background:`conic-gradient(${['#315f78','#658b79','#8c759e'][i%3]} ${Math.max(0,Math.min(100,r.value))}%, var(--background) 0)`}}><div><strong>{number(r.value)}%</strong><span>사용률</span></div></div>{r.detail&&<p>{r.detail}</p>}</article>)}</div>;
 if(variant==='donut'){
 const total=rows.reduce((sum,r)=>sum+Math.max(0,r.value),0);let end=0;
 const slices=rows.map((r,i)=>{const start=end;end+=total?Math.max(0,r.value)/total*100:0;return `${color(r.label,i)} ${start}% ${end}%`;});
 return <div className={s.distribution}><div className={s.ring} role="img" aria-label={`전체 ${number(total)}${rows[0]?.unit??'건'}. 항목별 수치와 비율은 옆 목록에 표시됩니다.`} style={{background:total?`conic-gradient(${slices.join(',')})`:'var(--background)'}}><div><span>전체</span><strong>{number(total)}{rows[0]?.unit??'건'}</strong></div></div><ul className={s.legend}>{rows.map((r,i)=><li key={`${r.label}-${i}`}><span className={s.label}><i style={{background:color(r.label,i)}}/>{r.label}</span><strong>{number(r.value)}{r.unit??'건'}</strong><span>{total?`${(Math.max(0,r.value)/total*100).toFixed(1)}%`:'—'}</span>{r.detail&&<small>{r.detail}</small>}</li>)}</ul></div>;
 }
 const details=rows.some(r=>r.detail);
 return <div className={s.tableWrap}><table><thead><tr><th scope="col">항목</th><th scope="col">수치</th>{details&&<th scope="col">상세</th>}</tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.label}-${i}`}><th scope="row">{r.label}</th><td>{number(r.value)}{r.unit??'건'}</td>{details&&<td>{r.detail??'—'}</td>}</tr>)}</tbody></table></div>;
}
