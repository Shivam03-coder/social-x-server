import { Router } from "express";
import { ParticipantController } from "@src/controller/participant.controller";
import { requireAuth } from "@src/middleware/auth.middleware";

const participantRouter = Router();

participantRouter
  .post("/", requireAuth(), ParticipantController.CreateParticipants)
  .get("/", requireAuth(), ParticipantController.GetAllParticipants)
  .delete("/:participantId", requireAuth(), ParticipantController.DeleteParticipant);
  
export default participantRouter;