import { EventController } from "@src/controller/event.controller";
import { requireAuth } from "@src/middleware/auth-middleware";
import { Router } from "express";

const eventRouter = Router();

eventRouter
  .route("/bytext")
  .get(requireAuth(), EventController.GetEventsbytext);
eventRouter
  .route("/byeventId/:eventId")
  .get(requireAuth(), EventController.GetEventDetailsbyId);

eventRouter
  .route("/details")
  .get(requireAuth(), EventController.GetEventDetailsbyParticipantId);

eventRouter
  .route("/event/:orgId")
  .get(requireAuth(), EventController.GetEvents)
  .post(requireAuth(), EventController.CreateEvent);

eventRouter
  .route("/delete/:eventId/:orgId")
  .delete(requireAuth(), EventController.DeleteEvents);

export default eventRouter;
