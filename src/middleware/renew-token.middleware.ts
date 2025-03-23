import { GlobalUtils } from "@src/global";
import { isTokenExpired, options } from "@src/helper";
import AuthServices from "@src/services/auth";
import { ApiError, AsyncHandler } from "@src/utils/server-functions";
import { NextFunction, Request, Response } from "express";

export const GetnewToken = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { accessToken, refreshToken } = req.cookies;

    if (!accessToken && !refreshToken) {
      throw new ApiError(401, "Unauthorized - Tokens not provided");
    }

    if (accessToken && !isTokenExpired(accessToken)) {
      req.headers["authorization"] = `Bearer ${accessToken}`;
      return next();
    }

    if (!refreshToken) {
      throw new ApiError(
        401,
        "Unauthorized - Refresh token is missing or invalid"
      );
    }

    const { newAccessToken, newRefreshToken } =
      await AuthServices.renewJwtTokens(refreshToken);

    req.headers["authorization"] = `Bearer ${newAccessToken}`;

    GlobalUtils.setMultipleCookies(res, [
      { name: "accessToken", value: newAccessToken, httpOnly: true },
      { name: "refreshToken", value: newRefreshToken, httpOnly: true },
    ]);

    next();
  }
);
