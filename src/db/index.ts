import { getAuth } from "@clerk/express";
import { PrismaClient } from "@prisma/client";
import { ApiError } from "@src/utils/server-functions";
import { Request } from "express";

export const db = new PrismaClient().$extends({
  name: "checkUserId",
  model: {
    user: {
      async CheckUserId(req: Request) {
        const { userId } = getAuth(req);
        if (!userId) {
          throw new ApiError(401, "Unauthorized");
        }
        const user = await db.user.findUnique({
          where: { id: userId },
        });
        if (!user) {
          throw new ApiError(404, "User not found");
        }
        return user;
      },
    },
  },
});
