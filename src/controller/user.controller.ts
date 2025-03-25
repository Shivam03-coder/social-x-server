import { db } from "@src/db";
import { ApiResponse, AsyncHandler } from "@src/utils/server-functions";
import { Request, Response } from "express";
import { getWeek } from "date-fns";

export class UserController {
  public static UserInfo = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
      res.json(new ApiResponse(200, "USER FOUND", user));
    }
  );

  public static UsersByRole = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await db.user.CheckUserId(req);
      const users = await db.user.findMany({
        where: {
          role: {
            in: ["CLIENT", "MEMBER"],
          },
        },
        select: {
          email: true,
          role: true,
        },
      });

      const groupedMember = users.reduce((acc, user) => {
        if (!acc[user.role]) {
          acc[user.role] = [];
        }
        acc[user.role].push(user.email);
        return acc;
      }, {} as Record<string, string[]>);

      res.json(new ApiResponse(200, "USERS BY ROLE", groupedMember));
    }
  );

  public static Notifications = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
      const notifications = await db.notification.findMany({
        where: {
          userId: user.id,
        },
        select: {
          message: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json(new ApiResponse(200, "NOTIFICATIONS FOUND", notifications));
    }
  );

  public static EvnetsJoinedWeeklyStats = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = await db.user.CheckUserId(req);
      const events = await db.event.findMany({
        where: {
          participants: {
            some: {
              userId: user.id,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      const groupedByweek = events.reduce((acc, event) => {
        const date = new Date(event.createdAt);
        const week = getWeek(date);
        const weekKey = `week ${week}`;
        acc[weekKey] = (acc[weekKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const result = Object.entries(groupedByweek).map(([week, events]) => ({
        week,
        events,
      }));
      res.json(new ApiResponse(200, "EVENTS JOINED WEEKLY STATS", result));
    }
  );
}
