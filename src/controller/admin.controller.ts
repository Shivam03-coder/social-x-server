import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import AuthServices from "@src/services/auth";
import MailService from "@src/services/nodemailer";
import SocketServices from "@src/services/socket.io";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class AdminController {
  public static CreateParticipants = AsyncHandler(
    AsyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { firstName, lastName, email, password, role } = req.body;
      const { orgId, eventId } = req.params;

      const [user, org, event] = await Promise.all([
        await db.user.findFirst({
          where: { email },
        }),
        await db.organization.CheckByOrgId(orgId),
        await db.event.CheckEventById(eventId),
      ]);

      if (user) {
        throw new ApiError(400, "User already exists");
      }
      if (!org || !event) {
        throw new ApiError(404, "Organization or Event not found");
      }

      const result = await db.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            firstName,
            lastName,
            email,
            password,
            role,
          },
        });
        const participant = await tx.participants.create({
          data: {
            eventId,
            orgId,
            userId: createdUser.id,
            role,
          },
        });
      });

      res.json(new ApiResponse(201, "Participant created successfully"));
    })
  );

  public static DeleteUser = AsyncHandler(
    AsyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
      const { orgId, eventId } = req.params;

      if (!user) throw new ApiError(404, "User not found");

      await db.$transaction(async (tx) => {
        const participant = await tx.participants.findFirst({
          where: {
            userId: user.id,
            eventId,
            orgId,
          },
        });

        if (!participant) {
          throw new ApiError(404, "Participant not found");
        }

        await tx.participants.delete({
          where: {
            id: participant.id,
          },
        });
      });
      res.json(new ApiResponse(200, "Participant deleted successfully"));
    })
  );

  public static SendInviteRequest = AsyncHandler(
    AsyncHandler(async (req: Request, res: Response): Promise<void> => {
      const admin = await db.user.CheckUserId(req);
      const { userId, eventId, orgId } = req.params;
      if (!userId || !orgId || !eventId) {
        throw new ApiError(400, "Missing required parameters");
      }
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });
      if (!user) throw new ApiError(404, "User not found");

      const isParticipant = await db.participants.findFirst({
        where: {
          userId,
          isInviteAccepted: true,
        },
      });

      if (!isParticipant) {
        MailService.sendInviteEmail({
          eventId,
          orgId,
          role: user.role,
          email: user.email,
        });
        res.json(new ApiResponse(200, "Invite request sent successfully"));
      }

      const isParticipantInThisEvent = await db.participants.findFirst({
        where: {
          userId,
          eventId,
          orgId,
          isInviteAccepted: true,
        },
      });

      if (isParticipantInThisEvent) {
        throw new ApiError(400, "User is already a participant of this event");
      }

      const addedParticipants = await db.participants.create({
        data: {
          userId,
          eventId,
          orgId,
          isInviteAccepted: false,
        },
        select: {
          userId: true,
          event: {
            select: {
              title: true,
            },
          },
        },
      });

      SocketServices.NotifyUser(addedParticipants.userId, {
        message: `You have been added to ${addedParticipants.event.title}`,
      });

      res.json(new ApiResponse(200, "User Added successfully"));
    })
  );

  public static AcceptInvite = AsyncHandler(
    AsyncHandler(async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
      const { eventId, orgId } = req.params;

      if (!user) throw new ApiError(404, "User not found");

      await db.$transaction(async (tx) => {
        const participant = await tx.participants.findFirst({
          where: {
            userId: user.id,
            eventId,
            orgId,
          },
        });

        if (!participant) {
          throw new ApiError(404, "Participant not found");
        }

        await tx.participants.update({
          where: {
            id: participant.id,
          },
          data: {
            isInviteAccepted: true,
          },
        });
      });

      const { accessToken, refreshToken } = AuthServices.generateTokens(user);

      GlobalUtils.setMultipleCookies(res, [
        { name: "accessToken", value: accessToken, httpOnly: true },
        { name: "refreshToken", value: refreshToken, httpOnly: true },
        { name: "UserRole", value: user.role, httpOnly: false },
        { name: "UserId", value: user.id, httpOnly: false },
      ]);

      res.status(200).json({ message: "Invite accepted" });
    })
  );
}
