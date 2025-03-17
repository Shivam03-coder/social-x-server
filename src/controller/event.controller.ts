import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import { ApiResponse, AsyncHandler } from "@src/utils/server-functions";
import { Request, Response } from "express";

export class EventController {
  public static GetEvents = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { orgId } = req.params;
      const user = await GlobalUtils.checkUserId(req);

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
              id: true,
              firstName: true,
            },
          },
          teamClient: {
            select: {
              id: true,
              firstName: true,
            },
          },
          teamMember: {
            select: {
              id: true,
              firstName: true,
            },
          },
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
      const event = await db.event.create({
        data: {
          title,
          startTime,
          endTime,
          description,
          organizationId: orgId,
          teamAdminId: user.id,
        },
      });

      res
        .status(201)
        .json(new ApiResponse(201, "Event created succesfully", event));
    }
  );
}
