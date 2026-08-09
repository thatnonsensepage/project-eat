import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dealBadge } from "@/lib/format";
import RedeemWatcher from "@/components/RedeemWatcher";
import type { DealType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RedeemPage({
  params,
}: {
  params: Promise<{ saveId: string }>;
}) {
  const { saveId } = await params;
  const supabase = await createClient();

  const { data: save } = await supabase
    .from("wallet_save")
    .select(
      "id, status, promo:promo_id (id, item_name, deal_type, deal_value, description, biz:biz_id (name))"
    )
    .eq("id", saveId)
    .maybeSingle();
  if (!save || save.status !== "active") notFound();

  const promo = save.promo as unknown as {
    id: string;
    item_name: string;
    deal_type: DealType;
    deal_value: number | null;
    description: string | null;
    biz: { name: string };
  };

  await supabase.rpc("log_event", { p_type: "redeem_start", p_promo: promo.id });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-faint">show this at the counter</p>

      <div className="mt-6 w-full rounded-3xl border-2 border-accent bg-card p-8">
        <p className="display text-sm text-dim">{promo.biz.name}</p>
        <h1 className="mt-2 text-3xl leading-tight">{promo.item_name}</h1>
        <div className="mx-auto mt-5 inline-block rounded-xl bg-accent px-5 py-2.5 text-2xl font-bold text-bg">
          {dealBadge(promo.deal_type, promo.deal_value)}
        </div>
        {promo.description && <p className="mt-4 text-sm text-dim">{promo.description}</p>}
        <p className="mt-6 text-xs text-faint">
          Staff: confirm this in your dashboard. The screen updates when you do.
        </p>
      </div>

      <RedeemWatcher saveId={save.id} />

      <Link href="/wallet" className="mt-8 text-sm text-faint">
        ← back to wallet
      </Link>
    </main>
  );
}
