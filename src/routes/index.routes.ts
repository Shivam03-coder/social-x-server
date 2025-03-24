import authRouter from "./auth.routes";
import eventRouter from "./event.routes";
import participantRouter from "./participant.routes";

export default [
  {
    path: "auth",
    router: authRouter,
  },
  {
    path: "events",
    router: eventRouter,
  },
  // {
  //   path: "posts",
  //   router: postRouter,
  // },
  {
    path: "participants",
    router: participantRouter,
  },
];
