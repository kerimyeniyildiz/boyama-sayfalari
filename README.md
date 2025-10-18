# Boyama Sayfalar�

Next.js App Router tabanl�, Prisma + PostgreSQL kullanan ve Cloudflare R2 �zerinde medya y�netimi sa�layan T�rk�e boyama sayfas� platformu.

## �zellikler

- ? SSG + ISR ile optimize edilmi� kamu sayfalar� (`/`, `/sayfa/[slug]`, `/kategori/[slug]`, `/etiket/[slug]`, `/ara`)
- ? Prisma 5 + PostgreSQL 16 veri modeli (kategori, etiket, indirme takibi, admin kullan�c�)
- ? Cloudflare R2 entegrasyonu (PDF + orijinal kapak + 400w/800w WebP thumbnail)
- ? Sharp ile g�rsel i�leme, tam metin arama (T�rk�e tsvector + GIN)
- ? Admin paneli (e-posta/�ifre, HttpOnly cookie oturumu)
- ? Admin panelinde dosya y�kleme limitleri (PDF 10MB, kapak 5MB) ve anl�k form hatalar�
- ? G�rsellerden otomatik WebP thumbnail ve PDF �retimi
- ? SEO: `generateMetadata`, `sitemap`, `robots`, JSON-LD, dinamik `/og/[slug]`
- ? Vitest (unit), Playwright (e2e) ve GitHub Actions CI

## Gerekli Ara�lar

- Node.js 22 LTS
- npm 10+
- PostgreSQL 16
- Cloudflare R2 bucket + API anahtarlar�

## Kurulum

1. Ba��ml�l�klar� y�kleyin:

   ```bash
   npm install
   ```

2. `.env.example` dosyas�n� `.env.local` olarak kopyalay�n ve de�erleri doldurun.

   ```bash
   cp .env.example .env.local
   ```

3. Y�netici i�in bcrypt hash �retin ve `.env.local` i�ine ekleyin:

   ```bash
   npm run admin:password -- <yeni-parola>
   ```

4. Prisma �emas�n� generate edin ve veritaban�n� migrate edin:

   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

5. Geli�tirme sunucusunu ba�lat�n:

   ```bash
   npm run dev
   ```

   Uygulama varsay�lan olarak [http://localhost:3000](http://localhost:3000) adresinde �al���r.

## Cloudflare R2

- Bucket anahtarlar�n� `.env.local` dosyas�na girin.
- `R2_PUBLIC_URL` taray�c�dan do�rudan eri�ilebilen (r2.dev) domain olmal�d�r.
- Admin panelinden y�klenen PDF / g�rsel dosyalar a�a��daki anahtar yap�s�na g�re y�klenir:
  - `pdf/<slug>.pdf`
  - `cover/<slug>.<orijinal-uzant�>`
  - `thumb/<slug>-400.webp`
  - `thumb/<slug>-800.webp`

## Komutlar

| Komut | A��klama |
| --- | --- |
| `npm run dev` | Geli�tirme sunucusu |
| `npm run build` | Production build |
| `npm run start` | Production sunucusu |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tip kontrol� |
| `npm run test:unit` | Vitest unit testleri |
| `npm run test:e2e` | Playwright e2e testleri |
| `npm run test` | Unit + e2e |
| `npm run seed` | �rnek verilerle veritaban�n� doldurur |
| `npm run prisma:migrate` | Prisma migrate (dev) |
| `npm run prisma:studio` | Prisma Studio |
| `npm run admin:password` | Admin �ifresi i�in bcrypt hash �retir |

## Testler

- Unit testler Vitest + Testing Library ile `npm run test:unit`
- Playwright e2e testleri i�in �nce uygulamay� build edin, ard�ndan `npm run test:e2e`
- CI pipeline `.github/workflows/ci.yml` alt�nda tan�mlanm��t�r.

## Ek Notlar

- `SESSION_SECRET` i�in en az 32 karakterlik rastgele bir de�er kullan�n.
- `PLAUSIBLE_*` de�i�kenleri opsiyonel, sadece analitik scripti ekler.
- Admin paneline giri�: `/admin/login` (env dosyas�ndaki e-posta + �ifre).
- Slug de�i�ikliklerinde admin paneli PDF ve kapak dosyas�n�n yeniden y�klenmesini ister.

