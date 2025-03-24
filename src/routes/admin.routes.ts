import { AdminController } from "@src/controller/admin.controller";
import { Router } from "express";
const adminRouter = Router();

adminRouter
  .route("/org/:orgId/event/:eventId/participants")
  .post(AdminController.CreateParticipants);


export default adminRouter;
