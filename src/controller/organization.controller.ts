import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import CloudinaryService from "@src/services/cloudinary";
import GetImageUrlFromCloudinary from "@src/services/cloudinary";
import MailService from "@src/services/nodemailer";
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
        const uploadedImage = await CloudinaryService.uploadImages(
          req.file.path
        );
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
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          createdAt: true,
        },
      });

      res.status(200).json(new ApiResponse(200, "Organizations fetched", orgs));
    }
  );
  public static SendInvitations = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await GlobalUtils.checkUserId(req);
      const { emails, role } = req.body;
      const { orgId } = req.params;
      if (!emails || !Array.isArray(emails) || emails.length === 0)
        throw new ApiError(400, "Missing required fields");

      if (!role || !["MEMBER", "CLIENT"].includes(role))
        throw new ApiError(400, "Role must be MEMBER or CLIENT.");

      const isOrg = await db.organization.findFirst({
        where: {
          id: orgId,
          adminId: user.id,
        },
      });
      if (!isOrg) {
        throw new ApiError(403, "Unauthorized to send invitations");
      }

      try {
        await MailService.sendEmail(emails, orgId, role);
        res.json(
          new ApiResponse(
            200,
            `Invitations sent to ${emails.length} ${role}s successfully`
          )
        );
      } catch (error) {
        throw new ApiError(500, "Failed to send invitations");
      }
    }
  );
}
