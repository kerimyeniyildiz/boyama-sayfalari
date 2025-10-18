import { PageStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    throw new Error(
      "Seeding requires ADMIN_EMAIL ve ADMIN_PASSWORD_HASH değişkenleri."
    );
  }

  const categories = [
    { name: "Hayvanlar", slug: "hayvanlar" },
    { name: "Masallar", slug: "masallar" },
    { name: "Uzay", slug: "uzay" }
  ];

  const tags = [
    { name: "orman", slug: "orman" },
    { name: "karakter", slug: "karakter" },
    { name: "gezegen", slug: "gezegen" },
    { name: "fantastik", slug: "fantastik" }
  ];

  await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category
      })
    )
  );

  await Promise.all(
    tags.map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag
      })
    )
  );

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash },
    create: { email: adminEmail, passwordHash: adminPasswordHash }
  });

  const categoryMap = Object.fromEntries(
    (
      await prisma.category.findMany({
        select: { id: true, slug: true }
      })
    ).map((category) => [category.slug, category.id])
  );

  const tagMap = Object.fromEntries(
    (
      await prisma.tag.findMany({
        select: { id: true, slug: true }
      })
    ).map((tag) => [tag.slug, tag.id])
  );

  const pageSeed = [
    {
      slug: "sevimli-orman-arkadaslari",
      title: "Sevimli Orman Arkadaşları",
      description: "Sevimli Orman Arkadaşları boyama sayfası.",
      status: PageStatus.PUBLISHED,
      language: "tr",
      pdfKey: "pdf/sevimli-orman-arkadaslari.pdf",
      coverImageKey: "cover/sevimli-orman-arkadaslari.webp",
      thumbWebpKey: "thumb/sevimli-orman-arkadaslari-800.webp",
      width: 1600,
      height: 2260,
      fileSizeBytes: 1024,
      categories: ["hayvanlar"],
      tags: ["orman", "karakter"]
    },
    {
      slug: "uzay-kesifcileri",
      title: "Uzay Keşifçileri",
      description: "Uzay Keşifçileri boyama sayfası.",
      status: PageStatus.PUBLISHED,
      language: "tr",
      pdfKey: "pdf/uzay-kesifcileri.pdf",
      coverImageKey: "cover/uzay-kesifcileri.webp",
      thumbWebpKey: "thumb/uzay-kesifcileri-800.webp",
      width: 1600,
      height: 2260,
      fileSizeBytes: 1024,
      categories: ["uzay"],
      tags: ["gezegen"]
    },
    {
      slug: "peri-masali-satosu",
      title: "Peri Masalı Şatosu",
      description: "Peri Masalı Şatosu boyama sayfası.",
      status: PageStatus.PUBLISHED,
      language: "tr",
      pdfKey: "pdf/peri-masali-satosu.pdf",
      coverImageKey: "cover/peri-masali-satosu.webp",
      thumbWebpKey: "thumb/peri-masali-satosu-800.webp",
      width: 1600,
      height: 2260,
      fileSizeBytes: 1024,
      categories: ["masallar"],
      tags: ["fantastik", "karakter"]
    }
  ];

  for (const page of pageSeed) {
    await prisma.coloringPage.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        description: page.description,
        status: page.status,
        language: page.language,
        pdfKey: page.pdfKey,
        coverImageKey: page.coverImageKey,
        thumbWebpKey: page.thumbWebpKey,
        width: page.width,
        height: page.height,
        fileSizeBytes: page.fileSizeBytes,
        categories: {
          deleteMany: {},
          create: page.categories
            .map((slug) => categoryMap[slug])
            .filter(Boolean)
            .map((categoryId) => ({ categoryId }))
        },
        tags: {
          deleteMany: {},
          create: page.tags
            .map((slug) => tagMap[slug])
            .filter(Boolean)
            .map((tagId) => ({ tagId }))
        }
      },
      create: {
        slug: page.slug,
        title: page.title,
        description: page.description,
        status: page.status,
        language: page.language,
        pdfKey: page.pdfKey,
        coverImageKey: page.coverImageKey,
        thumbWebpKey: page.thumbWebpKey,
        width: page.width,
        height: page.height,
        fileSizeBytes: page.fileSizeBytes,
        categories: {
          create: page.categories
            .map((slug) => categoryMap[slug])
            .filter(Boolean)
            .map((categoryId) => ({ categoryId }))
        },
        tags: {
          create: page.tags
            .map((slug) => tagMap[slug])
            .filter(Boolean)
            .map((tagId) => ({ tagId }))
        }
      }
    });
  }

  console.log("Seed verisi başarıyla yüklendi.");
}

main()
  .catch((error) => {
    console.error("Seed işlemi başarısız:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

