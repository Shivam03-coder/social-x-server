import { OrganizationController } from "@src/controller/organization.controller";
import { requireAuth } from "@src/middleware/auth-middleware";
import { upload } from "@src/middleware/multer.middleware";
import { Router } from "express";

const organizationRouter = Router();

organizationRouter
  .route("/create/neworg")
  .post(
    requireAuth(),
    upload.single("orgImage"),
    OrganizationController.CreateOrg
  );

organizationRouter
  .route("/getorgs")
  .get(requireAuth(), OrganizationController.GetOrgs);

export default organizationRouter;
