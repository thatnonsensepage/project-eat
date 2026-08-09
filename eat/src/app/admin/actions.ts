"use server";

import { revalidatePath } from "next/cache";
import { grantAdmin, isAdmin, revokeAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

async function guard(): Promise<ActionResult | null> {
  if (!(await isAdmin())) return { ok: false, error: "not admin" };
  return null;
}

export async function adminLogin(password: string): Promise<ActionResult> {
  const ok = await grantAdmin(password);
  if (!ok) return { ok: false, error: "wrong password. nice try." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  await revokeAdmin();
  revalidatePath("/admin");
}

export async function addCategory(label: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const clean = label.trim().toLowerCase();
  if (!clean) return { ok: false, error: "empty label" };
  const slug = clean.replace(/\s+/g, "-").replace(/[^a-z0-9\-一-鿿]/g, "");
  const supabase = createAdminClient();
  const { data: max } = await supabase
    .from("food_category")
    .select("sort")
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("food_category")
    .insert({ label: clean, slug, sort: (max?.sort ?? 0) + 1 });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleCategory(id: string, active: boolean): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase.from("food_category").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase.from("food_category").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function setBizStatus(
  id: string,
  status: "pending" | "active" | "paused"
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase.from("biz").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function clearWishlistTerm(term: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const supabase = createAdminClient();
  const { error } = await supabase.from("wishlist").delete().eq("term", term);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
