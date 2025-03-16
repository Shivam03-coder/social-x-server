import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const adminId = "user_2uONdeX6kqOalEBlqnalyzDCsCd";

  // Create 12 organizations
  const organizations = Array.from({ length: 12 }).map((_, index) => {
    const name = faker.company.name();
    const slug = faker.helpers.slugify(name.toLowerCase());
    const imageUrl = faker.image.urlLoremFlickr({
      category: "business",
      width: 200,
      height: 200,
    });

    return {
      adminId: adminId,
      name: name,
      slug: slug,
      imageUrl: imageUrl,
    };
  });

  // Insert all organizations
  await db.organization.createMany({
    data: organizations,
  });

  console.log("✅ Seeded 12 organizations");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await db.$disconnect();
    process.exit(1);
  });
