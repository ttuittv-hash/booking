import { notFound } from "next/navigation";
import { BookingPreview } from "@/components/wizard/BookingPreview";
export default async function Page({searchParams}:{searchParams:Promise<{editor?:string}>}){
 if(process.env.NODE_ENV!=="development"||process.env.ADMIN_DESIGN_PREVIEW!=="1")notFound();
 return <BookingPreview editorMode={(await searchParams).editor === "1"}/>;
}
