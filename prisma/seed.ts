import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  const organizationId = "cm8eupyi600020w0rzksl77v1";
  const teamAdminId = "user_2uV3DG6M3IuMxjNHM1oLYMKWW4B";

  const events = Array.from({ length: 12 }).map(() => ({
    title: faker.word.words(2),
    description: faker.word.words(5),
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

    console.log(
      `✅ Created event: ${createdEvent.title} (ID: ${createdEvent.id})`
    );

    // Create a post related to this event
    const post = await prisma.post.create({
      data: {
        title: `Post about ${createdEvent.title}`,
        subtitle: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        hashtags: faker.lorem.words(10).split(" ").join(", "),
        additional: faker.lorem.sentences(2),
        mediaUrl: faker.image.urlPicsumPhotos(),
        eventId: createdEvent.id,
        orgId: organizationId,
      
      },
    });

    console.log(`📝 Created post for event: ${post.title}`);
  }

  console.log("✅✅ Seeded 12 events and their posts successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding events and posts:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
