import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
  };
};

export default function LegacyColoringPageRoute({ params }: PageProps) {
  redirect(`/${params.slug}`);
}
