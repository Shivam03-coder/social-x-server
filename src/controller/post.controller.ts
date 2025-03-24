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

      const { orgId, eventId } = req.params;
      const { title, subtitle, description, additional, hashtags, mediaUrl } =
        req.body;

      const missingFields = [
        "title",
        "subtitle",
        "description",
        "mediaUrl",
      ].filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        throw new ApiError(
          400,
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      try {
        const result = await db.$transaction(async (tx) => {
          const event = await tx.event.findFirst({
            where: {
              id: eventId,
            },
            select: {
              post: {
                select: {
                  id: true,
                },
              },
            },
          });

          if (!event) {
            throw new ApiError(404, "Post not found in the event");
          }

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

          const updatedPost = await tx.post.updateMany({
            where: {
              id: event.post?.id,
            },
            data: payload,
          });

          if (updatedPost.count === 0) {
            throw new ApiError(404, "No posts found for this event");
          }

          return { eventId, updatedPostCount: updatedPost.count };
        });

        res.json(new ApiResponse(200, "Post updated successfully", result));
      } catch (error) {
        console.error("Transaction failed:", error);
        res.json(new ApiError(500, "Post update failed"));
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

  public static ConfirmPostByClient = AsyncHandler(
    async (req: Request, res: Response) => {
      await db.user.CheckUserId(req);
      const { postId } = req.params;
      await db.post.CheckPostById(postId);
      const post = await db.post.update({
        where: { id: postId },
        data: { confirmByClient: true },
      });
      if (post) {
        res.json(
          new ApiResponse(200, "Post confirmed by client successfully", post)
        );
      } else {
        throw new ApiError(404, "Post not found");
      }
    }
  );

  public static CreateComment = AsyncHandler(
    async (req: Request, res: Response) => {
      const user = await db.user.CheckUserId(req);
      const { postId } = req.params;
      const { content } = req.body;
      await db.post.CheckPostById(postId);
      const comment = await db.comment.create({
        data: {
          content,
          postId,
          userId: user.id,
          commentedBy: user.role,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
            },
          },
          commentedBy: true,
        },
      });
      res.json(new ApiResponse(200, "Comment created successfully", comment));
    }
  );

  public static GetCommentsByPost = AsyncHandler(
    async (req: Request, res: Response) => {
      const user = await db.user.CheckUserId(req);
      const { postId } = req.params;
      await db.post.CheckPostById(postId);
      const comment = await db.comment.findMany({
        where: {
          postId,
          userId: user.id,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
            },
          },
          commentedBy: true,
        },
      });
      res.json(new ApiResponse(200, "Comment Fetched successfully", comment));
    }
  );

  public static DeleteComment = AsyncHandler(
    async (req: Request, res: Response) => {
      const user = await db.user.CheckUserId(req);
      const { commentId } = req.params;
      await db.comment.delete({
        where: {
          id: commentId,
          userId: user.id,
        },
      });
      res.json(new ApiResponse(200, "Comment deleted successfully"));
    }
  );
}
