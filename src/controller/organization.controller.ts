import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import CloudinaryService from "@src/services/cloudinary";
import MailService from "@src/services/nodemailer";
import {
  ApiError,
  AsyncHandler,
  ApiResponse,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class OrganizationController {
  public static CreateOrg = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
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
      const user = await db.user.CheckUserId(req);

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
          members: {
            select: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json(new ApiResponse(200, "Organizations fetched", orgs));
    }
  );

  public static SendOrgInvitations = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
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
        await MailService.sendInviteEmail({
          invitationType: "ORGANIZATION",
          emails,
          orgId,
          role,
        });
        res.json(new ApiResponse(200, `Invitations sent  successfully`));
      } catch (error) {
        throw new ApiError(500, "Failed to send invitations");
      }
    }
  );

  public static AcceptOrgInvitation = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId, email } = req.params;
      const Member = await db.user.CheckUserId(req);
      const organization = await db.organization.findFirst({
        where: { id: orgId },
      });
      if (!organization) {
        throw new ApiError(404, "Organization not found.");
      }

      const isMemberOfOrg = await db.organizationMember.findUnique({
        where: {
          uniqueOrgMember: {
            organizationId: orgId,
            memberId: Member.id,
          },
        },
      });
      if (isMemberOfOrg) {
        throw new ApiError(
          400,
          "User is already a member of this organization."
        );
      }

      await db.organizationMember.create({
        data: {
          organizationId: orgId,
          memberId: Member.id,
        },
      });

      GlobalUtils.setCookie(res, "UserId", Member.id);
      GlobalUtils.setCookie(res, "UserRole", "MEMBER");

      res
        .status(201)
        .json(
          new ApiResponse(201, "Invitation accepted successfully!", {
            memberId: Member.id,
          })
        );
    }
  );

  public static GetOrgMembers = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await db.user.CheckUserId(req);

      const org = await db.organization.findFirst({
        where: {
          id: orgId,
          adminId: user.id,
        },
      });

      if (!org) {
        throw new ApiError(404, "Organization not found");
      }

      const members = await db.organizationMember.findMany({
        where: {
          organizationId: org.id,
        },
        select: {
          member: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

      res
        .status(200)
        .json(new ApiResponse(200, "Organization members fetched", members));
    }
  );

  public static DeleteOrganizationByid = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await db.user.CheckUserId(req);
      const org = await db.organization.findFirst({
        where: {
          id: orgId,
          adminId: user.id,
        },
      });
      if (!org) {
        throw new ApiError(404, "Organization not found");
      }
      await db.organization.delete({ where: { id: orgId } });
      res.status(200).json(new ApiResponse(200, "Organization deleted"));
    }
  );
}
