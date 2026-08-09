import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewPromoForm from "@/components/NewPromoForm";

export const dynamic = "force-dynamic";

export default async function NewPromoPage() {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("biz_member")
    .select("biz_id")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/biz/onboard");

  return <NewPromoForm bizId={membership.biz_id} />;
}
