import { notFound } from "next/navigation";

import {
  getCategoriesWithCounts,
  getTagsWithCounts,
  getColoringPageById
} from "@/lib/data/coloring-pages";
import { AdminPageForm } from "@/components/admin/admin-page-form";
import { AdminChildPagesManager } from "@/components/admin/admin-child-pages-manager";
import { getPublicUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function EditPage({ params }: PageProps) {
  const [page, categories, tags] = await Promise.all([
    getColoringPageById(params.id),
    getCategoriesWithCounts(),
    getTagsWithCounts()
  ]);

  if (!page) {
    notFound();
  }

  const formPage = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    categories: page.categories,
    tags: page.tags,
    seoContent: page.seoContent
  };

  const childSummaries = page.children.map((child) => ({
    id: child.id,
    title: child.title,
    slug: child.slug,
    downloads: child.downloads,
    createdAt: child.createdAt instanceof Date ? child.createdAt.toISOString() : new Date(child.createdAt).toISOString(),
    imageUrl: child.thumbWebpKey
      ? getPublicUrl(child.thumbWebpKey)
      : child.coverImageKey
        ? getPublicUrl(child.coverImageKey)
        : null
  }));

  const isMainPage = !page.parent;
  const parentEditId = page.parent?.id;

  return (
    <div className="space-y-8">
      <AdminPageForm page={formPage} categories={categories} tags={tags} />
      <AdminChildPagesManager
        parentId={page.id}
        parentEditId={parentEditId}
        isMainPage={isMainPage}
        children={childSummaries}
      />
    </div>
  );
}
