import { createClient } from "@/lib/supabase/server";
import CravingStudio from "@/components/CravingStudio";
import type { GridPromo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("live_promos");
  const promos = (data ?? []) as GridPromo[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedPromoIds: string[] = [];
  if (user) {
    const { data: saves } = await supabase
      .from("wallet_save")
      .select("promo_id")
      .eq("status", "active");
    savedPromoIds = (saves ?? []).map((s) => s.promo_id);
  }

  const { data: cats } = await supabase
    .from("food_category")
    .select("label")
    .eq("active", true)
    .order("sort");

  return (
    <CravingStudio
      allPromos={promos}
      savedPromoIds={savedPromoIds}
      categories={(cats ?? []).map((c) => c.label)}
    />
  );
}
