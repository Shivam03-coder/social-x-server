import { isTokenExpired, options } from "@src/helper";
import AuthServices from "@src/services/auth";
import { ApiError, AsyncHandler } from "@src/utils/server-functions";
import { NextFunction, Request, Response } from "express";

export const GetnewToken = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken } = req.cookies;

      if (!accessToken && !refreshToken) {
        throw new ApiError(401, "Unauthorized - Tokens not provided");
      }

      if (accessToken && !isTokenExpired(accessToken)) {
        req.headers["authorization"] = `Bearer ${accessToken}`;
      } else if (refreshToken) {
        // Renew tokens using refresh token
        const { newAccessToken, newRefreshToken } =
          await AuthServices.renewJwtTokens(refreshToken);

        // Update headers and set cookies
        req.headers["authorization"] = `Bearer ${newAccessToken}`;
        res
          .cookie("accessToken", newAccessToken, options)
          .cookie("refreshToken", newRefreshToken, options);
      } else {
        throw new ApiError(401, "Unauthorized - Refresh token is invalid");
      }
      next();
    } catch (error) {
      console.error("Error in GetnewToken middleware:", error); // Debug: Log error
      next(error);
    }
  }
);