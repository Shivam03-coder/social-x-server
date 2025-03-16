import { appEnvConfigs } from "@src/configs";
import { db } from "@src/db";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
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

      const { id, first_name, last_name, image_url } = evt.data;

      const email = evt.data.email_addresses[0]?.email_address;
      const eventType = evt.type;

      console.log(
        `RECEIVED WEBHOOK WITH ID ${id} AND EVENT TYPE OF ${eventType}`
      );

      if (eventType === "user.created" || eventType === "user.updated") {
        await db.user.upsert({
          where: { id },
          update: {
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
          create: {
            id,
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
        });

        console.log(`User ${id} synced to database`);
      }

      res.json(new ApiResponse(200, "USER SYNCED IN DATABASE"));
    }
  );
}
