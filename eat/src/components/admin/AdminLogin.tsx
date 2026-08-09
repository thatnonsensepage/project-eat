"use client";

import { useState, useTransition } from "react";
import { adminLogin } from "@/app/admin/actions";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!pw) return;
    startTransition(async () => {
      const res = await adminLogin(pw);
      if (!res.ok) {
        setError(res.error);
        setTimeout(() => setError(null), 2500);
      }
    });
  }

  return (
    <div className="mx-auto mt-24 max-w-sm border border-line bg-card p-8">
      <p className="mono-label text-faint">backend · staff only</p>
      <h1 className="display mt-2 text-3xl italic">The back room.</h1>
      <p className="mt-2 text-sm text-dim">If you have to ask, it&apos;s not for you.</p>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="password"
        className="mt-6 w-full border-b-2 border-line bg-transparent pb-2 text-lg outline-none"
        autoComplete="off"
      />
      <button
        onClick={submit}
        disabled={pending || !pw}
        className="mono-label mt-6 w-full rounded-full bg-ink py-3 text-bg transition-colors hover:bg-accent disabled:opacity-40"
      >
        {pending ? "…" : "Enter →"}
      </button>
      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </div>
  );
}
