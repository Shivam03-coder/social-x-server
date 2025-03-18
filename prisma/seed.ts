import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  const organizationId = "cm8es8cem00000weot9bqjvy8";
  const teamAdminId = "user_2uV3DG6M3IuMxjNHM1oLYMKWW4B";

  const events = Array.from({ length: 12 }).map(() => ({
    title: faker.company.name() + " Launch Event",
    description: faker.lorem.paragraphs(2),
    startTime: faker.date.soon({ days: 30 }),
    endTime: faker.date.soon({ days: 60 }),
  }));

  for (const event of events) {
    const createdEvent = await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        teamAdminId,
        organizationId,
      },
    });

    console.log(`✅ Created event: ${createdEvent.title}`);
  }

  console.log("✅✅ Seeded 12 events successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding events:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
