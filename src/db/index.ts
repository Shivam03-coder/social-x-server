import { PrismaClient } from "@prisma/client";
import { getAuthUser } from "@src/utils/get-auth-user";
import { ApiError } from "@src/utils/server-functions";
import { Request } from "express";

export const db = new PrismaClient().$extends({
  name: "checkUserId",
  model: {
    user: {
      async CheckUserId(req: Request) {
        const { userId } = getAuthUser(req);
        if (!userId) {
          throw new ApiError(401, "Unauthorized");
        }
        const user = await db.user.findFirst({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });
        if (!user) {
          throw new ApiError(404, "User not found");
        }
        return user;
      },
    },
    event: {
      async CheckEventById(id: string) {
        const event = await db.event.findUnique({
          where: { id },
        });
        if (!event) {
          throw new ApiError(404, "Event not found");
        }
        return event;
      },
    },
    post: {
      async CheckPostById(id: string) {
        const post = await db.post.findUnique({
          where: { id },
        });
        if (!post) {
          throw new ApiError(404, "Post not found");
        }
        return post;
      },
    },
  },
});
