import { appEnvConfigs } from "@src/configs";
import { db } from "@src/db";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/helpers/server-functions";
import { Request, Response } from "express";
import { Webhook } from "svix";

export class ClerkWebhookController {
  public static UserSync = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const SIGNING_SECRET = appEnvConfigs.SIGNING_SECRET;

      if (!SIGNING_SECRET) {
        throw new ApiError(
          400,
          "PLEASE ADD SIGNING_SECRET FROM CLERK DASHBOARD TO .ENV"
        );
      }

      const wh = new Webhook(SIGNING_SECRET);
      const headers = req.headers;
      const payload = req.body;

      const svix_id = headers["svix-id"];
      const svix_timestamp = headers["svix-timestamp"];
      const svix_signature = headers["svix-signature"];

      if (!svix_id || !svix_timestamp || !svix_signature) {
        throw new ApiError(400, "MISSING REQUIRED HEADERS");
      }

      let evt: any;

      try {
        evt = wh.verify(JSON.stringify(payload), {
          "svix-id": svix_id as string,
          "svix-timestamp": svix_timestamp as string,
          "svix-signature": svix_signature as string,
        });
      } catch (err) {
        throw new ApiError(401, "INVALID SIGNATURE");
      }

      const { id, first_name, last_name, image_url, public_metadata } =
        evt.data;

      const email = evt.data.email_addresses[0]?.email_address;
      const eventType = evt.type;

      console.log(
        `RECEIVED WEBHOOK WITH ID ${id} AND EVENT TYPE OF ${eventType}`
      );

      // Extract role from Clerk's `public_metadata` or fallback to "CLIENT"
      const roleFromMetadata = public_metadata?.role;
      const role = roleFromMetadata || "CLIENT";

      if (eventType === "user.created" || eventType === "user.updated") {
        await db.user.upsert({
          where: { id },
          update: {
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            role, // Save role on update
          },
          create: {
            id,
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
            role, // Save role on create
          },
        });
      }

      if (
        eventType === "organization.created" ||
        eventType === "organization.updated"
      ) {
        const { id, name, slug, logo_url, created_by } = evt.data;
        await db.organization.upsert({
          where: { id },
          update: {
            name: evt.data.name,
          },
          create: {
            id: id,
            name: name,
            slug: slug,
            imageUrl: logo_url,
            members: {
              create: {
                role: "ADMIN",
                userId: created_by,
              },
            },
          },
        });
        console.log(`Organization ${id} created`);
      }
      if (
        eventType === "organizationMembership.created" ||
        eventType === "organizationMembership.updated"
      ) {
        const { id, organization, public_user_data, role, status } = evt.data;

        let membershipStatus =
          status === "active" ? "ACCEPTED" : status.toUpperCase();

        await db.organizationMember.upsert({
          where: { id },
          update: {
            role,
            status: membershipStatus,
          },
          create: {
            id,
            organizationId: organization.id,
            userId: public_user_data.user_id,
            role,
            status: membershipStatus,
          },
        });

        console.log(
          `Membership ${membershipStatus} for user ${public_user_data.user_id} in org ${organization.id}`
        );
      }

      res.status(200).json(new ApiResponse(201, "USER SYNCED IN DATABASE"));
    }
  );
}
