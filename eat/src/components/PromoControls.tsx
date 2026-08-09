"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restockPromo, setPromoStatus } from "@/app/actions";
import type { PromoStatus } from "@/lib/types";

export default function PromoControls({
  promoId,
  status,
}: {
  promoId: string;
  status: PromoStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [restocking, setRestocking] = useState(false);
  const [amount, setAmount] = useState("10");

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  if (restocking) {
    return (
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-16 rounded-lg border border-line bg-raised px-2 py-1.5 text-center text-sm"
        />
        <button
          disabled={pending}
          onClick={() => run(() => restockPromo(promoId, parseInt(amount) || 0))}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-50"
        >
          Add
        </button>
        <button onClick={() => setRestocking(false)} className="text-xs text-faint">
          cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={() => router.push(`/biz/promos/${promoId}/edit`)}
        className="rounded-full border border-line px-3 py-1.5 text-xs text-dim"
      >
        Edit
      </button>
      {(status === "exhausted" || status === "expired") && (
        <button
          onClick={() => setRestocking(true)}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-bg"
        >
          Restock
        </button>
      )}
      {status === "live" && (
        <button
          disabled={pending}
          onClick={() => run(() => setPromoStatus(promoId, "paused"))}
          className="rounded-full border border-line px-3 py-1.5 text-xs text-dim disabled:opacity-50"
        >
          Pause
        </button>
      )}
      {(status === "paused" || status === "draft") && (
        <button
          disabled={pending}
          onClick={() => run(() => setPromoStatus(promoId, "live"))}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-50"
        >
          Go live
        </button>
      )}
    </div>
  );
}
