# Boyama Sayfalarý

Next.js App Router tabanlý, Prisma + PostgreSQL kullanan ve Cloudflare R2 üzerinde medya yönetimi saðlayan Türkçe boyama sayfasý platformu.

## Özellikler

- ? SSG + ISR ile optimize edilmiþ kamu sayfalarý (`/`, `/sayfa/[slug]`, `/kategori/[slug]`, `/etiket/[slug]`, `/ara`)
- ? Prisma 5 + PostgreSQL 16 veri modeli (kategori, etiket, indirme takibi, admin kullanýcý)
- ? Cloudflare R2 entegrasyonu (PDF + orijinal kapak + 400w/800w WebP thumbnail)
- ? Sharp ile görsel iþleme, tam metin arama (Türkçe tsvector + GIN)
- ? Admin paneli (e-posta/þifre, HttpOnly cookie oturumu)
- ? Admin panelinde dosya yükleme limitleri (PDF 10MB, kapak 5MB) ve anlýk form hatalarý
- ? Görsellerden otomatik WebP thumbnail ve PDF üretimi
- ? SEO: `generateMetadata`, `sitemap`, `robots`, JSON-LD, dinamik `/og/[slug]`
- ? Vitest (unit), Playwright (e2e) ve GitHub Actions CI

## Gerekli Araçlar

- Node.js 22 LTS
- npm 10+
- PostgreSQL 16
- Cloudflare R2 bucket + API anahtarlarý

## Kurulum

1. Baðýmlýlýklarý yükleyin:

   ```bash
   npm install
   ```

2. `.env.example` dosyasýný `.env.local` olarak kopyalayýn ve deðerleri doldurun.

   ```bash
   cp .env.example .env.local
   ```

3. Yönetici için bcrypt hash üretin ve `.env.local` içine ekleyin:

   ```bash
   npm run admin:password -- <yeni-parola>
   ```

4. Prisma þemasýný generate edin ve veritabanýný migrate edin:

   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

5. Geliþtirme sunucusunu baþlatýn:

   ```bash
   npm run dev
   ```

   Uygulama varsayýlan olarak [http://localhost:3000](http://localhost:3000) adresinde çalýþýr.

## Cloudflare R2

- Bucket anahtarlarýný `.env.local` dosyasýna girin.
- `R2_PUBLIC_URL` tarayýcýdan doðrudan eriþilebilen (r2.dev) domain olmalýdýr.
- Admin panelinden yüklenen PDF / görsel dosyalar aþaðýdaki anahtar yapýsýna göre yüklenir:
  - `pdf/<slug>.pdf`
  - `cover/<slug>.<orijinal-uzantý>`
  - `thumb/<slug>-400.webp`
  - `thumb/<slug>-800.webp`

## Komutlar

| Komut | Açýklama |
| --- | --- |
| `npm run dev` | Geliþtirme sunucusu |
| `npm run build` | Production build |
| `npm run start` | Production sunucusu |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run test:unit` | Vitest unit testleri |
| `npm run test:e2e` | Playwright e2e testleri |
| `npm run test` | Unit + e2e |
| `npm run seed` | Örnek verilerle veritabanýný doldurur |
| `npm run prisma:migrate` | Prisma migrate (dev) |
| `npm run prisma:studio` | Prisma Studio |
| `npm run admin:password` | Admin þifresi için bcrypt hash üretir |

## Testler

- Unit testler Vitest + Testing Library ile `npm run test:unit`
- Playwright e2e testleri için önce uygulamayý build edin, ardýndan `npm run test:e2e`
- CI pipeline `.github/workflows/ci.yml` altýnda tanýmlanmýþtýr.

## Ek Notlar

- `SESSION_SECRET` için en az 32 karakterlik rastgele bir deðer kullanýn.
- `PLAUSIBLE_*` deðiþkenleri opsiyonel, sadece analitik scripti ekler.
- Admin paneline giriþ: `/admin/login` (env dosyasýndaki e-posta + þifre).
- Slug deðiþikliklerinde admin paneli PDF ve kapak dosyasýnýn yeniden yüklenmesini ister.

