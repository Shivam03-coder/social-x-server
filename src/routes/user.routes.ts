import { UserController } from "@src/controller/user.controller";
import { requireAuth } from "@src/middleware/auth-middleware";
import bodyParser from "body-parser";
import { Router } from "express";
const userRouter = Router();

userRouter.route("/userinfo").get(requireAuth(), UserController.UserInfo);

userRouter.route("/usersbyrole").get(requireAuth(), UserController.UsersByRole);

userRouter
  .route("/notifications")
  .get(requireAuth(), UserController.Notifications);
userRouter
  .route("/weeklyevents")
  .get(requireAuth(), UserController.EvnetsJoinedWeeklyStats);

export default userRouter;
