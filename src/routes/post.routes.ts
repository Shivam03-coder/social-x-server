import { Router } from "express";
import { PostController } from "@src/controller/post.controller";
const postRouter = Router();
postRouter.route("/:orgId/event/:eventId").post(PostController.GetPosts);

export default postRouter;
