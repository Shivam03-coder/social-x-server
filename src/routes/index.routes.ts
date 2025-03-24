import userRouter from "./user.routes";
import eventRouter from "./event.routes";
import organizationRouter from "./organization.routes";
import postRouter from "./post.routes";
import authRouter from "./auth.routes";
import adminRouter from "./admin.routes";

export default [
  { path: "user", router: userRouter },
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
  {
    path: "auth",
    router: authRouter,
  },
  {
    path: "admin",
    router: adminRouter,
  },
];
