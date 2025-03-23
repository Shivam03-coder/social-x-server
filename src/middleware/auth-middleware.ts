import passport from "passport";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { GlobalUtils } from "@src/global";
import { isTokenExpired } from "@src/helper";
import AuthServices from "@src/services/auth";
import { ApiError } from "@src/utils/server-functions";

interface user {
  id: string;
  email: string;
  role: "ADMIN" | "CLIENT" | "MEMBER";
}

export const requireAuth = (): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken } = req.cookies;

      if (!accessToken && !refreshToken) {
        throw new ApiError(401, "Unauthorized - Tokens not provided");
      }

      let tokenToUse = accessToken;

      if (accessToken && !isTokenExpired(accessToken)) {
        req.headers["authorization"] = `Bearer ${accessToken}`;
      }

      if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
        const { newAccessToken, newRefreshToken } =
          await AuthServices.renewJwtTokens(refreshToken);

        GlobalUtils.setMultipleCookies(res, [
          { name: "accessToken", value: newAccessToken, httpOnly: true },
          { name: "refreshToken", value: newRefreshToken, httpOnly: true },
        ]);

        tokenToUse = newAccessToken;
        req.headers["authorization"] = `Bearer ${newAccessToken}`;
      }

      passport.authenticate(
        "jwt",
        { session: false },
        (err: any, user: user, info: any) => {
          if (!user) {
            return next(new ApiError(401, "Unauthorized - Invalid token"));
          }

          req.user = user;
          next();
        }
      )(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
