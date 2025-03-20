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

      console.log(orgs);

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
        const { emailsToInvite } = await db.$transaction(async (tx) => {
          const [existingMemberOfAnyOrg, existingMemberOfThisOrg] =
            await Promise.all([
              tx.organizationMember.findMany({
                where: { member: { email: { in: emails } } },
                select: { member: { select: { id: true, email: true } } },
              }),
              tx.organizationMember.findMany({
                where: {
                  organizationId: orgId,
                  member: { email: { in: emails } },
                },
                select: { memberId: true },
              }),
            ]);

          const existingUserIdsInAnyOrg = new Set(
            existingMemberOfAnyOrg.map(({ member }) => member.id)
          );
          const existingUserEmailsInAnyOrg = new Set(
            existingMemberOfAnyOrg.map(({ member }) => member.email)
          );
          const existingUserIdsInThisOrg = new Set(
            existingMemberOfThisOrg.map((m) => m.memberId)
          );

          const newMemberIdsForThisOrg = Array.from(
            existingUserIdsInAnyOrg
          ).filter((id) => !existingUserIdsInThisOrg.has(id));

          if (newMemberIdsForThisOrg.length > 0) {
            const createData = newMemberIdsForThisOrg.map((memberId) => ({
              organizationId: orgId,
              memberId,
            }));

            await tx.organizationMember.createMany({
              data: createData,
            });
          }

          const emailsToInvite = emails.filter(
            (email) => !existingUserEmailsInAnyOrg.has(email)
          );
          return { emailsToInvite };
        });
        if (emailsToInvite.length > 0) {
          await MailService.sendInviteEmail({
            emails: emailsToInvite,
            invitationType: "ORGANIZATION",
            orgId,
            role: "MEMBER",
          });
        }

        // 3️⃣ Send the response after everything is done
        res.json(new ApiResponse(200, "Invitations sent successfully."));
      } catch (error: any) {
        console.error("Error sending organization invitations:", error);
        throw new ApiError(500, "Failed to send invitations.");
      }
    }
  );

  public static AcceptOrgInvitation = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await db.user.CheckUserId(req);
      const organization = await db.organization.findFirst({
        where: { id: orgId },
      });
      if (!organization) {
        throw new ApiError(404, "Organization not found.");
      }

      const result = await db.$transaction(async (tx) => {
        const [joinedMember, _] = await Promise.all([
          tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              role: "MEMBER",
            },
            select: {
              id: true,
              role: true,
            },
          }),
          tx.organizationMember.create({
            data: {
              organizationId: orgId,
              memberId: user.id,
            },
          }),
        ]);

        return { id: joinedMember.id, role: joinedMember.role };
      });

      GlobalUtils.setCookie(res, "UserId", result.id);
      GlobalUtils.setCookie(res, "UserRole", result.role);

      res.status(201).json(
        new ApiResponse(201, "Invitation accepted successfully!", {
          memberId: result.id,
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
              teamAdmin: {
                select: {
                  firstName: true,
                },
              },
              post: {
                select: {
                  isPublished: true,
                  id: true,
                },
              },
            },
            orderBy: {
              startTime: "asc",
            },
          },
          name: true,
          slug: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json(new ApiResponse(200, "Organizations fetched", getOrgs));
    }
  );
}
