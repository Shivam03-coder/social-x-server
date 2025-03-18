import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import CloudinaryService from "@src/services/cloudinary";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class PostController {
  public static GetPosts = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { eventId, orgId } = req.params;
      const page = parseInt(req.params.page as string) || 1;
      const limit = parseInt(req.params.limit as string) || 10;
      const skip = (page - 1) * limit;

      const { event } = await db.CheckOrgEventAndId(orgId, eventId);
      const posts = await db.post.findMany({
        where: {
          eventId: event.id,
        },
        select: {
          id: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      });
      res.status(200).json(new ApiResponse(200, "Posts fetched", posts));
    }
  );

  public static CreatePost = AsyncHandler(
    async (req: Request, res: Response) => {
      const { eventId, orgId } = req.params;
      Promise.all([
        await db.user.CheckUserId(req),
        await db.CheckOrgEventAndId(orgId, eventId),
      ]);
      const { title, additional, description, hashtags, subtitle } = req.body;

      const mediaUrl = await GlobalUtils.getImageUrl(req);

      if (!title || !hashtags || !description) {
        throw new ApiError(
          400,
          "Title, description, and mediaUrl are required"
        );
      }
      const result = await db.$transaction(async (tx) => {
        const post = await tx.post.create({
          data: {
            title,
            additional,
            description,
            hashtags,
            eventId,
            mediaUrl,
            subtitle,
            orgId,
          },
          select: {
            id: true,
            orgId: true,
            eventId: true,
            additional: true,
            postType: true,
            confirmByClient: true,
            description: true,
            hashtags: true,
            isPublished: true,
            mediaUrl: true,
            subtitle: true,
            title: true,
          },
        });

        if (!post) {
          throw new ApiError(500, "Failed to create post");
        }

        await tx.event.update({
          where: {
            id: post.eventId!,
          },
          data: {
            postId: post.id,
          },
        });
        return post;
      });
      res.json(new ApiResponse(201, "Post created", result));
    }
  );

  public static EditPostByMember = AsyncHandler(
    async (req: Request, res: Response) => {}
  );
}
