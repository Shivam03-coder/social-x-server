import { EventController } from "@src/controller/event.controller";
import { Router } from "express";
import { requireAuth } from "@clerk/express";

const eventRouter = Router();

eventRouter
  .route("/:orgId")
  .get(requireAuth(), EventController.GetEvents)
  .post(requireAuth(), EventController.CreateEvent);

export default eventRouter;
