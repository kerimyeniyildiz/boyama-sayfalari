import { buildMetadata } from "@/lib/seo";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

export async function generateMetadata() {
  return buildMetadata({
    title: "Yönetici girişi | Yönetici Paneli",
    description: "Yönetici paneline erişmek için giriş yapın.",
    path: "/admin/login"
  });
}

export default async function AdminLoginPage(props: PageProps) {
  const searchParams = await props.searchParams;
  return <AdminLoginForm redirectTo={searchParams.redirectTo} />;
}
