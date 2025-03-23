import { Router } from "express";
import { UserAuthController } from "@src/controller/auth.controller";
import { upload } from "@src/middleware/multer.middleware";
import { requireAuth } from "@src/middleware/auth-middleware";
const authRouter = Router();

authRouter.route("/sign-up").post(UserAuthController.UserSignup);

authRouter.route("/sign-in").post(UserAuthController.UserSignin);

export default authRouter;
