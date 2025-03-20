import { Router } from "express";
import { PostController } from "@src/controller/post.controller";
const postRouter = Router();
import { requireAuth } from "@clerk/express";
import { upload } from "@src/middleware/multer.middleware";
postRouter
  .route("/:orgId/event/:postId")
  .get(requireAuth(), PostController.GetPostById)
  .post(requireAuth(), PostController.UpdatePost);

postRouter
  .route("/media")
  .post(requireAuth(), upload.single("media"), PostController.GetMediaUrl);

export default postRouter;
