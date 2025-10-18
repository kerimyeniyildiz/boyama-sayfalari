import { AdminCategoryManager } from "@/components/admin/admin-category-manager";
import { getAdminCategories } from "@/lib/data/admin/categories";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-dark">
          Kategoriler
        </h1>
        <p className="text-sm text-brand-dark/70">
          İçeriklerinizi düzenlemek için kullanılan kategorileri yönetin.
        </p>
      </div>
      <AdminCategoryManager categories={categories} />
    </div>
  );
}
