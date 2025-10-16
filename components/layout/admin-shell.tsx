"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  FilePlus,
  LayoutDashboard,
  LogOut,
  type LucideIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";

type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Yönetim Paneli", icon: LayoutDashboard },
  { href: "/admin/pages/new", label: "Yeni Sayfa", icon: FilePlus }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-brand-light">
      <header className="border-b border-brand-dark/10 bg-white/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/admin" className="text-lg font-semibold text-brand-dark">
            Yönetim Paneli
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex flex-col gap-10 py-10 lg:flex-row">
        <nav className="flex w-full flex-row gap-3 overflow-auto rounded-2xl border border-brand-dark/10 bg-white p-3 shadow-card lg:h-fit lg:w-64 lg:flex-col">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand text-brand-dark"
                    : "text-brand-dark/70 hover:bg-brand-light/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 space-y-8">{children}</main>
      </div>
    </div>
  );
}
