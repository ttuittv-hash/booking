import { DEFAULT_REGISTER_TERMS } from "@/lib/terms";
import { notFound } from "next/navigation";
import { AdminDesignPreview } from "@/components/admin/AdminDesignPreview";

export default function Page() {
  if (process.env.NODE_ENV !== "development" || process.env.ADMIN_DESIGN_PREVIEW !== "1") notFound();
  return <AdminDesignPreview registerTerms={DEFAULT_REGISTER_TERMS} />;
}
