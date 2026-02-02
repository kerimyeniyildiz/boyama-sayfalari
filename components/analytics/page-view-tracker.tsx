"use client";

import { useEffect } from "react";

type PageViewTrackerProps = {
  slug: string;
};

export function PageViewTracker({ slug }: PageViewTrackerProps) {
  useEffect(() => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return;
    }

    const storageKey = `viewed:${normalizedSlug}`;

    try {
      if (sessionStorage.getItem(storageKey)) {
        return;
      }
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage kullanÄ±lamayabilir, yine de event gÃ¶nder.
    }

    const url = `/api/view/${encodeURIComponent(normalizedSlug)}`;

    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const payload = new Blob([], { type: "application/json" });
      navigator.sendBeacon(url, payload);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: true
    }).catch(() => undefined);
  }, [slug]);

  return null;
}
