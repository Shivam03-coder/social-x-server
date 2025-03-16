import authRouter from "./clerk-webhook.routes";
import organizationRouter from "./organization.routes";

export default [
  { path: "clerk", router: authRouter },
  {
    path: "organization",
    router: organizationRouter,
  },
];
