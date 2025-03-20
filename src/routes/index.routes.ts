import authRouter from "./auth.routes";
import eventRouter from "./event.routes";
import organizationRouter from "./organization.routes";
import postRouter from "./post.routes";

export default [
  { path: "auth", router: authRouter },
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
