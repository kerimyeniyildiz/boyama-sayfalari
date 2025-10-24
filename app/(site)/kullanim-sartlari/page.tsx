import Link from "next/link";

import { buildMetadata, siteConfig } from "@/lib/seo";

const siteName = siteConfig.name ?? "Boyama Sayfaları";
const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "kerim.yeniyildiz@msn.com";

type TermsSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
  afterList?: string[];
};

const termsSections: TermsSection[] = [
  {
    title: "1. Kabul ve Yürürlük",
    paragraphs: [
      `${siteName} platformuna erişim sağlayarak veya hizmetlerimizi kullanarak bu Kullanım Şartları'nı okuduğunuzu, anladığınızı ve bağlayıcı tüm koşulları kabul ettiğinizi beyan etmiş olursunuz.`,
      "Koşulları kabul etmiyorsanız siteye erişmemeniz ve içerikleri kullanmamanız gerekir."
    ]
  },
  {
    title: "2. Hizmetin Kullanımı",
    paragraphs: [
      "Platformumuz çocuklara yönelik boyama sayfaları sunar. İçerikler yalnızca kişisel kullanım, eğitim ve sınıf içi etkinlikler gibi ticari olmayan amaçlarla kullanılabilir.",
      "İndirilen dosyaların yeniden satışı, ticari paketlere dahil edilmesi veya yetkisiz platformlarda paylaşılması yasaktır."
    ]
  },
  {
    title: "3. Fikri Mülkiyet Hakları",
    paragraphs: [
      "Sitede yer alan tüm metinler, görseller, çizimler ve yazılım bileşenleri ilgili telif hakkı mevzuatı ile korunmaktadır.",
      "İçeriklerin üzerinde yer alan marka ve telif uyarılarını değiştiremez veya gizleyemezsiniz."
    ]
  },
  {
    title: "4. Çocukların Güvenliği",
    paragraphs: [
      "Platform, çocuklar için uygun içerikler üretmeyi amaçlar; ancak ebeveyn veya eğitmen gözetimi esastır.",
      "Hesap oluşturma gerektiren bölümler yalnızca yetkili yetişkin kullanıcılar tarafından kullanılabilir."
    ]
  },
  {
    title: "5. Telif Hakkı İhlalleri ve Bildirim Süreci",
    paragraphs: [
      `${siteName}, orijinal içerik üretimini ve hak sahiplerinin korunmasını önemser. Telif hakkı ihlali iddianız varsa aşağıdaki bilgileri içeren yazılı bir bildirim göndermeniz gerekir:`
    ],
    list: [
      "İhlal edildiği iddia edilen eserin tanımı ve eserin orijinal kaynağı.",
      "İhlale konu olduğunu düşündüğünüz materyalin site üzerindeki tam URL bilgisi.",
      "Hak sahibi veya yetkili temsilci olduğunuzu gösteren imzalı beyan.",
      "Güncel iletişim bilgileriniz (ad, soyad, telefon, e-posta, adres).",
      "Bildirimin doğru olduğuna ve hak sahibi olduğunuzu beyan eden yasal sorumluluk içeren ifade."
    ],
    afterList: [
      "Geçerli bir bildirim aldığımızda ilgili içeriği geçici olarak yayından kaldırır ve hak sahipleriyle iletişime geçeriz.",
      "İhlalin tekrarlandığı kullanıcılara karşı erişim kısıtlama ve hesap kapatma dahil olmak üzere önleyici tedbirler uygulayabiliriz."
    ]
  },
  {
    title: "6. Sorumluluk Reddi",
    paragraphs: [
      "Platformdaki içerikler 'olduğu gibi' sunulur. İçeriklerin doğruluğu, sürekliliği veya belirli bir amaca uygunluğu hakkında açık veya zımni garanti verilmez.",
      "Teknik aksaklıklar, kesintiler veya üçüncü taraf servis sağlayıcılarından kaynaklanan sorunlardan doğabilecek kayıplardan sorumlu tutulamayız."
    ]
  },
  {
    title: "7. Değişiklikler",
    paragraphs: [
      "Kullanım Şartları'nı herhangi bir zamanda güncelleyebiliriz. Güncellemeler, yayınlandığı tarihten itibaren geçerlidir.",
      "Değişikliklerden haberdar olmak için lütfen sayfayı düzenli olarak kontrol edin."
    ]
  },
  {
    title: "8. Uygulanacak Hukuk ve Yetkili Mahkeme",
    paragraphs: [
      "İş bu şartlar Türkiye Cumhuriyeti kanunlarına tabidir.",
      "Uyuşmazlıkların çözümünde İstanbul (Anadolu) Adliyesi mahkemeleri ve icra daireleri yetkilidir."
    ]
  }
];

export async function generateMetadata() {
  return buildMetadata({
    title: "Kullanım Şartları",
    description: `${siteName} içeriğini kullanırken uymanız gereken kuralları ve telif hakkı korumalarını öğrenin.`,
    path: "/kullanim-sartlari"
  });
}

export default function TermsOfUsePage() {
  return (
    <section className="bg-white">
      <div className="container max-w-3xl space-y-10 py-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-heading font-semibold text-brand-dark">
            Kullanım Şartları
          </h1>
          <p className="text-base leading-relaxed text-brand-dark/80">
            {siteName} hizmetlerini güvenli, adil ve telif haklarına saygılı bir
            şekilde kullanabilmeniz için hazırladığımız koşulları aşağıda
            bulabilirsiniz.
          </p>
        </div>

        <div className="space-y-8">
          {termsSections.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-brand-dark">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-brand-dark/80">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.list ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-brand-dark/80">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.afterList ? (
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-brand-dark/80">
                  {section.afterList.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-brand-dark/10 bg-brand-accent/40 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark">
            Telif Hakkı Bildirimleri İçin
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-dark/80">
            Telif hakkı ihlali bildirimlerinizi ve karşı beyanlarınızı{" "}
            <Link
              href={`mailto:${contactEmail}?subject=Telif%20Hakk%C4%B1%20Bildirim`}
              className="font-medium hover:text-brand"
            >
              {contactEmail}
            </Link>{" "}
            adresine iletebilirsiniz. Bildiriminizin yasal olarak geçerli olması
            için 5. bölümde sıralanan bilgileri eksiksiz eklemeyi unutmayın.
          </p>
        </div>
      </div>
    </section>
  );
}
