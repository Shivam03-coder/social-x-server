import passport from "passport";
import { RequestHandler, Request } from "express";
import { ApiError } from "@src/utils/server-functions";
import { JwtPayload } from "jsonwebtoken";

export const requireAuth = (): RequestHandler => {
  return passport.authenticate("jwt", { session: false });
};

export const getAuthUser = (req: Request): JwtPayload => {
  const user = req.user as JwtPayload | undefined;

  if (!user) {
    throw new ApiError(401, "Unauthorized - User not authenticated");
  }

  return user;
};

