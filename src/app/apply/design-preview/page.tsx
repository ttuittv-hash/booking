import { notFound } from "next/navigation";
import { BookingPreview } from "@/components/wizard/BookingPreview";
export default async function Page({searchParams}:{searchParams:Promise<{editor?:string;review?:string}>}){
 if(process.env.NODE_ENV!=="development"||process.env.ADMIN_DESIGN_PREVIEW!=="1")notFound();
 const params = await searchParams;
 return <BookingPreview editorMode={params.editor === "1"} reviewMode={params.review === "1"}/>;
}
