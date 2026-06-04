import "dotenv/config";
import { prisma } from "../lib/prisma";

async function seedAdmin() {
  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: "replace-with-secure-hash",
    },
  });
}

async function seedLandingConfig() {
  const existing = await prisma.landingPageConfig.findFirst({
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.landingPageConfig.create({
    data: {
      siteTitle: "Lesaal",
      sections: {
        create: [
          {
            type: "HERO",
            title: "Hero",
            order: 0,
            isVisible: true,
            componentVariant: "DEFAULT",
            textAnimation: "FADE_UP",
            sectionAnimation: "FADE_IN",
            scrollAnimation: "PARALLAX",
            settings: {
              staticText: "Let us help you grow your reach through",
              dynamicWords: ["Social media management", "SEO", "Paid ads"],
            },
          },
          {
            type: "SERVICES_GRID",
            title: "Services",
            order: 1,
            isVisible: true,
            componentVariant: "CARD",
            textAnimation: "FADE_UP",
            sectionAnimation: "FADE_IN",
            scrollAnimation: "REVEAL",
            settings: {
              heading: "Services",
              maxHomeItems: 6,
            },
            items: {
              create: [
                {
                  order: 0,
                  title: "Social Media Management",
                  description: "Content planning and publishing for growth.",
                },
                {
                  order: 1,
                  title: "SEO Optimization",
                  description: "Technical and on-page SEO improvements.",
                },
              ],
            },
          },
        ],
      },
      formFields: {
        create: [
          {
            key: "full_name",
            label: "Full Name",
            type: "text",
            required: true,
            order: 0,
            isVisible: true,
          },
          {
            key: "email",
            label: "Email",
            type: "email",
            required: true,
            order: 1,
            isVisible: true,
          },
        ],
      },
    },
  });
}

async function main() {
  await seedAdmin();
  await seedLandingConfig();

  const [admins, configs, sections] = await Promise.all([
    prisma.adminUser.count(),
    prisma.landingPageConfig.count(),
    prisma.landingSection.count(),
  ]);

  console.log(`Seed complete: admins=${admins}, configs=${configs}, sections=${sections}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
