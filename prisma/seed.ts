import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const eventId = "cm8cyfgr600010wr8kgktuu3g";
const orgId = "cm8cn4qcp00000wavzk4ctgca";
async function main() {
  const title = faker.lorem.sentence();
  const subtitle = faker.lorem.words(5);
  const description = faker.lorem.paragraph();
  const hashtags = faker.helpers
    .arrayElements(["#fun", "#tech", "#event", "#2025"], 2)
    .join(" ");
  const mediaUrl = faker.image.urlPicsumPhotos();
  const additional = faker.lorem.words(3);

  const postData = {
    title,
    subtitle,
    description,
    hashtags,
    mediaUrl,
    additional,
    eventId,
    orgId,
  };

  const res = await db.$transaction(async (tx) => {
    const createdPost = await tx.post.create({ data: postData });
    await tx.event.update({
      where: {
        id: createdPost.eventId!,
      },
      data: {
        postId: createdPost.id,
      },
    });
    return createdPost;
  });
  console.log("Created post:", res);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error creating post:", e);
    await db.$disconnect();
    process.exit(1);
  });
