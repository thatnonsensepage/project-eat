"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setBizStatus } from "@/app/admin/actions";

export type AdminBiz = {
  id: string;
  name: string;
  status: "pending" | "active" | "paused";
  theme: string;
  cuisine_tags: string[];
  created_at: string;
};

const STATUSES = ["pending", "active", "paused"] as const;

export default function BizTable({ bizs }: { bizs: AdminBiz[] }) {
  const [, startTransition] = useTransition();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="mono-label border-b border-line text-faint">
            <th className="py-2 pr-4 font-normal">name</th>
            <th className="py-2 pr-4 font-normal">status</th>
            <th className="py-2 pr-4 font-normal">theme</th>
            <th className="py-2 font-normal">tags</th>
          </tr>
        </thead>
        <tbody>
          {bizs.map((b) => (
            <tr key={b.id} className="border-b border-dotted border-line/50">
              <td className="py-3 pr-4">
                <Link href={`/b/${b.id}`} className="hover:text-accent">
                  {b.name}
                </Link>
              </td>
              <td className="py-3 pr-4">
                <select
                  defaultValue={b.status}
                  onChange={(e) =>
                    startTransition(() =>
                      setBizStatus(b.id, e.target.value as AdminBiz["status"]).then(() => {})
                    )
                  }
                  className="border border-line bg-transparent px-2 py-1"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="mono-label py-3 pr-4 text-dim">{b.theme}</td>
              <td className="py-3 text-dim">{b.cuisine_tags.join(", ")}</td>
            </tr>
          ))}
          {bizs.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-faint">
                No businesses yet. Go outside and charm some aunties.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
