import Link from "next/link";

import { buildMetadata, siteConfig } from "@/lib/seo";

const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "kerim.yeniyildiz@msn.com";
const siteName = siteConfig.name ?? "Boyama Sayfaları";

const contactChannels = [
  {
    title: "Destek ve Geri Bildirim",
    description:
      "Platformu geliştirirken ebeveynlerin, öğretmenlerin ve küçük sanatçıların deneyimlerini dikkate alıyoruz.",
    items: [
      "Yeni boyama kategorisi veya içerik önerilerinizi paylaşabilirsiniz.",
      "Karşılaştığınız teknik sorunları veya hata raporlarını iletebilirsiniz.",
      "Çocukların güvenli kullanımına ilişkin görüşlerinizi aktarabilirsiniz."
    ]
  },
  {
    title: "İşbirliği ve Sponsorluk",
    description:
      "Okullar, yayıncılar veya markalarla çocukların yaratıcılığını destekleyen projelerde ortaklık kurmaktan memnuniyet duyarız.",
    items: [
      "Eğitici içerik veya etkinlik serileri için ortak projeler üretelim.",
      "Boyama sayfalarının markanıza göre uyarlanması konusunda görüşelim.",
      "Eğitim kurumları için özel erişim veya kullanım senaryolarını planlayalım."
    ]
  },
  {
    title: "Yasal Talepler",
    description:
      "Telif hakkı veya veri gizliliği gibi yasal talepleri hızlıca değerlendirebilmemiz için lütfen gerekli belgelerle birlikte bize ulaşın.",
    items: [
      "Telif hakkı ihlali bildirimlerinizde ilgili içerik bağlantısını ekleyin.",
      "KVKK kapsamındaki hak taleplerinizde kimlik doğrulayıcı bilgileri paylaşın.",
      "Resmî talepler için yazışma dilini Türkçe veya İngilizce tercih edebilirsiniz."
    ]
  }
] as const;

export async function generateMetadata() {
  return buildMetadata({
    title: "İletişim",
    description: `${siteName} ekibine nasıl ulaşacağınızı öğrenin.`,
    path: "/iletisim"
  });
}

export default function ContactPage() {
  return (
    <section className="bg-white">
      <div className="container max-w-3xl space-y-10 py-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-heading font-semibold text-brand-dark">
            İletişim
          </h1>
          <p className="text-base leading-relaxed text-brand-dark/80">
            {siteName} ile ilgili tüm sorularınızı, önerilerinizi ve geri
            bildirimlerinizi bekliyoruz. Sizinle aynı dili konuşan, çocukların
            güvenli ve eğitici içeriklere ulaşmasını önemseyen bir ekibiz.
          </p>
          <div className="rounded-3xl border border-brand-dark/10 bg-brand-light/60 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark/70">
              E-posta
            </p>
            <p className="mt-2 text-lg font-medium text-brand-dark">
              <Link href={`mailto:${contactEmail}`} className="hover:text-brand">
                {contactEmail}
              </Link>
            </p>
            <p className="mt-3 text-sm text-brand-dark/70">
              Mesajlarınıza 2 iş günü içinde dönüş yapmaya çalışıyoruz. Daha
              hızlı yanıt alabilmek için konu başlığınızı net belirtmeniz
              yeterli.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {contactChannels.map((channel) => (
            <div
              key={channel.title}
              className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-brand-dark">
                {channel.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-brand-dark/80">
                {channel.description}
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-brand-dark/80">
                {channel.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-brand-dark/10 bg-brand-accent/40 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark">
            KVKK Kapsamındaki Talepler
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-dark/80">
            Kişisel verilerinizle ilgili bilgi talep etmek, güncelleme istemek
            veya silme başvurusunda bulunmak için e-posta ile{" "}
            <Link
              href={`mailto:${contactEmail}?subject=KVKK%20Bilgi%20Talebi`}
              className="font-medium hover:text-brand"
            >
              KVKK Bilgi Talebi
            </Link>{" "}
            başlığını kullanabilirsiniz. Mümkünse talebinizi destekleyen belgeleri
            ve ulaşabileceğimiz bir telefon numarasını ekleyin.
          </p>
        </div>

        <div className="space-y-1 text-sm text-brand-dark/70">
          <p>Müracaat adresi: İstanbul, Türkiye (uzaktan çalışma)</p>
          <p>Çalışma saatleri: Hafta içi 09.00 – 18.00 (GMT+3)</p>
        </div>
      </div>
    </section>
  );
}
