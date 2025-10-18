import { notFound } from "next/navigation";

import {
  getCategoriesWithCounts,
  getTagsWithCounts,
  getColoringPageById
} from "@/lib/data/coloring-pages";
import { AdminPageForm } from "@/components/admin/admin-page-form";

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
    tags: page.tags
  };

  return <AdminPageForm page={formPage} categories={categories} tags={tags} />;
}
