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
      const { text, role } = req.body;

      if (!text) {
        throw new ApiError(400, "Missing required fields");
      }

      const events = await db.event.findMany({
        where: {
          title: {
            contains: text,
          },
          participants: {
            some: {
              userId: user.id,
              role: role,
            },
          },
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
        },
        orderBy: {
          startTime: "asc",
        },
      });

      res.json(new ApiResponse(200, "Events found", events));
    }
  );

  // public static AcceptEventInvite = AsyncHandler(
  //   async (req: Request, res: Response): Promise<void> => {
  //     const { orgId, eventId, role, email } = req.params;

  //     const { firstName, lastName, instagramId } = req.body;

  //     if (!firstName || !lastName) {
  //       throw new ApiError(400, "Missing required fields");
  //     }

  //     const normalizedRole = role.toUpperCase();

  //     if (!["MEMBER", "CLIENT"].includes(normalizedRole)) {
  //       throw new ApiError(400, "Role must be MEMBER or CLIENT.");
  //     }

  //     const userRole = normalizedRole as "MEMBER" | "CLIENT";

  //     const org = await db.organization.findFirst({
  //       where: { id: orgId },
  //     });

  //     if (!org) {
  //       throw new ApiError(404, "Organization not found");
  //     }

  //     const existingUser = await db.user.findUnique({
  //       where: { email: email.toLowerCase() },
  //       select: { id: true, role: true },
  //     });

  //     const result = await db.$transaction(async (tx) => {
  //       let userId: string;
  //       let savedUserRole: OrgMemberRole;

  //       if (!existingUser) {
  //         const newUser = await tx.user.create({
  //           data: {
  //             email: email.toLowerCase(),
  //             firstName,
  //             lastName,
  //             role: userRole,
  //           },
  //           select: {
  //             id: true,
  //             role: true,
  //           },
  //         });
  //         userId = newUser.id;
  //         savedUserRole = newUser.role;
  //       } else {
  //         userId = existingUser.id;
  //         savedUserRole = existingUser.role;
  //       }

  //       const alreadyMember = await tx.eventParticipant.findFirst({
  //         where: {
  //           eventId,
  //           userId,
  //         },
  //       });

  //       if (alreadyMember) {
  //         throw new ApiError(400, "User is already a member of this Event.");
  //       }

  //       await tx.eventParticipant.create({
  //         data: {
  //           userId,
  //           eventId,
  //           role: userRole,
  //         },
  //       });

  //       if (instagramId) {
  //         await tx.event.update({
  //           where: { id: eventId },
  //           data: {
  //             instagramId,
  //           },
  //         });
  //       }

  //       return {
  //         id: userId,
  //         role: userRole === "CLIENT" ? "CLIENT" : "MEMBER",
  //       };
  //     });

  //     if (userRole === "CLIENT") {
  //       GlobalUtils.setCookie(res, "UserId", result.id);
  //       GlobalUtils.setCookie(res, "UserRole", userRole);
  //     }

  //     res
  //       .status(200)
  //       .json(new ApiResponse(200, "Invite accepted successfully", result));
  //   }
  // );
}
