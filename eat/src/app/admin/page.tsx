import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminLogout } from "./actions";
import AdminLogin from "@/components/admin/AdminLogin";
import BizTable, { type AdminBiz } from "@/components/admin/BizTable";
import CategoryManager, { type Category } from "@/components/admin/CategoryManager";
import WishlistTable, { type WishRow } from "@/components/admin/WishlistTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="px-6">
        <AdminLogin />
      </main>
    );
  }

  const supabase = createAdminClient();
  const [{ data: bizs }, { data: cats }, { data: wishes }] = await Promise.all([
    supabase
      .from("biz")
      .select("id, name, status, theme, cuisine_tags, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("food_category").select("id, label, slug, active, sort").order("sort"),
    supabase.from("wishlist").select("term, created_at").order("created_at", { ascending: false }),
  ]);

  // group wishlist by term
  const grouped = new Map<string, WishRow>();
  for (const w of wishes ?? []) {
    const g = grouped.get(w.term);
    if (g) {
      g.count += 1;
    } else {
      grouped.set(w.term, { term: w.term, count: 1, latest: w.created_at });
    }
  }
  const wishRows = [...grouped.values()].sort((a, b) => b.count - a.count);

  return (
    <main className="mx-auto max-w-[1100px] px-6 pb-32 pt-10 lg:px-10">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="mono-label text-faint">backend · the back room</p>
          <h1 className="display mt-1 text-4xl italic">Mission control.</h1>
          <p className="mt-2 text-sm text-dim">
            For Dada and koko. Everyone else, the exit is the same door you came in.
          </p>
        </div>
        <form action={adminLogout}>
          <button className="mono-label text-faint hover:text-ink">exit →</button>
        </form>
      </div>

      <section className="mt-14">
        <h2 className="mono-label border-b border-line pb-2 text-dim">
          businesses · {(bizs ?? []).length}
        </h2>
        <div className="mt-4">
          <BizTable bizs={(bizs ?? []) as AdminBiz[]} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mono-label border-b border-line pb-2 text-dim">
          food categories · feeds &ldquo;what other cravers crave&rdquo; + big random
        </h2>
        <div className="mt-4">
          <CategoryManager categories={(cats ?? []) as Category[]} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mono-label border-b border-line pb-2 text-dim">
          wishlist · what cravers wanted and couldn&apos;t have
        </h2>
        <div className="mt-4">
          <WishlistTable wishes={wishRows} />
        </div>
      </section>
    </main>
  );
}
