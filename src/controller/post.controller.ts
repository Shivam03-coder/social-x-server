import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import { ScanImage } from "@src/services/ai";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class PostController {
  public static UpdatePost = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await db.user.CheckUserId(req);

      const { postId, orgId } = req.params;
      const { title, subtitle, description, additional, hashtags, mediaUrl } =
        req.body;

      const missingFields = [
        "title",
        "subtitle",
        "description",
        "mediaUrl",
      ].filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        res.json(
          new ApiError(
            400,
            `Missing required fields: ${missingFields.join(", ")}`
          )
        );
      }

      try {
        const result = await db.$transaction(async (tx) => {
          const event = await tx.event.findFirst({
            where: {
              post: {
                id: postId,
              },
            },
            select: {
              id: true,
            },
          });

          if (!event) {
            throw new ApiError(404, "Post not found in the event");
          }

          const eventId = event.id;

          const payload = {
            title,
            subtitle,
            description,
            additional,
            hashtags,
            mediaUrl,
            orgId,
            eventId,
          };

          await tx.post.upsert({
            where: { id: postId },
            update: payload,
            create: payload,
          });

          return event;
        });
        res.json(new ApiResponse(200, "Post updated successfully", result));
      } catch (error) {
        console.error("Transaction failed:", error);
        res.json(new ApiError(500, "Post updated  failed"));
      }
    }
  );

  public static GetPostById = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await db.user.CheckUserId(req);
      const { postId } = req.params;

      const postInfo = await db.post.findFirst({
        where: {
          id: postId,
        },
        select: {
          id: true,
          title: true,
          hashtags: true,
          description: true,
          subtitle: true,
          additional: true,
          mediaUrl: true,
          isPublished: true,
          confirmByClient: true,
          postType: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!postInfo) {
        throw new ApiError(404, "Post not found");
      }
      res.json(new ApiResponse(200, "Post fetched", postInfo));
    }
  );

  public static GetMediaUrl = AsyncHandler(
    async (req: Request, res: Response) => {
      await db.user.CheckUserId(req);
      const { aiHelp } = req.body;
      const imageUrl = await GlobalUtils.getImageUrl(req);
      if (imageUrl && aiHelp) {
        const data = await ScanImage(imageUrl);
        if (data) {
          res.json(
            new ApiResponse(200, "MEDIA URL FOUND", {
              imageUrl,
              ai: { ...data },
            })
          );
        } else {
          throw new ApiError(500, "Failed to scan image using AI");
        }
      }
      res.json(new ApiResponse(200, "MEDIA URL FOUND", { imageUrl }));
    }
  );
}
