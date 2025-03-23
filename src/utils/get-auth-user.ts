import { JwtPayload } from "@src/types/types";
import { ApiError } from "@src/utils/server-functions";
import { Request } from "express";

export const getAuthUser = (req: Request): JwtPayload => {
  const user = req.user as JwtPayload | undefined;

  if (!user) {
    throw new ApiError(401, "Unauthorized - User not authenticated");
  }

  return user;
};
