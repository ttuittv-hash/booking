import {describe,it,expect} from 'vitest';
import {reportPeriod,completeBuckets} from './reportPeriod';
describe('report period presets',()=>{
 it('uses inclusive 7 day daily windows across months',()=>{expect(reportPeriod({period:'day'},'2026-10-02').range).toMatchObject({from:'2026-09-26',to:'2026-10-02'});});
 it('combines aggregation and range in weekly and monthly presets',()=>{expect(reportPeriod({period:'week'},'2026-10-02')).toMatchObject({granularity:'week',range:{from:'2026-09-03'}});expect(reportPeriod({period:'month'},'2026-10-02')).toMatchObject({granularity:'month',range:{from:'2026-07-05'}});});
 it('retains legacy bookmarked dates and clamps future ranges',()=>{expect(reportPeriod({days:'90'},'2026-10-02').range.from).toBe('2026-07-05');expect(reportPeriod({period:'custom',from:'2026-09-01',to:'2027-01-01'},'2026-10-02').range.to).toBe('2026-10-02');});
 it('normalizes inverted dates and unknown modes',()=>{expect(reportPeriod({period:'custom',from:'2026-10-02',to:'2026-10-01'},'2026-10-02').range.from).toBe('2026-10-01');expect(reportPeriod({period:'bad'},'2026-10-02').mode).toBe('day');});
});

describe('complete report buckets',()=>{
 it('fills gaps without dropping recorded values',()=>{expect(completeBuckets([{bucket:'2026-10-02',value:4}],'2026-10-01','2026-10-03','day',bucket=>({bucket,value:0}))).toEqual([{bucket:'2026-10-01',value:0},{bucket:'2026-10-02',value:4},{bucket:'2026-10-03',value:0}]);});
 it('deduplicates partial week and month buckets',()=>{const empty=(bucket:string)=>({bucket});expect(completeBuckets([],'2026-09-30','2026-10-02','week',empty)).toEqual([{bucket:'2026-09-28'}]);expect(completeBuckets([],'2026-09-30','2026-10-02','month',empty)).toEqual([{bucket:'2026-09-01'},{bucket:'2026-10-01'}]);});
});
