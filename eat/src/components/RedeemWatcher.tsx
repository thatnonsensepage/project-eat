"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Watches the wallet_save row; when staff confirms (status -> removed), celebrate. */
export default function RedeemWatcher({ saveId }: { saveId: string }) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`redeem-${saveId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallet_save", filter: `id=eq.${saveId}` },
        (payload) => {
          if ((payload.new as { status: string }).status === "removed") setConfirmed(true);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [saveId]);

  if (!confirmed) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center">
      <p className="display text-5xl">Done.</p>
      <p className="mt-3 text-dim">Redeemed. Enjoy it — you earned nothing, but you did walk here.</p>
      <a href="/" className="mt-8 rounded-full bg-accent px-6 py-2.5 font-medium text-bg">
        Back to the grid
      </a>
    </div>
  );
}
