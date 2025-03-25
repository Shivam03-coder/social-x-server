import { Request, Response, NextFunction, RequestHandler } from "express";
import AuthServices from "@src/services/auth";
import { ApiError } from "@src/utils/server-functions";
import { User } from "@src/types/types";

export const requireAuth = (): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionToken } = req.cookies;

      if (!sessionToken) {
        throw new ApiError(401, "Unauthorized - Token not provided");
      }

      const session = await AuthServices.findSessionByToken(sessionToken, res);

      if (!session) {
        throw new ApiError(401, "Session not found");
      }

      const user: User = {
        id: session.id,
        role: session.role,
      };
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};
