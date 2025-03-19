import { EventController } from "@src/controller/event.controller";
import { Router } from "express";
import { requireAuth } from "@clerk/express";

const eventRouter = Router();

eventRouter
  .route("/:orgId")
  .get(requireAuth(), EventController.GetEvents)
  .post(requireAuth(), EventController.CreateEvent);

eventRouter
  .route("/:orgId/event/:eventId")
  .post(requireAuth(), EventController.SendEventInvite);

// eventRouter
//   .route("/:orgId/event/:eventId/invite/:role/:email/accept")
//   .post(EventController.AcceptEventInvite);

export default eventRouter;
