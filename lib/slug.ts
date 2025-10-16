import slugifyLib from "slugify";

export function slugify(input: string): string {
  return slugifyLib(input, {
    lower: true,
    strict: true,
    locale: "tr",
    trim: true
  });
}
