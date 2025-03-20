import { AuthController } from "@src/controller/auth.controller";
import bodyParser from "body-parser";
import { Router } from "express";
const authRouter = Router();
import { requireAuth } from "@clerk/express";
import { upload } from "@src/middleware/multer.middleware";
authRouter
  .route("/clerk/webhook")
  .post(bodyParser.raw({ type: "application/json" }), AuthController.UserSync);

authRouter.route("/userinfo").get(AuthController.UserInfo);

authRouter.route("/users").get(requireAuth(), AuthController.UsersByRole);
authRouter
  .route("/media")
  .post(requireAuth(), upload.single("media"), AuthController.GetMediaUrl);

export default authRouter;
