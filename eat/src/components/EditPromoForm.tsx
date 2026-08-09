"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePromo } from "@/app/actions";
import PhotoUpload from "@/components/PhotoUpload";
import { toLocalInput } from "@/components/NewPromoForm";

export type EditablePromo = {
  id: string;
  biz_id: string;
  item_name: string;
  description: string | null;
  price: number | null;
  valid_from: string;
  valid_to: string;
  quota: number | null;
  tags: string[];
  photo: string | null;
};

export default function EditPromoForm({ promo }: { promo: EditablePromo }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [itemName, setItemName] = useState(promo.item_name);
  const [description, setDescription] = useState(promo.description ?? "");
  const [price, setPrice] = useState(promo.price != null ? String(promo.price) : "");
  const [validFrom, setValidFrom] = useState(toLocalInput(new Date(promo.valid_from)));
  const [validTo, setValidTo] = useState(toLocalInput(new Date(promo.valid_to)));
  const [quota, setQuota] = useState(promo.quota != null ? String(promo.quota) : "");
  const [tags, setTags] = useState(promo.tags.join(", "));
  const [photo, setPhoto] = useState<string | null>(promo.photo);

  function submit() {
    startTransition(async () => {
      const res = await updatePromo({
        promoId: promo.id,
        itemName,
        description,
        price: price ? parseFloat(price) : null,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        quota: quota ? parseInt(quota) : null,
        tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        photo,
      });
      if (res.ok) router.push("/biz");
      else setError(res.error);
    });
  }

  return (
    <main className="mx-auto max-w-md">
      <h1 className="text-2xl">Edit promo</h1>
      <p className="mt-1 text-sm text-dim">Deal type is fixed — post a new promo to change the deal itself.</p>

      <div className="mt-6 flex flex-col gap-5">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full rounded-xl border border-line bg-raised px-4 py-3.5 text-lg outline-none focus:border-accent"
        />

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

        <PhotoUpload bizId={promo.biz_id} value={photo} onChange={setPhoto} />

        <div className="flex gap-3">
          <div className="flex-1">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Quota (blank = unlimited)</p>
            <input
              inputMode="numeric"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 outline-none focus:border-accent"
            />
          </div>
          <div className="flex-[2]">
            <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Tags</p>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-xl border border-line bg-raised px-4 py-2.5 outline-none focus:border-accent"
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={pending || !itemName}
          className="rounded-xl bg-accent py-3.5 font-medium text-bg disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>
    </main>
  );
}
