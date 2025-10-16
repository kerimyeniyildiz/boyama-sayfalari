import Link from "next/link";

type Tag = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type TagCloudProps = {
  tags: Tag[];
};

export function TagCloud({ tags }: TagCloudProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <section className="container py-12">
      <div className="rounded-3xl border border-brand-dark/10 bg-white/80 p-8 shadow-card">
        <h2 className="text-2xl font-semibold text-brand-dark">
          Popüler etiketler
        </h2>
        <p className="text-sm text-brand-dark/70">
          Çocukların en çok sevdiği temaları keşfedin.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/etiket/${tag.slug}`}
              className="rounded-full border border-brand-dark/20 bg-brand-light px-4 py-2 text-sm text-brand-dark transition hover:border-brand-dark/40 hover:bg-brand"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
