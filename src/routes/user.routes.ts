import { UserController } from "@src/controller/user.controller";
import bodyParser from "body-parser";
import { Router } from "express";
const userRouter = Router();
import { requireAuth } from "@clerk/express";
userRouter
  .route("/clerk/webhook")
  .post(bodyParser.raw({ type: "application/json" }), UserController.UserSync);

userRouter.route("/userinfo").get(requireAuth(), UserController.UserInfo);

userRouter.route("/usersbyrole").get(requireAuth(), UserController.UsersByRole);

userRouter.route("/notifications").get(requireAuth(), UserController.Notifications);
userRouter.route("/weeklyevents").get(requireAuth(), UserController.EvnetsJoinedWeeklyStats);

export default userRouter;
