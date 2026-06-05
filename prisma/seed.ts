import "dotenv/config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_SITE_TITLE, getDefaultFormFields, getDefaultLandingSections } from "../lib/landing-defaults";

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !password || password.length < 8) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) are required for seeding admin user.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
    },
  });
}

async function seedLandingConfig() {
  const defaultSections = getDefaultLandingSections();
  const defaultFields = getDefaultFormFields();

  const existing = await prisma.landingPageConfig.findFirst({
    select: { id: true },
  });

  const configId =
    existing?.id ||
    (
      await prisma.landingPageConfig.create({
        data: {
          siteTitle: DEFAULT_SITE_TITLE,
        },
        select: { id: true },
      })
    ).id;

  await prisma.$transaction(async (tx) => {
    await tx.landingPageConfig.update({
      where: { id: configId },
      data: { siteTitle: DEFAULT_SITE_TITLE },
    });

    await tx.landingSection.deleteMany({
      where: { configId },
    });

    await tx.campaignFormField.deleteMany({
      where: { configId },
    });

    await tx.landingSection.createMany({
      data: defaultSections.map((section, order) => ({
        configId,
        type: section.type,
        title: section.title,
        isVisible: section.isVisible !== false,
        order,
        componentVariant: section.componentVariant,
        textAnimation: section.textAnimation,
        sectionAnimation: section.sectionAnimation,
        scrollAnimation: section.scrollAnimation,
        settings: section.settings ?? null,
      })),
    });

    const createdSections = await tx.landingSection.findMany({
      where: { configId },
      select: { id: true, type: true, order: true },
      orderBy: { order: "asc" },
    });

    for (const section of createdSections) {
      const template = defaultSections.find((entry) => entry.type === section.type && entry.order === section.order);

      if (!template?.items?.length) {
        continue;
      }

      await tx.sectionItem.createMany({
        data: template.items.map((item, itemOrder) => ({
          sectionId: section.id,
          order: typeof item.order === "number" ? item.order : itemOrder,
          label: item.label || null,
          title: item.title || null,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          value: item.value || null,
          extra: item.extra || null,
        })),
      });
    }

    await tx.campaignFormField.createMany({
      data: defaultFields.map((field, order) => ({
        configId,
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required === true,
        placeholder: field.placeholder || null,
        options: field.options || [],
        order,
        isVisible: field.isVisible !== false,
      })),
    });
  });
}

async function main() {
  await seedAdmin();
  await seedLandingConfig();

  const [admins, configs, sections, items, fields] = await Promise.all([
    prisma.adminUser.count(),
    prisma.landingPageConfig.count(),
    prisma.landingSection.count(),
    prisma.sectionItem.count(),
    prisma.campaignFormField.count(),
  ]);

  console.log(
    `Seed complete: admins=${admins}, configs=${configs}, sections=${sections}, items=${items}, formFields=${fields}`
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
