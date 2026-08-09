import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut, deleteAccount } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-6 pt-16">
        <p className="mono-label text-faint">backend · user</p>
        <h1 className="mt-2 text-3xl italic">Nobody, apparently.</h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          You&apos;re browsing signed out. Everything is viewable; saving and
          redeeming need an account.
        </p>
        <Link
          href="/login"
          className="mono-label mt-8 inline-block rounded-full bg-ink px-6 py-3 text-bg hover:bg-accent"
        >
          Sign in →
        </Link>
      </main>
    );
  }

  const { data: memberships } = await supabase
    .from("biz_member")
    .select("biz_id, role, biz:biz_id (name)")
    .eq("user_id", user.id);

  return (
    <main className="mx-auto max-w-lg px-6 pt-12">
      <p className="mono-label text-faint">backend · user</p>
      <h1 className="mt-2 text-3xl italic">You</h1>
      <p className="mono-label mt-2 text-dim">{user.phone || user.email}</p>

      <section className="mt-10">
        <h2 className="mono-label text-faint">Your businesses</h2>
        {(memberships ?? []).length === 0 ? (
          <div className="mt-3 border border-line bg-card p-5">
            <p className="text-sm text-dim">Run a food business? Post deals; hungry people appear.</p>
            <Link
              href="/biz/onboard"
              className="mono-label mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-bg hover:bg-accent"
            >
              Set up in 60 seconds
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {(memberships ?? []).map((m) => (
              <Link
                key={m.biz_id}
                href="/biz"
                className="flex items-center justify-between border border-line bg-card p-4 hover:bg-raised"
              >
                <span className="display italic">{(m.biz as unknown as { name: string }).name}</span>
                <span className="mono-label text-faint">{m.role} →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 flex flex-col gap-3">
        <form action={signOut}>
          <button className="mono-label w-full border border-line py-3.5 text-dim hover:bg-ink hover:text-bg">
            Sign out
          </button>
        </form>
        <form action={deleteAccount}>
          <button className="mono-label w-full border border-soft py-3.5 text-faint hover:border-line">
            Delete account
          </button>
        </form>
        <p className="mono-label text-center text-faint">
          deletion takes effect after a 7-day grace period. no hard feelings.
        </p>
      </section>
    </main>
  );
}
