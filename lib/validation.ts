import { z } from "zod";

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const orientationSchema = z.enum(["PORTRAIT", "LANDSCAPE"]);
export const statusSchema = z.enum(["DRAFT", "PUBLISHED"]);

const numberField = z.coerce
  .number()
  .int()
  .min(0)
  .max(18)
  .optional();

export const pageMetadataSchema = z
  .object({
    title: z.string().min(3),
    slug: z.string().min(3),
    description: z.string().min(20),
    difficulty: difficultySchema,
    orientation: orientationSchema,
    ageMin: numberField,
    ageMax: numberField,
    artist: z.string().optional(),
    license: z.string().optional(),
    sourceUrl: z
      .string()
      .url()
      .optional()
      .or(z.literal("")),
    status: statusSchema.default("DRAFT"),
    language: z.string().default("tr"),
    categories: z.array(z.string().min(1)).default([]),
    tags: z.array(z.string().min(1)).default([]),
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
    fileSizeBytes: z.coerce.number().int().positive().optional()
  })
  .refine(
    (data) => {
      if (data.ageMin && data.ageMax) {
        return data.ageMin <= data.ageMax;
      }
      return true;
    },
    {
      message: "ageMax, ageMin değerinden küçük olamaz.",
      path: ["ageMax"]
    }
  );

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const searchParamsSchema = z.object({
  q: z.string().max(100).optional(),
  kategori: z.string().optional(),
  etiket: z.string().optional(),
  difficulty: difficultySchema.optional(),
  orientation: orientationSchema.optional(),
  yas: z
    .coerce.number()
    .int()
    .min(0)
    .max(18)
    .optional(),
  sayfa: z.coerce.number().int().min(1).default(1)
});
