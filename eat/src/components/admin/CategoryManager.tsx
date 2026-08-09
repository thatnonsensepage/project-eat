"use client";

import { useState, useTransition } from "react";
import { addCategory, deleteCategory, toggleCategory } from "@/app/admin/actions";

export type Category = {
  id: string;
  label: string;
  slug: string;
  active: boolean;
  sort: number;
};

export default function CategoryManager({ categories }: { categories: Category[] }) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!label.trim()) return;
    startTransition(async () => {
      const res = await addCategory(label);
      if (res.ok) {
        setLabel("");
      } else {
        setError(res.error);
        setTimeout(() => setError(null), 2500);
      }
    });
  }

  return (
    <div>
      <div className="flex items-end gap-3 border-b-2 border-line pb-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="new category. e.g. cendol."
          className="w-full bg-transparent text-lg outline-none"
          autoComplete="off"
        />
        <button
          onClick={add}
          disabled={pending || !label.trim()}
          className="mono-label shrink-0 rounded-full bg-ink px-5 py-2.5 text-bg hover:bg-accent disabled:opacity-40"
        >
          Add →
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-accent">{error}</p>}

      <div className="mt-4">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border-b border-dotted border-line/50 py-3"
          >
            <span className={c.active ? "" : "text-faint line-through"}>{c.label}</span>
            <span className="flex items-center gap-4">
              <button
                onClick={() => startTransition(() => toggleCategory(c.id, !c.active).then(() => {}))}
                className="mono-label text-dim hover:text-ink"
              >
                {c.active ? "hide" : "show"}
              </button>
              <button
                onClick={() => startTransition(() => deleteCategory(c.id).then(() => {}))}
                className="mono-label text-faint hover:text-accent"
              >
                delete ×
              </button>
            </span>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="py-3 text-sm text-faint">No categories. The cravers have nothing to crave.</p>
        )}
      </div>
    </div>
  );
}
