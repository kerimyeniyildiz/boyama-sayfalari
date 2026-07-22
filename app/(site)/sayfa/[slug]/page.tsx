import { notFound, redirect } from "next/navigation";
import type { Route } from "next";

import { getColoringPageBySlug } from "@/lib/data/coloring-pages";
import { buildColoringPagePath } from "@/lib/page-paths";

export const revalidate = 604800;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LegacyColoringPageRoute(props: PageProps) {
  const params = await props.params;
  const page = await getColoringPageBySlug(params.slug);

  if (!page) {
    notFound();
  }

  redirect(buildColoringPagePath(page) as Route);
}
