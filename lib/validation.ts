import { z } from "zod";

export const statusSchema = z.enum(["DRAFT", "PUBLISHED"]);

// Site içi route çakışmalarını ve güvenlik sorunlarını önlemek için
// ayrılmış slug'lar. Bu kelimeler sayfa/kategori/etiket slug'ı olarak kullanılamaz.
export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "api",
  "ara",
  "kategori",
  "etiket",
  "sayfa",
  "sitemap",
  "sitemaps",
  "robots",
  "og",
  "iletisim",
  "gizlilik-politikasi",
  "kullanim-sartlari",
  "login",
  "logout",
  "new",
  "edit",
  "_next",
  "static",
  "public"
];

const reservedSlugSet = new Set(RESERVED_SLUGS);

export function isReservedSlug(slug: string): boolean {
  return reservedSlugSet.has(slug.trim().toLowerCase());
}

const slugSchema = z
  .string()
  .min(3)
  .refine((value) => !isReservedSlug(value), {
    message: "Bu slug sistem tarafından kullanılıyor, lütfen farklı bir slug seçin."
  });

export const pageMetadataSchema = z.object({
  title: z.string().min(3),
  slug: slugSchema,
  categories: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  description: z
    .string()
    .trim()
    .min(20, "Açıklama en az 20 karakter olmalıdır.")
    .max(500, "Açıklama en fazla 500 karakter olmalıdır."),
  seoContent: z.string().max(120000, "SEO metni en fazla yaklaşık 1000 kelime (120.000 karakter) olabilir.").optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const searchParamsSchema = z.object({
  q: z.string().max(100).optional(),
  kategori: z.string().optional(),
  etiket: z.string().optional(),
  yas: z.coerce.number().int().min(0).max(18).optional(),
  sayfa: z.coerce.number().int().min(1).default(1)
});

export const paginationParamsSchema = z.object({
  sayfa: z.coerce.number().int().min(1).default(1)
});

export const adminPageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
  status: z.enum(["ALL", "PUBLISHED", "DRAFT"]).default("ALL"),
  query: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(100).optional()
  )
});

export type AdminPageListQuery = z.infer<typeof adminPageListQuerySchema>;

const taxonomySlugSchema = z
  .string()
  .min(2)
  .max(100)
  .refine((value) => !isReservedSlug(value), {
    message: "Bu slug sistem tarafından kullanılıyor, lütfen farklı bir slug seçin."
  })
  .optional();

export const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    taxonomySlugSchema
  )
});

export const createTagSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    taxonomySlugSchema
  )
});
