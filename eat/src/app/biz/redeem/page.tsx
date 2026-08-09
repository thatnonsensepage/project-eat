import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RedeemQueue from "@/components/RedeemQueue";

export const dynamic = "force-dynamic";

export type QueueRow = {
  save_id: string;
  item_name: string;
  deal_type: string;
  deal_value: number | null;
  saved_at: string;
  user_phone: string;
};

export default async function BizRedeemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main>
        <p className="mono-label text-faint">backend · business · redemptions</p>
        <h1 className="mt-2 text-2xl italic">Confirm redemptions</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">
          Staff-only screen. Sign in with an account that belongs to a business
          to see its live queue and confirm customers&apos; redemptions.
        </p>
      </main>
    );
  }

  const { data: membership } = await supabase
    .from("biz_member")
    .select("biz_id")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/biz/onboard");

  const { data } = await supabase.rpc("biz_redeem_queue", { p_biz: membership.biz_id });
  const rows = (data ?? []) as QueueRow[];

  return (
    <main>
      <h1 className="text-2xl">Confirm redemptions</h1>
      <p className="mt-1 text-sm text-dim">
        Customer shows their redeem screen; you match the item and tap confirm. Their screen updates instantly.
      </p>
      <RedeemQueue initialRows={rows} bizId={membership.biz_id} />
    </main>
  );
}
