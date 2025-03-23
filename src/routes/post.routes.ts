import { Router } from "express";
import { PostController } from "@src/controller/post.controller";
const postRouter = Router();
import { requireAuth } from "@clerk/express";
import { upload } from "@src/middleware/multer.middleware";
postRouter
  .route("/:orgId/event/:postId")
  .post(requireAuth(), PostController.UpdatePost);

postRouter
  .route("/media")
  .post(requireAuth(), upload.single("media"), PostController.GetMediaUrl);

postRouter
  .route("/post-details/:postId")
  .get(requireAuth(), PostController.GetPostById);

// Confirm post by client
postRouter
  .route("/confirm-client/:postId/")
  .post(PostController.ConfirmPostByClient);
postRouter
  .route("/comments/:postId")
  .post(requireAuth(), PostController.CreateComment)
  .get(requireAuth(), PostController.GetCommentsByPost);

postRouter
  .route("/comment/delete/:commentId")
  .delete(requireAuth(), PostController.DeleteComment);

export default postRouter;
