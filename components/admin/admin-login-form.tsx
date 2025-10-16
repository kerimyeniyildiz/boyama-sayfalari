"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loginSchema } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type LoginValues = z.infer<typeof loginSchema>;

type AdminLoginFormProps = {
  redirectTo?: string;
};

export function AdminLoginForm({ redirectTo }: AdminLoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const handleSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          data?.error ?? "Giriş sırasında beklenmedik bir hata oluştu."
        );
        return;
      }

      router.push(redirectTo ?? "/admin");
      router.refresh();
    });
  });

  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-card">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-brand-dark">
          Yönetici girişi
        </h1>
        <p className="text-sm text-brand-dark/70">
          Admin paneline erişmek için kayıtlı e-posta ve şifrenizi girin.
        </p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            disabled={isPending}
            {...form.register("email")}
          />
          <p className="text-xs text-red-500">
            {form.formState.errors.email?.message}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isPending}
            {...form.register("password")}
          />
          <p className="text-xs text-red-500">
            {form.formState.errors.password?.message}
          </p>
        </div>
        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending || form.formState.isSubmitting}
        >
          {isPending ? "Giriş yapılıyor..." : "Giriş yap"}
        </Button>
      </form>
    </div>
  );
}
