import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { timeLeft } from "@/lib/format";
import PromoControls from "@/components/PromoControls";
import ThemePicker from "@/components/ThemePicker";
import type { BizStats, DemandRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BizDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous: demo view of the first active biz. Public promo data only;
  // demand (active saves) needs membership, so it shows as "—".
  if (!user) {
    const { data: demoBiz } = await supabase
      .from("biz")
      .select("id, name")
      .eq("status", "active")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    const { data: promos } = demoBiz
      ? await supabase
          .from("promo")
          .select("id, item_name, status, claimed_count, redeemed_count, quota, valid_to")
          .eq("biz_id", demoBiz.id)
          .order("created_at", { ascending: false })
      : { data: [] };

    return (
      <main>
        <p className="mono-label text-faint">backend · business · demo view</p>
        <h1 className="mt-2 text-2xl italic">{demoBiz?.name ?? "No businesses yet"}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-dim">
          You&apos;re looking at a read-only demo of the first shop in the zone.
          Sign in and onboard your own to post promos and confirm redemptions.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {(promos ?? []).map((r) => (
            <div key={r.id} className="border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="display italic">{r.item_name}</p>
                  <p className="mono-label mt-1 text-faint">
                    {r.status} · {timeLeft(r.valid_to)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="waiting to walk in" value="—" highlight />
                <Stat label="claimed" value={`${r.claimed_count}${r.quota ? `/${r.quota}` : ""}`} />
                <Stat label="redeemed" value={r.redeemed_count} />
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/login?next=/biz"
          className="mono-label mt-8 inline-block rounded-full bg-ink px-6 py-3 text-bg hover:bg-accent"
        >
          Sign in to manage your own →
        </Link>
      </main>
    );
  }

  const { data: membership } = await supabase
    .from("biz_member")
    .select("biz_id, role, biz:biz_id (name, status, theme)")
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/biz/onboard");

  const biz = membership.biz as unknown as { name: string; status: string; theme: string };
  const [{ data }, { data: statsData }] = await Promise.all([
    supabase.rpc("biz_demand", { p_biz: membership.biz_id }),
    supabase.rpc("biz_stats", { p_biz: membership.biz_id }),
  ]);
  const rows = (data ?? []) as DemandRow[];
  const stats = ((statsData as BizStats[] | null)?.[0] ?? {
    active_promos: 0,
    total_promos: 0,
    waiting_now: 0,
    claimed_total: 0,
    redeemed_total: 0,
    redeemed_today: 0,
    bookmarks: 0,
    est_revenue: 0,
  }) as BizStats;

  return (
    <main>
      <p className="mono-label text-faint">backend · business</p>
      <h1 className="mt-2 text-2xl italic">{biz.name}</h1>
      <p className="mt-1 text-sm text-dim">
        Live demand. Each save is someone planning to walk in.
      </p>

      {/* ——— the numbers that matter ——— */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <BigStat label="live promos" value={stats.active_promos} highlight />
        <BigStat label="waiting to walk in" value={stats.waiting_now} highlight />
        <BigStat label="redeemed today" value={stats.redeemed_today} />
        <BigStat
          label="est. revenue, all time"
          value={`RM ${Number(stats.est_revenue).toFixed(2)}`}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <BigStat label="promos ever posted" value={stats.total_promos} small />
        <BigStat label="claims, all time" value={stats.claimed_total} small />
        <BigStat label="redeems, all time" value={stats.redeemed_total} small />
        <BigStat label="bookmarks" value={stats.bookmarks} small />
      </div>
      <p className="mono-label mt-2 text-faint">
        est. revenue = redeems × price after deal. promos without a price count as zero —
        put prices on your items, we can&apos;t read minds.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {rows.length === 0 && (
          <div className="border border-line bg-card p-6 text-center">
            <p className="text-dim">No promos yet.</p>
            <Link
              href="/biz/promos/new"
              className="mono-label mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-bg hover:bg-accent"
            >
              Post your first — under a minute
            </Link>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.promo_id} className="border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="display italic">{r.item_name}</p>
                <p className="mono-label mt-1 text-faint">
                  <StatusDot status={r.status} /> {r.status} · {timeLeft(r.valid_to)}
                </p>
              </div>
              <PromoControls promoId={r.promo_id} status={r.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="waiting to walk in" value={r.active_saves} highlight />
              <Stat label="claimed" value={`${r.claimed_count}${r.quota ? `/${r.quota}` : ""}`} />
              <Stat label="redeemed" value={r.redeemed_count} />
            </div>
          </div>
        ))}
      </div>

      <ThemePicker bizId={membership.biz_id} current={biz.theme ?? "bone"} />
    </main>
  );
}

function BigStat({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`border border-line bg-card ${small ? "p-3" : "p-4"}`}>
      <p className={`display ${small ? "text-xl" : "text-3xl"} ${highlight ? "text-accent" : ""}`}>
        {value}
      </p>
      <p className="mono-label mt-1 text-faint">{label}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-raised p-2.5">
      <p className={`display text-xl ${highlight ? "text-accent" : ""}`}>{value}</p>
      <p className="mono-label mt-0.5 text-faint">{label}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "live" ? "bg-ok" : status === "exhausted" ? "bg-accent" : "bg-dead";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}
