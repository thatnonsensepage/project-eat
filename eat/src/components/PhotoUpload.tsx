"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Uploads to the public promo-photos bucket under <bizId>/<uuid>.<ext>.
// Storage RLS only lets members of that biz write to their folder.
export default function PhotoUpload({
  bizId,
  value,
  onChange,
}: {
  bizId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${bizId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("promo-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("promo-photos").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
  }

  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-widest text-faint">Photo (optional)</p>
      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="promo" className="h-20 w-28 rounded-xl border border-line object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-faint hover:text-dim"
          >
            remove ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-line py-6 text-sm text-dim hover:border-accent disabled:opacity-50"
        >
          {busy ? "uploading…" : "+ add a photo of the dish"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
