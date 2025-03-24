import { ParticipantController } from "@src/controller/participant.controller";
import { requireAuth } from "@src/middleware/auth.middleware";
import { Router } from "express";
const participantRouter = Router();

participantRouter
  .route("/")
  .post(requireAuth(), ParticipantController.CreateParticipants);

export default participantRouter;
