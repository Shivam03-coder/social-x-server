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
      const { emails } = req.body;

      const { role } = req.query as { role?: "MEMBER" | "CLIENT" };

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new ApiError(400, "Missing required fields");
      }

      if (!role || !["MEMBER", "CLIENT"].includes(role)) {
        throw new ApiError(400, "Role must be MEMBER or CLIENT.");
      }

      const user = await db.user.CheckUserId(req);

      const [org, event] = await Promise.all([
        db.organization.findFirst({
          where: { id: orgId, adminId: user.id },
        }),
        db.event.findUnique({
          where: { id: eventId, organizationId: orgId },
        }),
      ]);

      if (!org) {
        throw new ApiError(403, "Unauthorized to send invitations");
      }

      if (!event) {
        throw new ApiError(404, "Event not found under this organization");
      }

      let newParticipantIdForThisEvent: string[] = [];

      try {
        const transactionResult = await db.$transaction(async (tx) => {
          const existingUsers = await tx.user.findMany({
            where: {
              email: { in: emails },
            },
            select: {
              id: true,
              email: true,
              role: true,
            },
          });

          if (existingUsers.length > 0) {
            const existingUserIds = existingUsers.map((u) => u.id);

            const alreadyParticipants = await tx.eventParticipant.findMany({
              where: {
                eventId,
                userId: { in: existingUserIds },
              },
              select: { userId: true },
            });

            const alreadyParticipantIds = new Set(
              alreadyParticipants.map((p) => p.userId)
            );

            const newParticipants = existingUsers.filter(
              (u) => !alreadyParticipantIds.has(u.id)
            );

            newParticipantIdForThisEvent = newParticipants.map((p) => p.id);

            if (newParticipants.length > 0) {
              await Promise.all(
                newParticipants.map((participant) =>
                  tx.eventParticipant.create({
                    data: {
                      role,
                      eventId,
                      userId: participant.id,
                    },
                  })
                )
              );

              return new ApiResponse(
                200,
                `${newParticipants.length} members successfully added to the event.`
              );
            } else {
              return new ApiResponse(
                200,
                "All members are already participating in this event."
              );
            }
          } else {
            // No users found: send invite emails
            await MailService.sendInviteEmail({
              emails,
              invitationType: "EVENT",
              orgId,
              role,
            });

            return new ApiResponse(
              200,
              `${emails.length} members successfully invited to the event.`
            );
          }
        });

        if (newParticipantIdForThisEvent.length > 0) {
          await Promise.all(
            newParticipantIdForThisEvent.map((userId) =>
              SocketServices.NotifyUser(userId, {
                notificationType: "ADDED_TO_NEW_EVENT",
                message: `You have been added to the event "${
                  event.title || "Unnamed Event"
                }"`,
              })
            )
          );
        }

        res.json(transactionResult);
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

  // ONLY CLIENT WILL USE IT
  public static AcceptEventInvite = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId, eventId } = req.params;
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
