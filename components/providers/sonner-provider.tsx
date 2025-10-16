"use client";

import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster
      position="bottom-right"
      visibleToasts={1}
      toastOptions={{
        style: {
          background: "#F8FBF9",
          color: "#4A5568",
          border: "1px solid #E0D5E8",
          fontFamily: "var(--font-inter)"
        }
      }}
    />
  );
}
