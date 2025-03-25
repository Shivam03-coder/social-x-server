import { Router } from "express";
import { ParticipantController } from "@src/controller/participant.controller";
import { requireAuth } from "@src/middleware/auth.middleware";
import { EventController } from "@src/controller/event.controller";

const participantRouter = Router();
const eventRouter = Router();

eventRouter
  .get("/participants", requireAuth(), EventController.GetAllClientsWithEvents)
  .post("/create/:clientId", requireAuth(), EventController.CreateEvent)
  .delete("/event/:eventId", requireAuth(), EventController.DeleteEvent);

export { participantRouter, eventRouter };
