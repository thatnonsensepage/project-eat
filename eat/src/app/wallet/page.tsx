import { createClient } from "@/lib/supabase/server";
import WalletList from "@/components/WalletList";
import type { WalletItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("wallet_save")
    .select(
      "id, status, saved_at, greyed_out_at, promo:promo_id (id, item_name, deal_type, deal_value, description, valid_to, status, biz:biz_id (id, name, contact_number))"
    )
    .in("status", ["active", "greyed_out"])
    .order("saved_at", { ascending: false });

  const items = (data ?? []) as unknown as WalletItem[];

  // crave meter: how many people saved each promo (public aggregate view)
  let craveCounts: Record<string, number> = {};
  const promoIds = [...new Set(items.map((i) => i.promo.id))];
  if (promoIds.length > 0) {
    const { data: counts } = await supabase
      .from("promo_crave_counts")
      .select("promo_id, saves")
      .in("promo_id", promoIds);
    craveCounts = Object.fromEntries((counts ?? []).map((c) => [c.promo_id, Number(c.saves)]));
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 pt-6 lg:px-10">
      <h1 className="display text-3xl italic">Wallet</h1>
      <p className="mt-1 text-sm text-dim">
        Saved deals. Redeem in person; show your screen at the counter.
      </p>
      <WalletList initialItems={items} craveCounts={craveCounts} />
    </main>
  );
}
