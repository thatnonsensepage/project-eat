"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GridPromo, PromoStatus } from "@/lib/types";
import PromoCard from "./PromoCard";

export default function LiveGrid({
  initialPromos,
  savedPromoIds,
  signedIn,
}: {
  initialPromos: GridPromo[];
  savedPromoIds: string[];
  signedIn: boolean;
}) {
  const [promos, setPromos] = useState(initialPromos);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [halalOnly, setHalalOnly] = useState(false);
  const [popped, setPopped] = useState<Record<string, number>>({});

  // one realtime subscription for the whole grid: counters + status flips
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("grid-promos")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "promo" },
        (payload) => {
          const row = payload.new as {
            id: string;
            claimed_count: number;
            status: PromoStatus;
          };
          setPromos((prev) =>
            prev.map((p) =>
              p.id === row.id
                ? { ...p, claimed_count: row.claimed_count, status: row.status }
                : p
            )
          );
          setPopped((prev) => ({ ...prev, [row.id]: Date.now() }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of promos) {
      if (p.status !== "live") continue;
      for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
  }, [promos]);

  const visible = promos.filter((p) => {
    if (p.status !== "live" && !savedPromoIds.includes(p.id)) return false;
    if (halalOnly && !p.halal) return false;
    if (activeTag && !p.tags.includes(activeTag) && !p.cuisine_tags.includes(activeTag))
      return false;
    return true;
  });

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={halalOnly} onClick={() => setHalalOnly(!halalOnly)}>
          Halal
        </Chip>
        {tags.map((t) => (
          <Chip key={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? null : t)}>
            {t}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="display text-2xl text-dim">Quiet out there.</p>
          <p className="mt-2 text-sm text-faint">
            No live deals match. Loosen the filters, or come back hungrier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((p, i) => (
            <div key={p.id} className="card-in" style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}>
              <PromoCard
                promo={p}
                saved={savedPromoIds.includes(p.id)}
                signedIn={signedIn}
                justUpdated={popped[p.id]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm capitalize transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-raised text-dim hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
