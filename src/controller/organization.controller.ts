import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
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

      const imageUrl = await GlobalUtils.getImageUrl(req);
      const newOrg = await db.organization.create({
        data: {
          name,
          slug,
          imageUrl,
          adminId: user.id,
        },
        select: {
          id: true,
        },
      });

      res.status(201).json(
        new ApiResponse(201, "Organization created successfully", {
          orgId: newOrg.id,
        })
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
      const { emails } = req.body;
      const { orgId } = req.params;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new ApiError(
          400,
          "Emails are required and must be a non-empty array."
        );
      }

      const organization = await db.organization.findFirst({
        where: {
          id: orgId,
          adminId: user.id,
        },
      });

      if (!organization) {
        throw new ApiError(
          403,
          "Unauthorized to send invitations to this organization."
        );
      }

      try {
        await db.$transaction(async () => {
          const [membersOfAnyOrg, membersOfThisOrg] = await Promise.all([
            db.organizationMember.findMany({
              where: { member: { email: { in: emails } } },
              select: { member: { select: { id: true, email: true } } },
            }),
            db.organizationMember.findMany({
              where: {
                organizationId: orgId,
                member: { email: { in: emails } },
              },
              select: { memberId: true },
            }),
          ]);

          const memberIdsOfAnyOrg = new Set(
            membersOfAnyOrg.map(({ member }) => member.id)
          );
          const memberEmailsOfAnyOrg = new Set(
            membersOfAnyOrg.map(({ member }) => member.email)
          );
          const memberIdsOfThisOrg = new Set(
            membersOfThisOrg.map((m) => m.memberId)
          );

          const newMemberIdsForThisOrg = Array.from(memberIdsOfAnyOrg).filter(
            (id) => !memberIdsOfThisOrg.has(id)
          );

          if (newMemberIdsForThisOrg.length > 0) {
            const createData = newMemberIdsForThisOrg.map((memberId) => ({
              organizationId: orgId,
              memberId,
            }));

            await db.organizationMember.createMany({
              data: createData,
            });
          }

          const emailsToInvite = emails.filter(
            (email) => !memberEmailsOfAnyOrg.has(email)
          );

          if (emailsToInvite.length > 0) {
            await MailService.sendInviteEmail({
              emails: emailsToInvite,
              invitationType: "ORGANIZATION",
              orgId,
              role: "MEMBER",
            });
          }

          res.json(new ApiResponse(200, "Invitations sent successfully."));
        });
      } catch (error: any) {
        console.error("Error sending organization invitations:", error);
        throw new ApiError(500, "Failed to send invitations.");
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

      res.status(201).json(
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

  public static GetOrganizationByMemberid = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const Member = await db.user.CheckUserId(req);

      const getOrgs = await db.organization.findMany({
        where: {
          members: {
            some: {
              memberId: Member.id,
            },
          },
        },
        select: {
          id: true,
          imageUrl: true,
          events: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              instagramId: true,
            },
          },
          name: true,
          slug: true,
        },
      });
      res.json(new ApiResponse(200, "Organizations fetched", getOrgs));
    }
  );
}
