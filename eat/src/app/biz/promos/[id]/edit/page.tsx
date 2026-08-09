import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditPromoForm, { type EditablePromo } from "@/components/EditPromoForm";

export const dynamic = "force-dynamic";

export default async function EditPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/biz");

  const { data: promo } = await supabase
    .from("promo")
    .select("id, biz_id, item_name, description, price, valid_from, valid_to, quota, tags, photo")
    .eq("id", id)
    .maybeSingle();
  if (!promo) notFound();

  // membership check — RLS lets anyone read live promos, editing needs more
  const { data: member } = await supabase
    .from("biz_member")
    .select("id")
    .eq("biz_id", promo.biz_id)
    .maybeSingle();
  if (!member) redirect("/biz");

  return <EditPromoForm promo={promo as EditablePromo} />;
}
