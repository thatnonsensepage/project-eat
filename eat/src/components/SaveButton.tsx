"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePromo } from "@/app/actions";

export default function SaveButton({
  promoId,
  saved: initialSaved,
}: {
  promoId: string;
  saved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (saved) {
      router.push("/wallet");
      return;
    }
    startTransition(async () => {
      const res = await savePromo(promoId);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error);
        setTimeout(() => setError(null), 2500);
      }
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={onClick}
        disabled={pending}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          saved
            ? "border border-ok text-ok"
            : "bg-accent text-bg hover:brightness-110"
        }`}
      >
        {pending ? "…" : saved ? "Saved" : "Save"}
      </button>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
