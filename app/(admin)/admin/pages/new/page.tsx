import { getCategoriesWithCounts, getTagsWithCounts } from "@/lib/data/coloring-pages";
import { AdminPageForm } from "@/components/admin/admin-page-form";

export default async function NewPage() {
  const [categories, tags] = await Promise.all([
    getCategoriesWithCounts(),
    getTagsWithCounts()
  ]);

  return (
    <AdminPageForm categories={categories} tags={tags} />
  );
}
