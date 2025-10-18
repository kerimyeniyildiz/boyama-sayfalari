import { AdminTagManager } from "@/components/admin/admin-tag-manager";
import { getAdminTags } from "@/lib/data/admin/tags";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const tags = await getAdminTags();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-dark">Etiketler</h1>
        <p className="text-sm text-brand-dark/70">
          Sayfaları gruplayan etiketleri ekleyin veya yönetin.
        </p>
      </div>
      <AdminTagManager tags={tags} />
    </div>
  );
}
