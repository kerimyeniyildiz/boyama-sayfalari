import { notFound, redirect } from "next/navigation";

import { getColoringPageBySlug } from "@/lib/data/coloring-pages";
import { buildColoringPagePath } from "@/lib/page-paths";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
  };
};

export default async function LegacyColoringPageRoute({ params }: PageProps) {
  const page = await getColoringPageBySlug(params.slug);

  if (!page) {
    notFound();
  }

  redirect(buildColoringPagePath(page));
}
