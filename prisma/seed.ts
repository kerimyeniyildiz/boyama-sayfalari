
import {
  Difficulty,
  Orientation,
  PageStatus,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    throw new Error(
      "Seeding requires ADMIN_EMAIL ve ADMIN_PASSWORD_HASH deÄŸiÅŸkenleri."
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
      title: "Sevimli Orman ArkadaÅŸlarÄ±",
      description:
        "Minikler iÃ§in dost canlÄ±sÄ± orman hayvanlarÄ±yla dolu eÄŸlenceli bir boyama sayfasÄ±.",
      difficulty: Difficulty.EASY,
      orientation: Orientation.LANDSCAPE,
      ageMin: 3,
      ageMax: 6,
      artist: "Boyama StÃ¼dyosu",
      license: "CC BY 4.0",
      sourceUrl: "https://boyamasayfalari.com.tr/sevimli-orman-arkadaslari",
      status: PageStatus.PUBLISHED,
      pdfKey: "pdf/sevimli-orman-arkadaslari.pdf",
      coverImageKey: "cover/sevimli-orman-arkadaslari.jpg",
      thumbWebpKey: "thumb/sevimli-orman-arkadaslari-400.webp",
      width: 2480,
      height: 1754,
      fileSizeBytes: 1856320,
      categories: ["hayvanlar"],
      tags: ["orman", "karakter"]
    },
    {
      slug: "uzay-kesifcileri",
      title: "Uzay KeÅŸifÃ§ileri",
      description:
        "Renkli gezegenler ve sevimli astronotlarla dolu bu sayfada hayal gÃ¼cÃ¼ sÄ±nÄ±rsÄ±z.",
      difficulty: Difficulty.MEDIUM,
      orientation: Orientation.PORTRAIT,
      ageMin: 5,
      ageMax: 9,
      artist: "Galaksi Ã‡izeri",
      license: "Ã–zel KullanÄ±m",
      sourceUrl: "https://boyamasayfalari.com.tr/uzay-kesifcileri",
      status: PageStatus.PUBLISHED,
      pdfKey: "pdf/uzay-kesifcileri.pdf",
      coverImageKey: "cover/uzay-kesifcileri.jpg",
      thumbWebpKey: "thumb/uzay-kesifcileri-400.webp",
      width: 2480,
      height: 3508,
      fileSizeBytes: 2540032,
      categories: ["uzay"],
      tags: ["gezegen"]
    },
    {
      slug: "peri-masali-satosu",
      title: "Peri MasalÄ± Åatosu",
      description:
        "IÅŸÄ±ltÄ±lÄ± peri tozlarÄ± ve bÃ¼yÃ¼lÃ¼ bir ÅŸato ile Ã§ocuklarÄ±n yaratÄ±cÄ±lÄ±ÄŸÄ±nÄ± destekleyin.",
      difficulty: Difficulty.HARD,
      orientation: Orientation.PORTRAIT,
      ageMin: 6,
      ageMax: 10,
      artist: "Masal AtÃ¶lyesi",
      license: "CC BY-NC 4.0",
      sourceUrl: "https://boyamasayfalari.com.tr/peri-masali-satosu",
      status: PageStatus.PUBLISHED,
      pdfKey: "pdf/peri-masali-satosu.pdf",
      coverImageKey: "cover/peri-masali-satosu.jpg",
      thumbWebpKey: "thumb/peri-masali-satosu-400.webp",
      width: 2480,
      height: 3508,
      fileSizeBytes: 3120000,
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
        difficulty: page.difficulty,
        orientation: page.orientation,
        ageMin: page.ageMin,
        ageMax: page.ageMax,
        artist: page.artist,
        license: page.license,
        sourceUrl: page.sourceUrl,
        status: page.status,
        language: "tr",
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
        difficulty: page.difficulty,
        orientation: page.orientation,
        ageMin: page.ageMin,
        ageMax: page.ageMax,
        artist: page.artist,
        license: page.license,
        sourceUrl: page.sourceUrl,
        status: page.status,
        language: "tr",
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

  console.log("Seed verisi baÅŸarÄ±yla yÃ¼klendi.");
}

main()
  .catch((error) => {
    console.error("Seed iÅŸlemi baÅŸarÄ±sÄ±z:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
