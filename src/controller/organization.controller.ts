import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import MailService from "@src/services/nodemailer";
import SocketServices from "@src/services/socket.io";
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
      await db.organization.create({
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

      res
        .status(201)
        .json(new ApiResponse(201, "Organization created successfully"));
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
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(new ApiResponse(200, "Organizations fetched", orgs));
    }
  );

  // public static DeleteOrganizationByid = AsyncHandler(
  //   async (req: Request, res: Response): Promise<void> => {
  //     const { orgId } = req.params;
  //     const user = await db.user.CheckUserId(req);
  //     const org = await db.organization.findFirst({
  //       where: {
  //         id: orgId,
  //         adminId: user.id,
  //       },
  //     });
  //     if (!org) {
  //       throw new ApiError(404, "Organization not found");
  //     }
  //     await db.organization.delete({ where: { id: orgId } });
  //     res.status(200).json(new ApiResponse(200, "Organization deleted"));
  //   }
  // );

  // public static GetOrganizationByMemberid = AsyncHandler(
  //   async (req: Request, res: Response): Promise<void> => {
  //     const Member = await db.user.CheckUserId(req);

  //     const getOrgs = await db.organization.findMany({
  //       where: {
  //         events: {
  //           some: {
  //             participants: {
  //               some: {
  //                 userId: Member.id,
  //               },
  //             },
  //           },
  //         },
  //       },
  //       select: {
  //         id: true,
  //         imageUrl: true,
  //         events: {
  //           select: {
  //             id: true,
  //             title: true,
  //             startTime: true,
  //             endTime: true,
  //             instagramId: true,
  //             teamAdmin: {
  //               select: {
  //                 firstName: true,
  //               },
  //             },
  //             post: {
  //               select: {
  //                 isPublished: true,
  //                 id: true,
  //               },
  //             },
  //           },
  //           orderBy: {
  //             startTime: "asc",
  //           },
  //         },
  //         name: true,
  //         slug: true,
  //       },
  //       orderBy: {
  //         createdAt: "desc",
  //       },
  //     });
  //     res.json(new ApiResponse(200, "Organizations fetched", getOrgs));
  //   }
  // );
}
