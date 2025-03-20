import { Router } from "express";
import { PostController } from "@src/controller/post.controller";
const postRouter = Router();
import { requireAuth } from "@clerk/express";
postRouter
  .route("/:orgId/event/:postId")
  .get(requireAuth(), PostController.GetPostById);

export default postRouter;
