import authRouter from "./clerk-webhook.routes";
import eventRouter from "./event.routes";
import organizationRouter from "./organization.routes";
import postRouter from "./post.routes";

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
  {
    path: "posts",
    router: postRouter,
  },
];
