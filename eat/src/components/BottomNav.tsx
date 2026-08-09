"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Deals", glyph: "◉" },
  { href: "/wallet", label: "Wallet", glyph: "▤" },
  { href: "/me", label: "You", glyph: "◌" },
];

export default function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/biz") || path.startsWith("/login")) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-line bg-raised/95 backdrop-blur">
      <div className="flex">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs tracking-wide ${
                active ? "text-accent" : "text-dim"
              }`}
            >
              <span className="text-base leading-none">{it.glyph}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
