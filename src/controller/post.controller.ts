import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import { AsyncHandler } from "@src/utils/server-functions";
import { Request, Response } from "express";

export class PostController {
  public static GetPosts = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = db.user.CheckUserId(req);
      const { eventId, orgId } = req.params;
    }
  );
}
