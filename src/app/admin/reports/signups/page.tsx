import {redirect} from "next/navigation";
import {requireProAdminPage} from "@/lib/auth";
export default async function LegacyReport({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 await requireProAdminPage();const sp=await searchParams;const params=new URLSearchParams();for(const key of ['g','days','from','to','period']){const value=sp[key];if(typeof value==='string')params.set(key,value);}redirect(`/admin/reports?${params}`);
}
