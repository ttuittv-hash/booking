import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BookingPreview } from "@/components/wizard/BookingPreview";
export default async function WizardFramePage() {
 const user=await getCurrentUser();
 if(!user)redirect("/admin/login");
 if(user.role!=="ADMIN")redirect("/apply");
 return <BookingPreview editorMode />;
}
