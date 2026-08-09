import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dealBadge, timeLeft } from "@/lib/format";
import BookmarkButton from "@/components/BookmarkButton";
import type { DealType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: biz } = await supabase.from("biz").select("*").eq("id", id).maybeSingle();
  if (!biz) notFound();

  const { data: promos } = await supabase
    .from("promo")
    .select("id, item_name, deal_type, deal_value, valid_to, status")
    .eq("biz_id", id)
    .eq("status", "live")
    .order("created_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bookmarked = false;
  if (user) {
    const { data: bm } = await supabase
      .from("bookmark")
      .select("id")
      .eq("biz_id", id)
      .maybeSingle();
    bookmarked = !!bm;
  }

  const theme = (biz.theme as string) ?? "bone";
  const flavor: Record<string, string> = {
    funny: "this shop chose the funny theme. we respect the confidence.",
    cringe: "~*~ wELcOmE tO oUr PaGe ~*~ (they chose this. not us.)",
    minimal: "",
    dark: "the shop prefers the dark. the food doesn't mind.",
    kopitiam: "est. sometime. marble tables optional.",
    y2k: "best viewed in 800×600. sign our guestbook.",
  };

  return (
    <div data-biz-theme={theme} className="theme-page">
    <main className="mx-auto max-w-[900px] px-5 pt-8 pb-24">
      <Link href="/" className="text-sm text-faint">← back</Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">{biz.name}</h1>
          {biz.tagline && <p className="mt-1 text-dim">{biz.tagline}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {biz.halal && (
              <span className="rounded-full border border-ok px-2 py-0.5 text-xs text-ok">halal</span>
            )}
            {(biz.cuisine_tags as string[]).map((t) => (
              <Link
                key={t}
                href={`/?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-line px-2 py-0.5 text-xs text-dim transition-colors hover:bg-ink hover:text-bg"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
        <BookmarkButton bizId={biz.id} bookmarked={bookmarked} />
      </div>

      {(biz.photos as string[]).length > 0 && (
        <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
          {(biz.photos as string[]).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={p} alt={biz.name} className="h-36 w-52 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <h2 className="mt-8 text-lg">Live now</h2>
      <div className="mt-3 flex flex-col gap-2">
        {(promos ?? []).length === 0 && (
          <p className="text-sm text-faint">
            Nothing live at the moment. Bookmark — you&apos;ll hear about it first.
          </p>
        )}
        {(promos ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/p/${p.id}`}
            className="flex items-center justify-between rounded-xl border border-line bg-card p-4"
          >
            <div>
              <p className="display">{p.item_name}</p>
              <p className="text-xs text-faint">{timeLeft(p.valid_to)}</p>
            </div>
            <span className="rounded-lg bg-accent px-2.5 py-1 text-sm font-semibold text-bg">
              {dealBadge(p.deal_type as DealType, p.deal_value)}
            </span>
          </Link>
        ))}
      </div>

      {biz.contact_number && (
        <p className="mt-8 text-sm text-faint">Call: {biz.contact_number}</p>
      )}

      {flavor[theme] && (
        <p className="mono-label mt-12 text-center text-faint">{flavor[theme]}</p>
      )}
    </main>
    </div>
  );
}
