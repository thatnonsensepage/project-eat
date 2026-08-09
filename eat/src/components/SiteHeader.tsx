"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const path = usePathname();
  if (path.startsWith("/wallet/") && path.endsWith("/redeem")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-baseline gap-6">
          <Link href="/" className="text-xl font-bold uppercase tracking-[0.35em]">
            EAT食
          </Link>
          <span className="mono-label hidden text-faint md:block">
            curate your craving palette
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <PillLink href="/wallet">Wallet</PillLink>
          <PillLink href="/biz">For business</PillLink>
          <PillLink href="/me" solid>
            You →
          </PillLink>
        </nav>
      </div>
    </header>
  );
}

function PillLink({
  href,
  solid,
  children,
}: {
  href: string;
  solid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`mono-label rounded-full border border-line px-5 py-2.5 transition-colors ${
        solid ? "bg-ink text-bg hover:bg-accent hover:border-accent" : "hover:bg-ink hover:text-bg"
      }`}
    >
      {children}
    </Link>
  );
}
