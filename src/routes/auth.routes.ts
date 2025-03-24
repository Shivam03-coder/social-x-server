import { Router } from "express";
import { UserAuthController } from "@src/controller/auth.controller";
import { requireAuth } from "@src/middleware/auth.middleware";
const authRouter = Router();
authRouter.route("/sign-up").post(UserAuthController.UserSignup);

authRouter.route("/sign-in").post(UserAuthController.UserSignin);
authRouter
  .route("/userinfo")
  .get(requireAuth(), UserAuthController.GetUserInfo);

export default authRouter;
