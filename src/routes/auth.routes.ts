import { AuthController } from "@src/controller/auth.controller";
import bodyParser from "body-parser";
import { Router } from "express";
const authRouter = Router();
import { requireAuth } from "@clerk/express";
authRouter
  .route("/clerk/webhook")
  .post(bodyParser.raw({ type: "application/json" }), AuthController.UserSync);

authRouter.route("/userinfo").get(AuthController.UserInfo);

authRouter.route("/users").get(requireAuth(), AuthController.UsersByRole);

export default authRouter;
