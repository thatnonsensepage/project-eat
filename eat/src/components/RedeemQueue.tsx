"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmRedemption } from "@/app/actions";
import { dealBadge } from "@/lib/format";
import type { DealType } from "@/lib/types";
import type { QueueRow } from "@/app/biz/redeem/page";

export default function RedeemQueue({
  initialRows,
}: {
  initialRows: QueueRow[];
  bizId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm(saveId: string) {
    startTransition(async () => {
      const res = await confirmRedemption(saveId);
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.save_id !== saveId));
      } else {
        setError(res.error);
        setTimeout(() => setError(null), 3000);
      }
    });
  }

  return (
    <div className="mt-6">
      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center text-dim">
          <p>No one waiting. They&apos;re on their way — the saves say so.</p>
          <button onClick={() => router.refresh()} className="mt-3 text-sm text-faint underline">
            refresh
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.save_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-4"
            >
              <div className="min-w-0">
                <p className="display truncate">{r.item_name}</p>
                <p className="text-xs text-faint">
                  {dealBadge(r.deal_type as DealType, r.deal_value)} · phone {r.user_phone}
                </p>
              </div>
              <button
                onClick={() => confirm(r.save_id)}
                disabled={pending}
                className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </div>
  );
}
