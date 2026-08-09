import Link from "next/link";

export default function BizLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <Link href="/biz" className="display text-lg">
          Eat <span className="text-xs text-faint">for business</span>
        </Link>
        <nav className="flex gap-4 text-sm text-dim">
          <Link href="/biz/promos/new" className="hover:text-ink">+ Promo</Link>
          <Link href="/biz/redeem" className="hover:text-ink">Redeem</Link>
          <Link href="/" className="text-faint hover:text-ink">exit</Link>
        </nav>
      </header>
      <div className="px-5 py-6">{children}</div>
    </div>
  );
}
