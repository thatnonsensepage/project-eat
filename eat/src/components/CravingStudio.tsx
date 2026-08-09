"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitWish } from "@/app/actions";
import type { GridPromo, PromoStatus } from "@/lib/types";
import PromoCard from "./PromoCard";

type CravingEntry = { id: number; query: string };

const OPENERS = [
  "Your stomach called. Twice.",
  "Hunger is temporary. Regret is forever.",
  "Somewhere nearby, your dinner is getting cold.",
  "We found the deals. Walking is on you.",
];

export default function CravingStudio({
  allPromos,
  savedPromoIds,
  categories,
}: {
  allPromos: GridPromo[];
  savedPromoIds: string[];
  categories: string[];
}) {
  const [promos, setPromos] = useState(allPromos);
  const [cravings, setCravings] = useState<CravingEntry[]>([]);
  const [input, setInput] = useState("");
  const [popped, setPopped] = useState<Record<string, number>>({});
  // deterministic on server, randomized after mount (avoids hydration mismatch)
  const [opener, setOpener] = useState(OPENERS[0]);
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    setOpener(OPENERS[Math.floor(Math.random() * OPENERS.length)]);
  }, []);
  const nextId = useRef(1);
  // block persisting until the restore effect has run, or a remount wipes storage
  const hydrated = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // suggestion chips: admin categories + whatever the live promos are actually tagged
  // with, shuffled fresh per visit (after mount, so SSR markup stays deterministic)
  useEffect(() => {
    const fromPromos = allPromos
      .filter((p) => p.status === "live")
      .flatMap((p) => [...p.tags, ...p.cuisine_tags]);
    const merged = [...new Set([...categories, ...fromPromos].map((t) => t.toLowerCase()))];
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }
    setTags(merged);
  }, [categories, allPromos]);

  // restore palette, then honor ?q= links (e.g. tag clicks from biz pages)
  useEffect(() => {
    let restored: string[] = [];
    try {
      const raw = localStorage.getItem("eat-palette");
      if (raw) {
        restored = JSON.parse(raw) as string[];
        setCravings(restored.map((q) => ({ id: nextId.current++, query: q })));
      }
    } catch {}
    const q = new URLSearchParams(window.location.search).get("q")?.trim().toLowerCase();
    if (q && !restored.includes(q)) {
      setCravings((prev) =>
        prev.some((c) => c.query === q) ? prev : [...prev, { id: nextId.current++, query: q }]
      );
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem("eat-palette", JSON.stringify(cravings.map((c) => c.query)));
  }, [cravings]);

  // live counters + status flips for every card on the page
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("grid-promos")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "promo" },
        (payload) => {
          const row = payload.new as { id: string; claimed_count: number; status: PromoStatus };
          setPromos((prev) =>
            prev.map((p) =>
              p.id === row.id ? { ...p, claimed_count: row.claimed_count, status: row.status } : p
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

  function activateCraving(q: string) {
    if (!cravings.some((c) => c.query === q)) {
      setCravings((prev) => [...prev, { id: nextId.current++, query: q }]);
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 150);
  }

  function addCraving() {
    const q = input.trim().toLowerCase();
    if (!q) return;
    setInput("");
    activateCraving(q);
    createClient().rpc("log_event", { p_type: "search_filter", p_meta: { q } });
  }

  function removeCraving(id: number) {
    setCravings((prev) => prev.filter((c) => c.id !== id));
  }

  function bigRandom() {
    if (tags.length === 0) return;
    const pool = tags.filter((c) => !cravings.some((cr) => cr.query === c));
    const pick = (pool.length ? pool : tags)[
      Math.floor(Math.random() * (pool.length ? pool.length : tags.length))
    ];
    activateCraving(pick);
    createClient().rpc("log_event", { p_type: "search_filter", p_meta: { q: pick, via: "big-random" } });
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 lg:px-10">
      {/* ——— opening ——— */}
      <section className="grid gap-10 pt-16 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:pt-24">
        <div>
          <p className="mono-label text-faint">a public service announcement</p>
          <h1 className="display mt-6 text-[clamp(3rem,7vw,6.5rem)] font-light italic leading-[0.95] tracking-tight">
            {opener}
          </h1>
          <p className="mt-8 max-w-md text-sm leading-relaxed text-dim">
            Eat finds what&apos;s worth eating near you — live deals from real
            shops, posted minutes ago, gone in hours. No delivery, no
            middlemen. You walk, you show your phone, you eat well for less.
          </p>
        </div>
        <div className="relative hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.jpg"
            alt="Something worth walking for"
            className="h-full max-h-[480px] w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        </div>
      </section>

      {/* ——— the box ——— */}
      <section className="mt-24 lg:mt-32">
        <div className="border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-6 py-3">
            <span className="mono-label text-dim">the only question that matters</span>
            <span className="mono-label text-faint">
              {cravings.length} craving{cravings.length === 1 ? "" : "s"} on your palette
            </span>
          </div>
          <div className="px-6 py-12 lg:px-12 lg:py-20">
            <label htmlFor="craving" className="display block text-[clamp(2rem,5vw,4.5rem)] italic leading-tight">
              What are you craving today?
            </label>
            <div className="mt-8 flex items-end gap-6 border-b-2 border-line pb-3">
              <input
                id="craving"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCraving()}
                placeholder="type it. anything. we'll look."
                className="craving-input w-full bg-transparent text-2xl outline-none lg:text-4xl"
                autoComplete="off"
              />
              <button
                onClick={addCraving}
                disabled={!input.trim()}
                className="mono-label shrink-0 rounded-full bg-ink px-8 py-4 text-bg transition-colors hover:bg-accent disabled:opacity-30"
              >
                Add to palette →
              </button>
            </div>
            <p className="mono-label mt-4 text-faint">
              no menus. no categories. your palette, your rules.
            </p>

            {/* ——— what other cravers crave ——— */}
            {tags.length > 0 && (
              <div className="mt-12 border-t border-dotted border-line pt-8">
                <p className="mono-label text-dim">what other cravers crave?</p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {tags.map((c) => (
                    <button
                      key={c}
                      onClick={() => activateCraving(c)}
                      className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-ink hover:text-bg"
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  onClick={bigRandom}
                  className="display mt-10 block w-full border-4 border-ink px-8 py-8 text-center text-[clamp(2rem,5vw,4rem)] italic leading-none transition-colors hover:bg-accent hover:border-accent hover:text-bg"
                >
                  Big Random Button
                  <sup className="mono-label ml-2 align-super not-italic">NTM</sup>
                </button>
                <p className="mono-label mt-3 text-center text-faint">
                  for the undecided. NTM = not trademark. we checked.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ——— the palette ——— */}
      {cravings.length > 0 && (
        <section className="mt-14">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mono-label text-faint">palette:</span>
            {cravings.map((c) => (
              <button
                key={c.id}
                onClick={() => removeCraving(c.id)}
                className="group rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-ink hover:text-bg"
                title="remove"
              >
                {c.query} <span className="text-faint group-hover:text-bg">×</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ——— results, appended in order of craving ——— */}
      <div className="pb-32">
        {cravings.map((c, idx) => (
          <CravingSection
            key={c.id}
            index={idx}
            query={c.query}
            promos={matchPromos(promos, c.query)}
            savedPromoIds={savedPromoIds}
            popped={popped}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}

function CravingSection({
  index,
  query,
  promos,
  savedPromoIds,
  popped,
}: {
  index: number;
  query: string;
  promos: GridPromo[];
  savedPromoIds: string[];
  popped: Record<string, number>;
}) {
  const [wished, setWished] = useState(false);
  const [pending, startTransition] = useTransition();

  function wishIt() {
    startTransition(async () => {
      const res = await submitWish(query);
      if (res.ok) setWished(true);
    });
  }

  return (
    <section className="mt-20">
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="display text-3xl italic lg:text-4xl">{query}</h2>
        <span className="mono-label text-faint">
          craving {String(index + 1).padStart(2, "0")} · {promos.length} found nearby
        </span>
      </div>

      {promos.length === 0 ? (
        <div className="mt-8 max-w-md">
          <p className="text-sm text-dim">
            Nothing live for “{query}” right now. Either you invented a dish, or
            the shops haven&apos;t caught up with your taste. Try another word —
            the palette forgives.
          </p>
          {wished ? (
            <p className="mono-label mt-4 text-ok">
              <span aria-hidden="true">★</span> wished. we&apos;ll go find someone who makes it.
            </p>
          ) : (
            <button
              onClick={wishIt}
              disabled={pending}
              className="mono-label mt-4 rounded-full border border-line px-5 py-2.5 transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
            >
              {pending ? "…" : "wish for it →"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {promos.map((p, i) => (
            <div key={p.id} className="card-in" style={{ animationDelay: `${Math.min(i * 70, 420)}ms` }}>
              <PromoCard
                promo={p}
                saved={savedPromoIds.includes(p.id)}
                justUpdated={popped[p.id]}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Loose match: every whitespace token must hit somewhere in the promo's text. */
function matchPromos(promos: GridPromo[], query: string): GridPromo[] {
  const tokens = query.split(/\s+/).filter(Boolean);
  return promos.filter((p) => {
    if (p.status !== "live") return false;
    const hay = [p.item_name, p.description ?? "", p.biz_name, p.tags.join(" "), p.cuisine_tags.join(" ")]
      .join(" ")
      .toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}
