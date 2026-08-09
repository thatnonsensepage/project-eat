"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : String(e);
  return { ok: false, error: msg.replace(/^.*?exception:\s*/i, "") };
}

// Test-mode: no login wall. First write from a signed-out visitor silently
// creates an anonymous session (requires anonymous sign-ins enabled in Supabase).
async function ensureSession(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ActionResult> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return { ok: true };
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return fail(error.message);
  return { ok: true };
}

export async function savePromo(promoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await ensureSession(supabase);
  if (!session.ok) return session;
  const { error } = await supabase.rpc("save_promo", { p_promo: promoId });
  if (error) return fail(error.message);
  revalidatePath("/wallet");
  return { ok: true };
}

export async function unsavePromo(saveId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unsave_promo", { p_save: saveId });
  if (error) return fail(error.message);
  revalidatePath("/wallet");
  return { ok: true };
}

export async function clearWallet(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_wallet");
  if (error) return fail(error.message);
  revalidatePath("/wallet");
  return { ok: true };
}

export async function confirmRedemption(saveId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_redemption", { p_save: saveId });
  if (error) return fail(error.message);
  revalidatePath("/biz/redeem");
  return { ok: true };
}

export async function restockPromo(promoId: string, add: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("restock_promo", { p_promo: promoId, p_add: add });
  if (error) return fail(error.message);
  revalidatePath("/biz");
  return { ok: true };
}

export async function onboardBiz(form: {
  name: string;
  tagline: string;
  tags: string[];
  halal: boolean;
  lat: number;
  lng: number;
  contact: string;
}): Promise<ActionResult & { bizId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("onboard_biz", {
    p_name: form.name,
    p_tagline: form.tagline,
    p_tags: form.tags,
    p_halal: form.halal,
    p_lat: form.lat,
    p_lng: form.lng,
    p_contact: form.contact,
  });
  if (error) return fail(error.message);
  revalidatePath("/biz");
  return { ok: true, bizId: data as string };
}

export async function createPromo(form: {
  bizId: string;
  itemName: string;
  dealType: string;
  dealValue: number | null;
  description: string;
  price: number | null;
  validFrom: string;
  validTo: string;
  quota: number | null;
  tags: string[];
  photo: string | null;
  goLive: boolean;
}): Promise<ActionResult> {
  if (new Date(form.validTo) <= new Date(form.validFrom)) {
    return { ok: false, error: "end must be after start" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("promo").insert({
    biz_id: form.bizId,
    item_name: form.itemName,
    deal_type: form.dealType,
    deal_value: form.dealValue,
    description: form.description || null,
    price: form.price,
    valid_from: form.validFrom,
    valid_to: form.validTo,
    quota: form.quota,
    tags: form.tags,
    photo: form.photo,
    status: form.goLive ? "live" : "draft",
  });
  if (error) return fail(error.message);
  revalidatePath("/biz");
  revalidatePath("/");
  return { ok: true };
}

export async function updatePromo(form: {
  promoId: string;
  itemName: string;
  description: string;
  price: number | null;
  validFrom: string;
  validTo: string;
  quota: number | null;
  tags: string[];
  photo: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_promo", {
    p_promo: form.promoId,
    p_item_name: form.itemName,
    p_description: form.description,
    p_price: form.price,
    p_valid_from: form.validFrom,
    p_valid_to: form.validTo,
    p_quota: form.quota,
    p_tags: form.tags,
    p_photo: form.photo,
  });
  if (error) return fail(error.message);
  revalidatePath("/biz");
  revalidatePath("/");
  return { ok: true };
}

export async function setPromoStatus(
  promoId: string,
  status: "live" | "paused"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("promo").update({ status }).eq("id", promoId);
  if (error) return fail(error.message);
  revalidatePath("/biz");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleBookmark(bizId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await ensureSession(supabase);
  if (!session.ok) return session;
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "not signed in" };
  const { data: existing } = await supabase
    .from("bookmark")
    .select("id")
    .eq("biz_id", bizId)
    .maybeSingle();
  if (existing) {
    await supabase.from("bookmark").delete().eq("id", existing.id);
  } else {
    await supabase.from("bookmark").insert({ user_id: user.user.id, biz_id: bizId });
    await supabase.rpc("log_event", { p_type: "bookmark", p_biz: bizId });
  }
  revalidatePath(`/b/${bizId}`);
  return { ok: true };
}

// Biz page skin. RLS: only biz members can update their row.
export async function setBizTheme(bizId: string, theme: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("biz").update({ theme }).eq("id", bizId);
  if (error) return fail(error.message);
  revalidatePath(`/b/${bizId}`);
  revalidatePath("/biz");
  return { ok: true };
}

// Zero-result search → wishlist. Anonymous inserts allowed by RLS.
export async function submitWish(term: string): Promise<ActionResult> {
  const clean = term.trim().toLowerCase().slice(0, 80);
  if (!clean) return { ok: false, error: "empty wish" };
  const supabase = await createClient();
  const { error } = await supabase.from("wishlist").insert({ term: clean });
  if (error) return fail(error.message);
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");
  await supabase
    .from("users")
    .update({ status: "soft_deleted", soft_deleted_at: new Date().toISOString() })
    .eq("id", user.user.id);
  await supabase.auth.signOut();
  redirect("/");
}
