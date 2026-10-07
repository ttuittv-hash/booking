import {resolveRange,shiftDays} from './trafficRange';
export function reportPeriod(sp:{period?:string;from?:string;to?:string;days?:string;g?:string},today:string){
 const mode=['hour','day','week','month','custom'].includes(sp.period??'')?sp.period!:(sp.from||sp.to||sp.days?'custom':sp.g==='week'?'week':sp.g==='month'?'month':'day');
 const range=mode==='custom'?resolveRange({...sp,today}):{from:shiftDays(today,mode==='hour'?-1:mode==='day'?-6:mode==='week'?-29:-89),to:today,presetDays:null,notice:null};
 const granularity=mode==='week'?'week':mode==='month'?'month':'day';
 return {mode,range,granularity} as const;
}

/** Fill missing buckets with zero instead of drawing a line across missing days. */
export function completeBuckets<T extends {bucket:string}>(rows:T[],from:string,to:string,granularity:'day'|'week'|'month',empty:(bucket:string)=>T):T[]{
 const byBucket=new Map(rows.map(row=>[row.bucket,row]));const keys=new Set<string>();
 for(let day=from;day<=to;day=shiftDays(day,1)){
   let key=day;
   if(granularity==='month')key=day.slice(0,7)+'-01';
   if(granularity==='week'){const weekday=new Date(day+'T12:00:00Z').getUTCDay();key=shiftDays(day,-((weekday+6)%7));}
   keys.add(key);
 }
 return [...keys].map(key=>byBucket.get(key)??empty(key));
}
