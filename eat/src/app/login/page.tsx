"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"enter" | "verify">("enter");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function normalizedPhone(): string {
    let p = contact.replace(/[\s-]/g, "");
    if (p.startsWith("01")) p = "+6" + p; // 01x… → +601x…
    if (p.startsWith("60")) p = "+" + p;
    return p;
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      mode === "phone"
        ? await supabase.auth.signInWithOtp({ phone: normalizedPhone() })
        : await supabase.auth.signInWithOtp({ email: contact });
    setBusy(false);
    if (error) setError(error.message);
    else setStage("verify");
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      mode === "phone"
        ? await supabase.auth.verifyOtp({ phone: normalizedPhone(), token: code, type: "sms" })
        : await supabase.auth.verifyOtp({ email: contact, token: code, type: "email" });
    setBusy(false);
    if (error) setError(error.message);
    else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <main className="px-6 pt-16">
      <p className="text-xs uppercase tracking-[0.25em] text-faint">衣食住行</p>
      <h1 className="mt-1 text-4xl">Eat</h1>
      <p className="mt-2 text-sm text-dim">
        Sign in. Thirty seconds, then back to the food.
      </p>

      <div className="mt-8 flex gap-2">
        {(["phone", "email"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setStage("enter");
              setError(null);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
              mode === m ? "border-accent text-accent" : "border-line text-dim"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {stage === "enter" ? (
        <div className="mt-6">
          <input
            type={mode === "phone" ? "tel" : "email"}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={mode === "phone" ? "01x xxx xxxx" : "you@example.com"}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3.5 text-lg outline-none focus:border-accent"
            autoFocus
          />
          <button
            onClick={sendCode}
            disabled={busy || contact.length < 5}
            className="mt-4 w-full rounded-xl bg-accent py-3.5 font-medium text-bg disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-3 text-sm text-dim">
            Code sent to <span className="text-ink">{contact}</span>.
          </p>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full rounded-xl border border-line bg-raised px-4 py-3.5 text-center text-2xl tracking-[0.5em] outline-none focus:border-accent"
            autoFocus
          />
          <button
            onClick={verify}
            disabled={busy || code.length < 6}
            className="mt-4 w-full rounded-xl bg-accent py-3.5 font-medium text-bg disabled:opacity-40"
          >
            {busy ? "Checking…" : "Verify"}
          </button>
          <button onClick={() => setStage("enter")} className="mt-3 w-full text-sm text-faint">
            Different number
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-accent">{error}</p>}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
