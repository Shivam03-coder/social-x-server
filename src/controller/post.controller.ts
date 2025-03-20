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

  public static UpdatePost = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {}
  );
}
