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
  public static UpdatePost = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {}
  );

  public static GetPostById = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await db.user.CheckUserId(req);
      const { postId, orgId } = req.params;
      await db.organization.CheckByOrgId(orgId);

      const postInfo = await db.post.findFirst({
        where: {
          id: postId,
          orgId,
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
}
