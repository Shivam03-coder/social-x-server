import { ClerkWebhookController } from "@src/controller/clerk-webhook.controller";
import bodyParser from "body-parser";
import { Router } from "express";

const authRouter = Router();

authRouter
  .route("/clerk/webhook")
  .post(
    bodyParser.raw({ type: "application/json" }),
    ClerkWebhookController.UserSync
  );

export default authRouter;
