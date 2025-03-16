import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import GetImageUrlFromCloudinary from "@src/libs/cloudinary";
import { DecryptedRequest } from "@src/types/types";
import {
  ApiError,
  AsyncHandler,
  ApiResponse,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class OrganizationController {
  public static CreateOrg = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await GlobalUtils.checkUserId(req);
      const { name, slug } = req.body;

      if (!name || !slug) {
        throw new ApiError(400, "Missing required fields");
      }
      console.log(name, slug);

      let imageUrl: string | null = null;

      if (req.file && req.file.path) {
        const uploadedImage = await GetImageUrlFromCloudinary(req.file.path);
        if (!uploadedImage) {
          throw new ApiError(500, "Image upload failed");
        }
        imageUrl = uploadedImage as string;
      }

      const newOrg = await db.organization.create({
        data: {
          name,
          slug,
          imageUrl,
          adminId: user.id,
        },
        select: {
          adminId: true,
        },
      });

      res
        .status(201)
        .json(
          new ApiResponse(201, "Organization created successfully", newOrg)
        );
    }
  );

  public static GetOrgs = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await GlobalUtils.checkUserId(req);

      const orgs = await db.organization.findMany({
        where: {
          adminId: user.id,
        },
      });

      res.status(200).json(new ApiResponse(200, "Organizations fetched", orgs));
    }
  );
}
