import { OrganizationController } from "@src/controller/organization.controller";
import { requireAuth } from "@src/middleware/auth-middleware";
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

organizationRouter
  .route("/invitations/:orgId")
  .post(requireAuth(), OrganizationController.SendOrgInvitations);

// NOT A PROTECTED ROUTE
organizationRouter
  .route("/invitations/accept/:orgId/:role/:email")
  .post(requireAuth(), OrganizationController.AcceptOrgInvitation);

// GetOrgMembers
organizationRouter
  .route("/member")
  .get(requireAuth(), OrganizationController.GetOrganizationByMemberid);

// Delete Orgs
organizationRouter
  .route("/:orgId")
  .delete(requireAuth(), OrganizationController.DeleteOrganizationByid);

export default organizationRouter;
