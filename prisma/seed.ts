import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const userId = "user_2u4Yn2zzFio5OnX0lv3Gn4mLK2W";
  const accountId = "08c4a129-3bfe-4715-b9e8-0a6435043aa6";

  const transactions = Array.from({ length: 5 }).map(() => ({
    userId,
    accountId,
    type: faker.helpers.arrayElement(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: parseFloat(faker.finance.amount({ min: 125.32, max: 1290.23 })),
    description: faker.lorem.sentence(),
    date: faker.date.between({
      from: "2024-01-01T00:00:00.000Z",
      to: "2025-01-01T00:00:00.000Z",
    }),
    category: faker.helpers.arrayElement([
      "Food",
      "Transport",
      "Utilities",
      "Entertainment",
      "Health",
    ]),
    receiptUrl: faker.internet.url(),
    isRecurring: faker.datatype.boolean(),
    recurringInterval: faker.helpers.arrayElement([
      null,
      "DAILY",
      "WEEKLY",
      "MONTHLY",
    ]),
    nextRecurringDate: null,
    lastProcessed: null,
    status: faker.helpers.arrayElement(["PENDING", "COMPLETED", "REJECTED"]),
  }));

  await db.transaction.createMany({
    data: transactions,
  });
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
