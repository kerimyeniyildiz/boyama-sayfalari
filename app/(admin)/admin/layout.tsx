import type { Metadata } from "next";

import { AdminShell } from "@/components/layout/admin-shell";

export const metadata: Metadata = {
  title: {
    absolute: "Yönetici Paneli"
  }
};

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
