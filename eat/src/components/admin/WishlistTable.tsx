"use client";

import { useTransition } from "react";
import { clearWishlistTerm } from "@/app/admin/actions";

export type WishRow = { term: string; count: number; latest: string };

export default function WishlistTable({ wishes }: { wishes: WishRow[] }) {
  const [, startTransition] = useTransition();

  if (wishes.length === 0) {
    return (
      <p className="text-sm text-faint">
        Empty. Every craving found a home, or nobody&apos;s wishing yet.
      </p>
    );
  }

  return (
    <div>
      {wishes.map((w) => (
        <div
          key={w.term}
          className="flex items-center justify-between border-b border-dotted border-line/50 py-3"
        >
          <span className="min-w-0">
            <span className="block truncate">{w.term}</span>
            <span className="mono-label mt-0.5 block text-faint">
              last wished {new Date(w.latest).toLocaleDateString("en-MY")}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-4">
            <span className="mono-label text-dim">
              ×{w.count} wish{w.count === 1 ? "" : "es"}
            </span>
            <button
              onClick={() => startTransition(() => clearWishlistTerm(w.term).then(() => {}))}
              className="mono-label text-faint hover:text-accent"
              title="sourced / dismissed"
            >
              clear ×
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
