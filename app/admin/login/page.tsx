import { buildMetadata, siteConfig } from "@/lib/seo";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

type PageProps = {
  searchParams: {
    redirectTo?: string;
  };
};

export async function generateMetadata() {
  return buildMetadata({
    title: `Yönetici girişi | ${siteConfig.name}`,
    description: "Yönetici paneline erişmek için giriş yapın.",
    path: "/admin/login"
  });
}

export default function AdminLoginPage({ searchParams }: PageProps) {
  return <AdminLoginForm redirectTo={searchParams.redirectTo} />;
}
