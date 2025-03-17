import authRouter from "./clerk-webhook.routes";
import eventRouter from "./event.routes";
import organizationRouter from "./organization.routes";

export default [
  { path: "clerk", router: authRouter },
  {
    path: "organization",
    router: organizationRouter,
  },
  {
    path: "events",
    router: eventRouter,
  },
];
