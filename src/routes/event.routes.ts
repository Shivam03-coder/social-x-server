import { EventController } from "@src/controller/event.controller";
import { Router } from "express";
import { requireAuth } from "@clerk/express";

const eventRouter = Router();

eventRouter
  .route("/bytext")
  .get(requireAuth(), EventController.GetEventsbytext);

eventRouter
  .route("/send/invite/:orgId/:eventId")
  .post(requireAuth(), EventController.SendEventInvite);

eventRouter
  .route("/:orgId")
  .get(requireAuth(), EventController.GetEvents)
  .post(requireAuth(), EventController.CreateEvent);

eventRouter
  .route("/accept/invite/:orgId/:eventId")
  .post(EventController.AcceptEventInvite);

export default eventRouter;
