import { requireAuth } from "@clerk/express";
import { OrganizationController } from "@src/controller/organization.controller";
import decryptPayload from "@src/middleware/decrypt.middleware";
import { upload } from "@src/middleware/multer.middleware";
import { Router } from "express";

const organizationRouter = Router();

organizationRouter
  .route("/")
  .post(
    requireAuth(),
    upload.single("orgImage"),
    OrganizationController.CreateOrg
  )
  .get(requireAuth(), OrganizationController.GetOrgs);

export default organizationRouter;
