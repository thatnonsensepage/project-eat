import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dealBadge, timeLeft, quotaLine } from "@/lib/format";
import SaveButton from "@/components/SaveButton";
import type { DealType, PromoStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: promo } = await supabase
    .from("promo")
    .select("*, biz(id, name, tagline, halal, contact_number, photos, theme)")
    .eq("id", id)
    .maybeSingle();
  if (!promo) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let saved = false;
  if (user) {
    const { data: save } = await supabase
      .from("wallet_save")
      .select("id")
      .eq("promo_id", id)
      .eq("status", "active")
      .maybeSingle();
    saved = !!save;
  }

  const biz = promo.biz as {
    id: string;
    name: string;
    tagline: string | null;
    halal: boolean;
    contact_number: string | null;
    photos: string[];
    theme: string;
  };
  const dead = promo.status !== "live";
  const photo = (promo.photo as string | null) ?? biz.photos?.[0];

  return (
    <div data-biz-theme={biz.theme ?? "bone"} className="theme-page pb-24">
    <main>
      <div className={`relative h-56 bg-raised ${dead ? "card-dead" : ""}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={promo.item_name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="display text-7xl text-line select-none">食</span>
          </div>
        )}
        <Link
          href="/"
          className="absolute left-4 top-4 rounded-full bg-bg/70 px-3 py-1.5 text-sm backdrop-blur"
        >
          ← back
        </Link>
      </div>

      <div className="px-5 pt-5">
        <div className="inline-block rounded-lg bg-accent px-3 py-1 font-semibold text-bg">
          {dealBadge(promo.deal_type as DealType, promo.deal_value)}
        </div>
        <h1 className="mt-3 text-3xl">{promo.item_name}</h1>
        <Link href={`/b/${biz.id}`} className="mt-1 block text-dim hover:text-ink">
          {biz.name}
          {biz.halal && <span className="ml-2 text-xs text-ok">halal</span>}
        </Link>

        {promo.description && <p className="mt-4 text-dim">{promo.description}</p>}

        <div className="mt-5 flex items-center gap-3 text-sm text-faint">
          <span>{quotaLine(promo.claimed_count, promo.quota) || "no one has claimed this yet"}</span>
          <span>·</span>
          <span>{timeLeft(promo.valid_to)}</span>
        </div>

        <div className="mt-8">
          {dead ? (
            <p className="rounded-xl border border-line bg-raised p-4 text-center text-dim">
              {(promo.status as PromoStatus) === "exhausted"
                ? "All claimed. Habis. Bookmark the shop — we'll mention it if they restock."
                : "This one got away."}
            </p>
          ) : (
            <SaveButton promoId={promo.id} saved={saved} />
          )}
        </div>
      </div>
    </main>
    </div>
  );
}
