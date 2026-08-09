"use client";

import { useState, useTransition } from "react";
import { toggleBookmark } from "@/app/actions";

export default function BookmarkButton({
  bizId,
  bookmarked: initial,
}: {
  bizId: string;
  bookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await toggleBookmark(bizId);
      if (res.ok) setBookmarked(!bookmarked);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
        bookmarked ? "border-accent text-accent" : "border-line text-dim"
      }`}
    >
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
