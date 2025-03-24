import { Router } from "express";
import { EventController } from "@src/controller/event.controller";
import { requireAuth } from "@src/middleware/auth.middleware";

const eventRouter = Router();


eventRouter.get("/client", requireAuth(), EventController.GetAllClientsWithEvents);
eventRouter.post("/create/:clientId", requireAuth(), EventController.CreateEvent);

// /**
//  * 📌 Get Event by ID
//  * GET /events/:eventId
//  */
// eventRouter.get("/:eventId", requireAuth(), EventController.GetEventDetailsById);

// /**
//  * 👥 Get Events by Participant ID
//  * GET /events/participant
//  */
// eventRouter.get("/participant", requireAuth(), EventController.GetEventDetailsbyParticipantId);

// /**
//  * 🏢 Get & Create Events for an Organization
//  * GET /organizations/:orgId/events
//  * POST /organizations/:orgId/events
//  */
// eventRouter
//   .route("/organizations/:orgId/events")
//   .get(requireAuth(), EventController.GetEvents)
//   .post(requireAuth(), EventController.CreateEvent);

// /**
//  * ❌ Delete an Event
//  * DELETE /organizations/:orgId/events/:eventId
//  */
// eventRouter.delete(
//   "/organizations/:orgId/events/:eventId",
//   requireAuth(),
//   EventController.DeleteEvents
// );

export default eventRouter;
