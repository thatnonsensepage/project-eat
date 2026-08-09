"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPromo } from "@/app/actions";
import PhotoUpload from "@/components/PhotoUpload";
import type { DealType } from "@/lib/types";

const DEAL_TYPES: { value: DealType; label: string; needsValue: boolean; hint: string }[] = [
  { value: "percent_off", label: "% off", needsValue: true, hint: "e.g. 30" },
  { value: "flat_off", label: "RM off", needsValue: true, hint: "e.g. 5" },
  { value: "bogo", label: "Buy 1 Free 1", needsValue: false, hint: "" },
  { value: "bundle", label: "Set price", needsValue: true, hint: "e.g. 15" },
  { value: "mystery", label: "Mystery", needsValue: true, hint: "price, e.g. 10" },
];

/** datetime-local wants local time without timezone: yyyy-MM-ddTHH:mm */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The 60-second flow. Every field earns its place or gets cut. */
export default function NewPromoForm({ bizId }: { bizId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [dealType, setDealType] = useState<DealType>("percent_off");
  const [dealValue, setDealValue] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [validFrom, setValidFrom] = useState(() => toLocalInput(new Date()));
  const [validTo, setValidTo] = useState(() => toLocalInput(new Date(Date.now() + 4 * 3600_000)));
  const [quota, setQuota] = useState("");
  const [tags, setTags] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const selected = DEAL_TYPES.find((d) => d.value === dealType)!;

  function submit(goLive: boolean) {
    startTransition(async () => {
      const res = await createPromo({
        bizId,
        itemName,
        dealType,
        dealValue: selected.needsValue ? parseFloat(dealValue) || null : null,
        description,
        price: price ? parseFloat(price) : null,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        quota: quota ? parseInt(quota) : null,
        tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        photo,
        goLive,
      });
      if (res.ok) router.push("/biz");
      else setError(res.error);
    });
  }

  return (
    <main className="mx-auto max-w-md">
      <h1 className="text-2xl">New promo</h1>
      <p className="mt-1 text-sm text-dim">Aim for under a minute. We timed it.</p>

      <div className="mt-6 flex flex-col gap-5">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="What's the dish?"
          className="w-full rounded-xl border border-line bg-raised px-4 py-3.5 text-lg outline-none focus:border-accent"
          autoFocus
        />

        <div>
          <div className="flex flex-wrap gap-2">
            {DEAL_TYPES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDealType(d.value)}
                className={`rounded-full border px-3.5 py-1.5 text-sm ${
                  dealType === d.value ? "border-accent bg-accent-soft text-accent" : "border-line text-dim"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {selected.needsValue && (
            <input
              inputMode="decimal"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder={selected.hint}
              className="mt-3 w-32 rounded-xl border border-line bg-raised px-4 py-2.5 outline-none focus:border-accent"
            />
          )}
        </div>

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 100))}
          placeholder="One line about it (optional)"
          className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm outline-none focus:border-accent"
        />

        <div>
          <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">
            Normal price, RM — powers your revenue stats
          </p>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 12.50"
            className="w-40 rounded-xl border border-line bg-raised px-4 py-2.5 outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Starts</p>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Ends</p>
            <input
              type="datetime-local"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <PhotoUpload bizId={bizId} value={photo} onChange={setPhoto} />

        <div className="flex gap-3">
          <div className="flex-1">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Quota (blank = unlimited)</p>
            <input
              inputMode="numeric"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              placeholder="20"
              className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 outline-none focus:border-accent"
            />
          </div>
          <div className="flex-[2]">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Tags</p>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="lunch, noodles"
              className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          <button
            onClick={() => submit(false)}
            disabled={pending || !itemName}
            className="flex-1 rounded-xl border border-line py-3.5 text-sm text-dim disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            onClick={() => submit(true)}
            disabled={pending || !itemName}
            className="flex-[2] rounded-xl bg-accent py-3.5 font-medium text-bg disabled:opacity-40"
          >
            {pending ? "Posting…" : "Go live now"}
          </button>
        </div>
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>
    </main>
  );
}
