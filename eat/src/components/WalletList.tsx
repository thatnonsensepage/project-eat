"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearWallet, unsavePromo } from "@/app/actions";
import { dealBadge, timeLeft } from "@/lib/format";
import type { WalletItem, WalletStatus } from "@/lib/types";

// saves at which the crave meter maxes out ("hot")
const CRAVE_HOT = 20;

export default function WalletList({
  initialItems,
  craveCounts,
}: {
  initialItems: WalletItem[];
  craveCounts: Record<string, number>;
}) {
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();

  // live grey-out: watch my own wallet rows die in place
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("my-wallet")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallet_save" },
        (payload) => {
          const row = payload.new as { id: string; status: WalletStatus };
          setItems((prev) =>
            row.status === "removed"
              ? prev.filter((i) => i.id !== row.id)
              : prev.map((i) => (i.id === row.id ? { ...i, status: row.status } : i))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const active = items.filter((i) => i.status === "active");
  const greyed = items.filter((i) => i.status === "greyed_out");

  if (items.length === 0) {
    return (
      <div className="mt-20 text-center">
        <p className="display text-2xl text-dim">Nothing saved.</p>
        <p className="mt-2 text-sm text-faint">The deals are out there; you are here.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-6 py-2.5 font-medium text-bg">
          Browse deals
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((i) => (
          <Card
            key={i.id}
            item={i}
            craves={craveCounts[i.promo.id] ?? 0}
            onRemove={(id) =>
              startTransition(async () => {
                const res = await unsavePromo(id);
                if (res.ok) setItems((prev) => prev.filter((x) => x.id !== id));
              })
            }
          />
        ))}
      </div>

      {greyed.length > 0 && (
        <>
          <h2 className="mono-label mt-10 text-faint">Gone, not forgotten</h2>
          <p className="mt-1 text-xs text-faint">These expired. They leave on their own in 12 hours.</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {greyed.map((i) => (
              <div key={i.id} className="card-dead">
                <Card item={i} craves={craveCounts[i.promo.id] ?? 0} />
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() =>
          startTransition(async () => {
            const res = await clearWallet();
            if (res.ok) setItems([]);
          })
        }
        disabled={pending}
        className="mt-10 w-full border border-line py-3 text-sm text-faint hover:text-dim disabled:opacity-50"
      >
        Clear everything
      </button>
    </div>
  );
}

function Card({
  item,
  craves,
  onRemove,
}: {
  item: WalletItem;
  craves: number;
  onRemove?: (id: string) => void;
}) {
  const p = item.promo;
  const dead = item.status !== "active";
  return (
    <article className="flex h-full flex-col border border-line bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div className="min-w-0">
          <Link href={`/p/${p.id}`}>
            <h3 className="display truncate text-xl italic leading-snug">{p.item_name}</h3>
          </Link>
          <Link href={`/b/${p.biz.id}`} className="mono-label mt-1 block truncate text-dim hover:text-ink">
            {p.biz.name}
          </Link>
        </div>
        <span className="shrink-0 bg-accent px-2.5 py-1 text-sm font-bold text-bg">
          {dealBadge(p.deal_type, p.deal_value)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <CraveMeter craves={craves} />

        <div className="mono-label mt-auto flex items-center justify-between text-faint">
          <span>{dead ? "expired" : timeLeft(p.valid_to)}</span>
          {!dead && onRemove && (
            <button onClick={() => onRemove(item.id)} className="text-faint hover:text-dim">
              remove ×
            </button>
          )}
        </div>

        {!dead && (
          <Link
            href={`/wallet/${item.id}/redeem`}
            className="mono-label block rounded-full bg-ink py-3 text-center text-bg transition-colors hover:bg-accent"
          >
            Redeem →
          </Link>
        )}
      </div>
    </article>
  );
}

/* light on the left, dark on the right; the fill reveals how hot it is */
function CraveMeter({ craves }: { craves: number }) {
  const pct = Math.min(craves / CRAVE_HOT, 1) * 100;
  return (
    <div>
      <div className="mono-label flex items-center justify-between text-faint">
        <span>crave meter</span>
        <span>
          {craves} craver{craves === 1 ? "" : "s"}
          {pct >= 100 ? " · hot" : ""}
        </span>
      </div>
      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-raised">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(pct, craves > 0 ? 6 : 0)}%`,
            background: "linear-gradient(90deg, #f5d0c5, #e8886a, #c0392b, #7b1a10)",
          }}
        />
      </div>
    </div>
  );
}
