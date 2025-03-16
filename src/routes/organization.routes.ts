import { requireAuth } from "@clerk/express";
import { OrganizationController } from "@src/controller/organization.controller";
import decryptPayload from "@src/middleware/decrypt.middleware";
import { Router } from "express";

const organizationRouter = Router();

organizationRouter
  .route("/")
  .post(requireAuth(), decryptPayload, OrganizationController.CreateOrg);

export default organizationRouter;
