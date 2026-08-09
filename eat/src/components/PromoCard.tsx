"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GridPromo } from "@/lib/types";
import { dealBadge, timeLeft, quotaLine, distanceLabel } from "@/lib/format";
import SaveButton from "./SaveButton";

export default function PromoCard({
  promo,
  saved,
  justUpdated,
}: {
  promo: GridPromo;
  saved: boolean;
  justUpdated?: number;
}) {
  const dead = promo.status !== "live";
  const photo = promo.photo ?? promo.photos?.[0];
  // countdown depends on Date.now(); render only after mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <article
      data-biz-theme={promo.theme ?? "bone"}
      className={`flex h-full flex-col overflow-hidden border border-line bg-card transition-transform duration-300 hover:-translate-y-1 ${
        dead ? "card-dead" : ""
      }`}
    >
      <Link href={`/p/${promo.id}`} className="block">
        <div className="relative flex h-44 items-end border-b border-line bg-raised">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={promo.item_name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="display text-6xl italic text-soft select-none">食</span>
            </div>
          )}
          <div className="relative z-10 m-3 bg-accent px-3 py-1.5 text-sm font-bold text-bg">
            {dealBadge(promo.deal_type, promo.deal_value)}
          </div>
          {dead && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70">
              <span className="display -rotate-6 border-2 border-ink px-4 py-1.5 text-xl uppercase tracking-widest">
                {promo.status === "exhausted" ? "All claimed" : "Gone"}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/p/${promo.id}`}>
              <h3 className="display truncate text-xl italic leading-snug">{promo.item_name}</h3>
            </Link>
            <Link href={`/b/${promo.biz_id}`} className="mono-label mt-1 block truncate text-dim hover:text-ink">
              {promo.biz_name}
              {promo.halal && <span className="ml-2 text-ok">· halal</span>}
            </Link>
          </div>
          {!dead && <SaveButton promoId={promo.id} saved={saved} />}
        </div>

        {promo.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-dim">{promo.description}</p>
        )}

        <div className="mono-label mt-auto flex items-center gap-2 pt-4 text-faint">
          <span key={justUpdated} className={justUpdated ? "count-pop text-dim" : "text-dim"}>
            {quotaLine(promo.claimed_count, promo.quota) || "be the first"}
          </span>
          <span>·</span>
          <span>{mounted ? timeLeft(promo.valid_to) : "…"}</span>
          {promo.distance_m !== null && (
            <>
              <span>·</span>
              <span>{distanceLabel(promo.distance_m)}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
