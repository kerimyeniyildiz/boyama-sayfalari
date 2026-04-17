import { z } from "zod";

/**
 * AI destekli toplu boyama sayfası üretim işinin girdileri.
 * İş, bir ana sayfa + opsiyonel alt sayfa(lar) üretmek üzere tasarlandı.
 * FormData olarak gelen değerler enqueue sırasında bu şemaya parse edilir.
 */
export const aiBatchJobPayloadSchema = z.object({
  promptLines: z.array(z.string().min(1)).min(1).max(40),
  anchor: z.string().trim().default(""),
  title: z.string().trim().default(""),
  slug: z.string().trim().default(""),
  description: z.string().trim().default(""),
  seoContent: z.string().default(""),
  categories: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  pageCount: z.number().int().min(60).max(120),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  publishAtRaw: z.string().default("")
});

export type AiBatchJobPayload = z.infer<typeof aiBatchJobPayloadSchema>;

export const aiBatchJobResultSchema = z.object({
  createdSlugs: z.array(z.string()),
  parentSlug: z.string()
});

export type AiBatchJobResult = z.infer<typeof aiBatchJobResultSchema>;
