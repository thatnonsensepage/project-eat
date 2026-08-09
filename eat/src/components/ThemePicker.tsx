"use client";

import { useState, useTransition } from "react";
import { setBizTheme } from "@/app/actions";

const THEMES: { id: string; label: string; blurb: string }[] = [
  { id: "bone", label: "bone", blurb: "the house style. calm. classy." },
  { id: "minimal", label: "minimal", blurb: "even more nothing." },
  { id: "funny", label: "funny", blurb: "comic sans. zero shame." },
  { id: "cringe", label: "cringe", blurb: "~*~ sParKLeS ~*~ you were warned." },
  { id: "dark", label: "dark", blurb: "moody. the food glows." },
  { id: "kopitiam", label: "kopitiam", blurb: "marble table energy." },
  { id: "y2k", label: "y2k", blurb: "best viewed in 800×600." },
];

export default function ThemePicker({
  bizId,
  current,
}: {
  bizId: string;
  current: string;
}) {
  const [selected, setSelected] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    const prev = selected;
    setSelected(id);
    startTransition(async () => {
      const res = await setBizTheme(bizId, id);
      if (!res.ok) {
        setSelected(prev);
        setError(res.error);
        setTimeout(() => setError(null), 2500);
      }
    });
  }

  return (
    <div className="mt-8 border border-line bg-card p-4">
      <p className="mono-label text-dim">your page, your vibe</p>
      <p className="mt-1 text-sm text-dim">
        Pick how customers see your page. Choose wisely, or don&apos;t — that&apos;s the point.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            disabled={pending}
            title={t.blurb}
            className={`mono-label rounded-full border px-4 py-2 transition-colors disabled:opacity-50 ${
              selected === t.id
                ? "border-accent bg-accent text-bg"
                : "border-line hover:bg-ink hover:text-bg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mono-label mt-3 text-faint">
        {THEMES.find((t) => t.id === selected)?.blurb}
      </p>
      {error && <p className="mt-2 text-sm text-accent">{error}</p>}
    </div>
  );
}
