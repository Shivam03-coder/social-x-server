import { Router } from "express";
import { UserAuthController } from "@src/controller/auth.controller";
import { upload } from "@src/middleware/multer.middleware";
import { requireAuth } from "@src/middleware/auth-middleware";
const authRouter = Router();

authRouter
  .route("/sign-up")
  .post(upload.single("profile"), UserAuthController.UserSignup);

authRouter.route("/sign-in").post(UserAuthController.UserSignin);
authRouter.route("/user-info").get(requireAuth(), UserAuthController.UserInfo);

export default authRouter;
