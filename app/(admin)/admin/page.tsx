import { getDashboardStats } from "@/lib/data/admin/dashboard";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const stats = await getDashboardStats();
  return <AdminDashboard stats={stats} />;
}
