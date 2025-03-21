import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import MailService from "@src/services/nodemailer";
import SocketServices from "@src/services/socket.io";
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const user = await db.user.CheckUserId(req);
      const query = {
        id: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
      };
      const skip = (page - 1) * limit;
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
        skip: skip,
        take: limit,
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
      const user = await db.user.CheckUserId(req);
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
      const user = await db.user.CheckUserId(req);

      if (!emails || !Array.isArray(emails) || emails.length === 0)
        throw new ApiError(400, "Missing required fields");

      if (!role || !["MEMBER", "CLIENT"].includes(role))
        throw new ApiError(400, "Role must be MEMBER or CLIENT.");

      const org = await db.organization.findFirst({
        where: { id: orgId, adminId: user.id },
      });

      if (!org) throw new ApiError(403, "Unauthorized to send invitations");

      const event = await db.event.findUnique({
        where: { id: eventId, organizationId: org.id },
      });

      if (!event)
        throw new ApiError(404, "Event not found under this organization.");

      let newMembersIdForThisEvent: string[] = [];

      try {
        const transactionResult = await db.$transaction(async (tx) => {
          const users = await tx.user.findMany({
            where: {
              email: { in: emails },
            },
            select: {
              id: true,
              email: true,
              role: true,
            },
          });

          if (users.length === 0)
            return new ApiResponse(404, "No matching users found");

          const existingUserId = users.map((u) => u.id);
          const existingUserEmails = users.map((u) => u.email);

          if (role === "MEMBER") {
            const alreadyMembersOfThisEvnet =
              await tx.eventParticipant.findMany({
                where: {
                  eventId,
                  userId: { in: existingUserId },
                },
                select: { userId: true },
              });

            const alreadyMembersOfThisEvnetIds = new Set(
              alreadyMembersOfThisEvnet.map((m) => m.userId)
            );

            const newMembers = users.filter(
              (user) => !alreadyMembersOfThisEvnetIds.has(user.id)
            );
            newMembersIdForThisEvent = newMembers.map((m) => m.id);
            if (newMembers.length > 0) {
              await Promise.all(
                newMembers.map((member) =>
                  tx.eventParticipant.create({
                    data: {
                      role: "MEMBER",
                      eventId,
                      userId: member.id,
                    },
                  })
                )
              );

              return new ApiResponse(
                200,
                `${newMembers.length} members successfully added to the event.`
              );
            } else {
              return new ApiResponse(
                200,
                "All members are already participating in this event."
              );
            }
          }

          if (role === "CLIENT") {
            const participants = await tx.eventParticipant.findMany({
              where: {
                eventId,
                userId: { in: existingUserId },
              },
            });

            const alreadyClientIds = new Set(participants.map((p) => p.userId));

            const newClients = users.filter(
              (user) => !alreadyClientIds.has(user.id)
            );

            if (newClients.length > 0) {
              await Promise.all(
                newClients.map((client) =>
                  tx.eventParticipant.create({
                    data: {
                      role: "CLIENT",
                      eventId,
                      userId: client.id,
                    },
                  })
                )
              );
            }

            const nonExistingEmails = emails.filter(
              (email) => !existingUserEmails.includes(email)
            );

            if (nonExistingEmails.length > 0) {
              await MailService.sendInviteEmail({
                invitationType: "EVENT",
                emails: nonExistingEmails,
                eventId,
                role,
                orgId,
              });
            }

            return new ApiResponse(
              200,
              `Clients processed successfully. ${
                newClients.length > 0
                  ? `${newClients.length} clients added. `
                  : ""
              }${
                nonExistingEmails.length > 0
                  ? `Invitations sent to ${nonExistingEmails.length} new emails.`
                  : ""
              }`
            );
          }

          // If the role was neither MEMBER nor CLIENT
          return new ApiResponse(400, "Invalid role type specified.");
        });

        await Promise.all(
          newMembersIdForThisEvent.map((userId) =>
            SocketServices.NotifyUser(userId, {
              notificationType: "ADDED_TO_NEW_EVENT",
              message: `You have been added to the  ${event.title}`,
            })
          )
        );

        res.json(
          new ApiResponse(transactionResult.code, transactionResult.message)
        );
      } catch (error) {
        console.error("SendEventInvite error:", error);
        throw new ApiError(500, "Failed to process event invitation.");
      }
    }
  );

  public static GetEventsbytext = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
      const role = (req.query.role as "MEMBER") || "CLIENT";
      const text = req.query.text as string;
      console.log("🚀 ~ EventController ~ text:", text);
      console.log("🚀 ~ EventController ~ role:", role);

      if (!text || text.trim() === "") {
        throw new ApiError(400, "Search text is required");
      }

      const events = await db.event.findMany({
        where: {
          OR: [
            {
              title: {
                contains: text,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: text,
                mode: "insensitive",
              },
            },
            {
              teamAdmin: {
                firstName: {
                  contains: text,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
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
          _count: {
            select: {
              participants: true,
            },
          },
          description: true,
        },
        orderBy: {
          startTime: "asc",
        },
      });

      res.json(new ApiResponse(200, "Events found", events));
    }
  );

  // THIS IS ONLY FOR CLIENT CAUSE CLIENT WILL BE ADDED TO EVENTS ONLY NOT  IN ORG NAD BEFORE ACCEPTING INVITE HE IS AUTHENICATED

  public static AcceptEventInvite = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId, eventId, role, email } = req.params;
      const user = await db.user.CheckUserId(req);
      const { instagramId, instagramIdPassword } = req.body;

      if (instagramId || !instagramIdPassword) {
        throw new ApiError(400, "Missing required fields");
      }

      const [org, event] = await Promise.all([
        db.organization.CheckByOrgId(orgId),
        db.event.CheckEventById(eventId),
      ]);

      if (!org || !event) {
        throw new ApiError(404, "Organization and Event not found");
      }

      const results = await db.$transaction(async (tx) => {
        const client = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            role: "CLIENT",
          },
          select: {
            id: true,
            role: true,
          },
        });

        // NOW UPADTE EVENT WITH INSTAID AND PASSWORD
        await tx.event.update({
          where: {
            id: eventId,
          },
          data: {
            instagramId,
            instagramIdPassword,
          },
        });

        //  NOW ADD HIM IN EVENT
        await tx.eventParticipant.create({
          data: {
            role: "CLIENT",
            eventId,
            userId: user.id,
          },
        });

        return {
          id: client.id,
          role: client.role,
        };
      });

      GlobalUtils.setCookie(res, "UserId", results.id);
      GlobalUtils.setCookie(res, "UserRole", results.role);

      res.json(new ApiResponse(200, "Invite accepted successfully"));
    }
  );
}
