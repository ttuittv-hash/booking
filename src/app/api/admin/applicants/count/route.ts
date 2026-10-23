import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countPendingApplicants } from "@/lib/db";
export async function GET() {
 const user = await getCurrentUser();
 if (!user || user.role !== "ADMIN" || user.adminTier === "BASIC") return NextResponse.json({error:"권한이 없습니다."},{status:403});
 return NextResponse.json({count:await countPendingApplicants()},{headers:{"Cache-Control":"no-store"}});
}
