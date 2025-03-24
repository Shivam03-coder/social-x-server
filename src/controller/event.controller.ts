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

  public static DeleteEvents = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId, eventId } = req.params;
      const user = await db.user.CheckUserId(req);
      const event = await db.event.CheckEventById(eventId);
      if (event.organizationId !== orgId || event.teamAdminId !== user.id) {
        throw new ApiError(403, "Unauthorized to delete event");
      }
      await db.event.delete({
        where: { id: eventId },
      });

      res.status(200).json(new ApiResponse(200, "Event deleted successfully"));
    }
  );

  public static CreateEvent = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await db.user.CheckUserId(req);
      const {
        additional,
        description,
        endTime,
        organizationId,
        startTime,
        title,
      } = req.body;
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
  public static GetEventDetailsById = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { eventId } = req.params;

      const user = await db.user.CheckUserId(req);
      if (!user) {
        res.status(401).json(new ApiResponse(401, "Unauthorized user"));
        return;
      }

      const event = await db.event.CheckEventById(eventId);
      if (!event) {
        res.status(404).json(new ApiResponse(404, "Event not found"));
        return;
      }

      const eventDetails = await db.event.findFirst({
        where: {
          id: eventId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          additional: true,
          startTime: true,
          endTime: true,
          instagramId: true,
          instagramIdPassword: true,
          teamAdmin: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          participants: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      res
        .status(200)
        .json(new ApiResponse(200, "Event details fetched", eventDetails));
    }
  );

  public static GetEventDetailsbyParticipantId = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);

      const participantJoinedEvent = await db.event.findMany({
        where: {
          participants: {
            some: {
              userId: user.id,
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

      if (!participantJoinedEvent) {
        throw new ApiError(404, "Participant not joined any event");
      }

      res.json(
        new ApiResponse(
          200,
          "Participant details found",
          participantJoinedEvent
        )
      );
    }
  );
}
