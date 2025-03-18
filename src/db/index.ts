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
    organization: {
      async FindOrgById(id: string) {
        const org = await db.organization.findUnique({
          where: { id },
        });
        if (!org) {
          throw new ApiError(404, "Organization not found");
        }
        return org;
      },
    },
    event: {
      async FindEventById(id: string) {
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
      async findPostById(id: string) {
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
  client: {
    async CheckOrgEventAndId(orgId: string, eventId: string) {
      const [organization, event] = await Promise.all([
        await db.organization.FindOrgById(orgId),
        await db.event.FindEventById(eventId),
      ]);
      if (!organization || !event) {
        throw new ApiError(404, "Organization or event not found");
      }

      if (event.organizationId !== orgId) {
        throw new ApiError(403, "Unauthorized to access this event");
      }
      return { organization, event };
    },
  },
});
