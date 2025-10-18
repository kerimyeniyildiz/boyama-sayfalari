# Boyama Sayfaları

Next.js App Router tabanlı, Prisma + PostgreSQL kullanan ve Cloudflare R2 üzerinde medya yönetimi sağlayan Türkçe boyama sayfası platformu.

## Özellikler

- ✅ SSG + ISR ile optimize edilmiş kamu sayfaları (`/`, `/sayfa/[slug]`, `/kategori/[slug]`, `/etiket/[slug]`, `/ara`)
- ✅ Prisma 5 + PostgreSQL 16 veri modeli (kategori, etiket, indirme takibi, admin kullanıcı)
- ✅ Cloudflare R2 entegrasyonu (PDF + orijinal kapak + 400w/800w WebP thumbnail)
- ✅ Sharp ile görsel işleme, tam metin arama (Türkçe tsvector + GIN)
- ✅ Admin paneli (e-posta/şifre, HttpOnly cookie oturumu)
- ✅ Admin panelinde dosya yükleme limitleri (PDF 10MB, kapak 5MB) ve anlık form hataları
- ✅ SEO: `generateMetadata`, `sitemap`, `robots`, JSON-LD, dinamik `/og/[slug]`
- ✅ Vitest (unit), Playwright (e2e) ve GitHub Actions CI

## Gerekli Araçlar

- Node.js 22 LTS
- npm 10+
- PostgreSQL 16
- Cloudflare R2 bucket + API anahtarları

## Kurulum

1. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

2. `.env.example` dosyasını `.env.local` olarak kopyalayın ve değerleri doldurun.

   ```bash
   cp .env.example .env.local
   ```

3. Yönetici için bcrypt hash üretin ve `.env.local` içine ekleyin:

   ```bash
   npm run admin:password -- <yeni-parola>
   ```

4. Prisma şemasını generate edin ve veritabanını migrate edin:

   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

5. Geliştirme sunucusunu başlatın:

   ```bash
   npm run dev
   ```

   Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Cloudflare R2

- Bucket anahtarlarını `.env.local` dosyasına girin.
- `R2_PUBLIC_URL` tarayıcıdan doğrudan erişilebilen (r2.dev) domain olmalıdır.
- Admin panelinden yüklenen PDF / görsel dosyalar aşağıdaki anahtar yapısına göre yüklenir:
  - `pdf/<slug>.pdf`
  - `cover/<slug>.<orijinal-uzantı>`
  - `thumb/<slug>-400.webp`
  - `thumb/<slug>-800.webp`

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm run start` | Production sunucusu |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run test:unit` | Vitest unit testleri |
| `npm run test:e2e` | Playwright e2e testleri |
| `npm run test` | Unit + e2e |
| `npm run seed` | Örnek verilerle veritabanını doldurur |
| `npm run prisma:migrate` | Prisma migrate (dev) |
| `npm run prisma:studio` | Prisma Studio |
| `npm run admin:password` | Admin şifresi için bcrypt hash üretir |

## Testler

- Unit testler Vitest + Testing Library ile `npm run test:unit`
- Playwright e2e testleri için önce uygulamayı build edin, ardından `npm run test:e2e`
- CI pipeline `.github/workflows/ci.yml` altında tanımlanmıştır.

## Ek Notlar

- `SESSION_SECRET` için en az 32 karakterlik rastgele bir değer kullanın.
- `PLAUSIBLE_*` değişkenleri opsiyonel, sadece analitik scripti ekler.
- Admin paneline giriş: `/admin/login` (env dosyasındaki e-posta + şifre).
- Slug değişikliklerinde admin paneli PDF ve kapak dosyasının yeniden yüklenmesini ister.
