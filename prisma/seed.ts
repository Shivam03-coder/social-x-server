import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const adminId = "user_2uQoZzUF3BbRp6f5sgq8N3Vl8IJ";
const orgId = "cm8cn4qcp00000wavzk4ctgca";

async function main() {
  // Create 12 organizations
  const events = Array.from({ length: 12 }).map(() => {
    const title = faker.lorem.words(3);
    const description = faker.lorem.sentence();
    const startTime = faker.date.future();
    const endTime = faker.date.future({ refDate: startTime });

    return {
      title,
      description,
      startTime,
      endTime,
      organizationId: orgId,
      teamAdminId: adminId,
    };
  });

  // Insert all events
  await db.event.createMany({
    data: events,
  });

  console.log("✅ Seeded 12 events for organization:", orgId);
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
