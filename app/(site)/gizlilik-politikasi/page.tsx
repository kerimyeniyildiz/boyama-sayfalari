import Link from "next/link";

import { buildMetadata, siteConfig } from "@/lib/seo";

const siteName = siteConfig.name ?? "Boyama Sayfaları";
const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "kerim.yeniyildiz@msn.com";

type PolicySection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

const policySections: PolicySection[] = [
  {
    title: "1. Giriş",
    paragraphs: [
      `${siteName} olarak çocukların güvenli ve eğitici içeriklere erişmesini sağlarken kişisel verilerin gizliliğine büyük önem veriyoruz.`,
      "Bu Gizlilik Politikası, kullanıcılarımızın hangi verileri hangi amaçlarla topladığımızı, işlediğimizi, sakladığımızı ve KVKK (6698 sayılı Kişisel Verilerin Korunması Kanunu) kapsamında sahip olduğunuz hakları açıklar."
    ]
  },
  {
    title: "2. Toplanan Veriler",
    paragraphs: [
      "Hizmetlerimizi sunarken yalnızca gerekli ve ölçülü verileri toplarız. Bu veriler aşağıdaki gruplarda toplanabilir:"
    ],
    list: [
      "Zorunlu kullanım verileri: IP adresi, tarayıcı bilgisi, görüntülediğiniz sayfalar, yönlendiren adresler ve bağlantı süreleri.",
      "Tercihe bağlı hesap verileri: Yönetici olarak sisteme kayıt olduğunuzda e-posta adresiniz ve ad-soyadınız.",
      "İletişim içerikleri: İletişim formu veya e-posta aracılığıyla bize gönderdiğiniz mesajlar, talepler ve ek belgeler.",
      "Analitik veriler: Ziyaret istatistikleri anonimleştirilmiş şekilde toplanır ve (varsa) Plausible Analytics gibi çerezsiz ölçümleme araçlarıyla işlenir."
    ]
  },
  {
    title: "3. Çerez Kullanımı",
    paragraphs: [
      "Sitemiz temel işlevler için zorunlu çerezler kullanabilir. Ölçümleme için tercih ettiğimiz Plausible Analytics, çerez kullanmadan anonim istatistik üretir.",
      "Tarayıcı ayarlarınızı kullanarak çerezleri yönetebilir, silebilir veya engelleyebilirsiniz. Çerezleri kapatmanız, sitedeki temel içeriklere erişiminizi engellemez."
    ]
  },
  {
    title: "4. Kişisel Verileri İşleme Amaçlarımız",
    paragraphs: [
      "Topladığımız kişisel verileri aşağıdaki amaçlarla işleriz:"
    ],
    list: [
      "Hizmeti sunmak, performansını ölçmek ve güvenliğini sağlamak.",
      "İçerikleri, koleksiyonları ve kullanıcı deneyimini geliştirmek.",
      "Yasal bildirimlere ve resmi taleplere yanıt vermek.",
      "Sizinle talebiniz doğrultusunda iletişime geçmek ve destek sağlamak."
    ]
  },
  {
    title: "5. Veri Saklama ve Silme",
    paragraphs: [
      "Kişisel verilerinizi, işleme amaçlarımızı gerçekleştirmek için gerekli süre boyunca saklarız.",
      "Yasal bir yükümlülük veya uyuşmazlık durumunda kayıtları daha uzun süre saklayabiliriz.",
      "KVKK kapsamında silme talebinde bulunmanız hâlinde, saklama yükümlülüklerimiz saklı kalmak şartıyla verilerinizi siler veya anonimleştiririz."
    ]
  },
  {
    title: "6. Veri Paylaşımı ve Aktarımlar",
    paragraphs: [
      `${siteName}, kişisel verilerinizi üçüncü taraflarla pazarlama amacıyla paylaşmaz.`,
      "Hizmetin barındırılması, güvenlik, yedekleme veya analitik gibi zorunlu altyapı ihtiyaçları için hizmet sağlayıcılarla çalışabiliriz.",
      "Bu sağlayıcılar yalnızca sözleşmesel yükümlülükleri kapsamında ve talimatlarımız doğrultusunda veri işler."
    ]
  },
  {
    title: "7. Veri Güvenliği",
    paragraphs: [
      "Yetkisiz erişimi önlemek için erişim kontrolleri, şifreleme, düzenli yedekleme ve günlük izleme gibi idari ve teknik tedbirler uygularız.",
      "İnternet üzerinden veri iletiminin tamamen güvenli olduğunu garanti edemeyiz; ancak riskleri en aza indirmek için güncel güvenlik uygulamalarını takip ederiz."
    ]
  },
  {
    title: "8. KVKK Kapsamındaki Haklarınız",
    paragraphs: [
      "KVKK'nın 11. maddesi gereği aşağıdaki haklara sahipsiniz:"
    ],
    list: [
      "Kişisel verilerinizin işlenip işlenmediğini öğrenme.",
      "İşlenmişse buna ilişkin bilgi talep etme.",
      "İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.",
      "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.",
      "Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme.",
      "KVKK ve ilgili mevzuata aykırı işlenmişse silinmesini veya yok edilmesini isteme.",
      "Bu işlemlerin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
      "İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme.",
      "Verilerin kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme."
    ]
  },
  {
    title: "9. Politika Güncellemeleri",
    paragraphs: [
      "Gizlilik Politikamızı mevzuat değişiklikleri veya hizmetteki yeni özellikler doğrultusunda güncelleyebiliriz.",
      "Güncel sürümü her zaman bu sayfada yayımlar, önemli değişiklikleri duyururuz. Lütfen düzenli olarak kontrol edin."
    ]
  }
];

export async function generateMetadata() {
  return buildMetadata({
    title: "Gizlilik Politikası",
    description: `${siteName} kullanıcı verilerini nasıl işlediğimizi ve KVKK haklarınızı öğrenin.`,
    path: "/gizlilik-politikasi"
  });
}

export default function PrivacyPolicyPage() {
  return (
    <section className="bg-white">
      <div className="container max-w-3xl space-y-10 py-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-heading font-semibold text-brand-dark">
            Gizlilik Politikası
          </h1>
          <p className="text-base leading-relaxed text-brand-dark/80">
            Bu sayfa, {siteName} hizmetini kullanırken kişisel verilerinizin nasıl
            toplandığını, işlendiğini ve korunduğunu açıklar.
          </p>
        </div>

        <div className="space-y-8">
          {policySections.map((section) => (
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
            </article>
          ))}
        </div>

        <div className="rounded-3xl border border-brand-dark/10 bg-brand-light/70 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark">
            Haklarınızı Kullanmak İçin
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-dark/80">
            KVKK kapsamındaki taleplerinizi{" "}
            <Link
              href={`mailto:${contactEmail}?subject=KVKK%20Haklar%C4%B1m%C4%B1%20Kullanmak%20%C4%B0stiyorum`}
              className="font-medium hover:text-brand"
            >
              {contactEmail}
            </Link>{" "}
            adresine yazılı olarak iletebilirsiniz. Talebiniz en geç 30 gün içinde
            yanıtlanır ve gerekirse kimliğinizi doğrulayıcı belgeler istenebilir.
          </p>
        </div>
      </div>
    </section>
  );
}
