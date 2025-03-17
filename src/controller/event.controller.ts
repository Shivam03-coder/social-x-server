import { OrgMemberRole } from "@prisma/client";
import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import MailService from "@src/services/nodemailer";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class EventController {
  public static GetEvents = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await GlobalUtils.checkUserId(req);
      const query = {
        id: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
      };

      const events = await db.event.findMany({
        where: {
          organizationId: orgId,
          teamAdminId: user.id,
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          teamAdmin: {
            select: {
              ...query,
            },
          },
          participants: {
            where: {
              role: {
                in: ["CLIENT", "MEMBER"],
              },
            },
            select: {
              user: {
                select: {
                  ...query,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json(new ApiResponse(200, "Events fetched", events));
    }
  );

  public static CreateEvent = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await GlobalUtils.checkUserId(req);
      const { title, startTime, endTime, description } = req.body;
      console.log(
        `Creating event for ${startTime} organization ${orgId} by team admin ${user.id}`
      );
      await db.event.create({
        data: {
          title,
          startTime,
          endTime,
          description,
          organizationId: orgId,
          teamAdminId: user.id,
        },
      });

      res.status(201).json(new ApiResponse(201, "Event created succesfully"));
    }
  );

  public static SendEventInvite = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId, eventId } = req.params;
      const { emails, role } = req.body;
      const user = await GlobalUtils.checkUserId(req);

      if (!emails || !Array.isArray(emails) || emails.length === 0)
        throw new ApiError(400, "Missing required fields");

      if (!role || !["MEMBER", "CLIENT"].includes(role))
        throw new ApiError(400, "Role must be MEMBER or CLIENT.");

      const org = await db.organization.findFirst({
        where: {
          id: orgId,
          adminId: user.id,
        },
      });

      if (!org) {
        throw new ApiError(403, "Unauthorized to send invitations");
      }

      const isEvent = await db.event.findUnique({
        where: {
          id: eventId,
          organizationId: org?.id,
        },
      });
      if (!isEvent) {
        throw new ApiError(404, "Event not found");
      }
      try {
        await MailService.sendInviteEmail({
          invitationType: "EVENT",
          emails,
          eventId,
          role,
          orgId,
        });
        res.json(new ApiResponse(200, `Invitations sent  successfully`));
      } catch (error) {
        throw new ApiError(500, "Failed to send invitations");
      }
      res.status(200).json(new ApiResponse(200, "Invite sent successfully"));
    }
  );

  public static AcceptEventInvite = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId, eventId, role, email } = req.params;
      console.log("🚀 ~ EventController ~ orgId:", orgId);

      const { firstName, lastName, instagramId } = req.body;

      if (!firstName || !lastName) {
        throw new ApiError(400, "Missing required fields");
      }

      const normalizedRole = role.toUpperCase();

      if (!["MEMBER", "CLIENT"].includes(normalizedRole)) {
        throw new ApiError(400, "Role must be MEMBER or CLIENT.");
      }

      const userRole = normalizedRole as "MEMBER" | "CLIENT";

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
              email: email.toLowerCase(),
              firstName,
              lastName,
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

        const alreadyMember = await tx.eventParticipant.findFirst({
          where: {
            eventId,
            userId,
          },
        });

        if (alreadyMember) {
          throw new ApiError(400, "User is already a member of this Event.");
        }

        await tx.eventParticipant.create({
          data: {
            userId,
            eventId,
            role: userRole,
          },
        });

        if (instagramId) {
          await tx.event.update({
            where: { id: eventId },
            data: {
              instagramId,
            },
          });
        }

        return {
          id: userId,
          role: userRole === "CLIENT" ? "CLIENT" : "MEMBER",
        };
      });

      if (userRole === "CLIENT") {
        GlobalUtils.setCookie(res, "UserId", result.id);
        GlobalUtils.setCookie(res, "UserRole", userRole);
      }

      res
        .status(200)
        .json(new ApiResponse(200, "Invite accepted successfully", result));
    }
  );
}
