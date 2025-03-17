import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import CloudinaryService from "@src/services/cloudinary";
import MailService from "@src/services/nodemailer";
import { OrgMemberRole } from "@prisma/client";
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
      const { orgId, role, email } = req.params;
      const { firstName, lastName } = req.body;

      if (!firstName || !lastName) {
        throw new ApiError(400, "Missing required fields");
      }

      const normalizedRole = role.toUpperCase();

      if (!["MEMBER", "CLIENT"].includes(normalizedRole)) {
        throw new ApiError(400, "Role must be MEMBER or CLIENT.");
      }

      const memberRole = normalizedRole as "MEMBER" | "CLIENT" | "ADMIN";
      const userRole = normalizedRole as OrgMemberRole;

      const org = await db.organization.findFirst({
        where: { id: orgId },
      });

      if (!org) {
        throw new ApiError(404, "Organization not found");
      }

      const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, role: true },
      });

      const result = await db.$transaction(async (tx) => {
        let userId: string;
        let savedUserRole: OrgMemberRole;

        if (!existingUser) {
          const newUser = await tx.user.create({
            data: {
              firstName,
              lastName,
              email: email.toLowerCase(),
              role: userRole,
            },
            select: {
              id: true,
              role: true,
            },
          });
          userId = newUser.id;
          savedUserRole = newUser.role;
        } else {
          userId = existingUser.id;
          savedUserRole = existingUser.role;
        }

        const alreadyMember = await tx.organizationMember.findFirst({
          where: {
            organizationId: orgId,
            memberId: userId,
          },
        });

        if (alreadyMember) {
          throw new ApiError(
            400,
            "User is already a member of this organization."
          );
        }

        await tx.organizationMember.create({
          data: {
            organizationId: orgId,
            memberId: userId,
          },
        });

        return { id: userId, role: savedUserRole };
      });

      GlobalUtils.setCookie(res, "UserId", result.id);
      GlobalUtils.setCookie(res, "UserRole", result.role);

      res
        .status(201)
        .json(
          new ApiResponse(201, "Invitation accepted successfully!", result)
        );
    }
  );

  public static GetOrgMembers = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await GlobalUtils.checkUserId(req);

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
}
