import authRouter from "./clerk-webhook.routes";

export default [
  { path: "clerk", router: authRouter },
  {
    path: "organization",
    router: "/organization",
  },
];
