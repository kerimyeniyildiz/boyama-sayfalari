/**
 * SEO ve erişilebilirlik için görsel alt metnini standart bir kalıba getirir.
 * Başlık zaten "boyama sayfası" ifadesini içeriyorsa olduğu gibi kullanılır,
 * içermiyorsa sonuna " boyama sayfası" eklenir. Böylece ekran okuyucular da
 * Google görsel araması da içeriği bağlam içinde anlar.
 */
export function buildColoringPageAlt(title: string | null | undefined): string {
  const base = (title ?? "").trim();

  if (base.length === 0) {
    return "Boyama sayfası";
  }

  const normalized = base.toLocaleLowerCase("tr-TR");
  if (/boyama\s+sayfa/.test(normalized)) {
    return base;
  }

  return `${base} boyama sayfası`;
}
