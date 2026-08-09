"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { onboardBiz } from "@/app/actions";

/** Five fields, hard cap. The whole point is that this takes a minute. */
export default function OnboardPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [tags, setTags] = useState("");
  const [halal, setHalal] = useState(false);
  const [contact, setContact] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function locate() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Couldn't get location. Enable location services and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function submit() {
    if (!coords) {
      setError("Set your location — stand in the shop and tap the button.");
      return;
    }
    startTransition(async () => {
      const res = await onboardBiz({
        name,
        tagline,
        tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        halal,
        lat: coords.lat,
        lng: coords.lng,
        contact,
      });
      if (res.ok) router.push("/biz");
      else setError(res.error);
    });
  }

  return (
    <main className="mx-auto max-w-md">
      <h1 className="text-2xl">Your business, on Eat</h1>
      <p className="mt-1 text-sm text-dim">Five fields. That&apos;s the whole form.</p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Restoran Contoh" />
        </Field>
        <Field label={`Tagline (${60 - tagline.length} left)`}>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value.slice(0, 60))}
            className={inputCls}
            placeholder="One line. Make it count."
          />
        </Field>
        <Field label="Cuisine tags (comma-separated)">
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="chinese, noodles, dinner" />
          <label className="mt-2 flex items-center gap-2 text-sm text-dim">
            <input type="checkbox" checked={halal} onChange={(e) => setHalal(e.target.checked)} className="accent-[--accent]" />
            Halal
          </label>
        </Field>
        <Field label="Location">
          <button
            onClick={locate}
            disabled={locating}
            className={`w-full rounded-xl border py-3 text-sm ${
              coords ? "border-ok text-ok" : "border-line text-dim"
            }`}
          >
            {locating ? "Locating…" : coords ? "Location set ✓" : "Use my current location"}
          </button>
          <p className="mt-1 text-xs text-faint">Stand in the shop when you tap this.</p>
        </Field>
        <Field label="Contact number">
          <input value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls} placeholder="+60…" type="tel" />
        </Field>

        <button
          onClick={submit}
          disabled={pending || !name}
          className="mt-2 w-full rounded-xl bg-accent py-3.5 font-medium text-bg disabled:opacity-40"
        >
          {pending ? "Creating…" : "Open for business"}
        </button>
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-raised px-4 py-3 outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-widest text-faint">{label}</label>
      {children}
    </div>
  );
}
