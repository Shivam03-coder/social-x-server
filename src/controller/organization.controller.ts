import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import { DecryptedRequest } from "@src/types/types";
import {
  ApiError,
  AsyncHandler,
  ApiResponse,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class OrganizationController {
  // ====   ORGANIZATION CREATION ====
  public static CreateOrg = AsyncHandler(
    async (req: DecryptedRequest, res: Response): Promise<void> => {
      const user = await GlobalUtils.checkUserId(req);
      const { name, slug, imageUrl } = await GlobalUtils.getDecryptedData(
        req.decryptedData
      );
      if (!name || !slug) {
        throw new ApiError(400, "Missing required fields");
      }

      const newOrg = await db.organization.create({
        data: { name, slug, imageUrl, adminId: user.id },
      });

      const response = new ApiResponse(201, "Organization created", newOrg);
    }
  );
}
