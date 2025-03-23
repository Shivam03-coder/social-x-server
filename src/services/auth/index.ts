import { appEnvConfigs } from "@src/configs";
import { db } from "@src/db";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { UserType } from "@src/types/types";
import { ApiError } from "@src/utils/server-functions";

class AuthServices {
  public static generateTokens = (
    registeredUser: UserType
  ): { accessToken: string; refreshToken: string } => {
    const accessTokenSecret = appEnvConfigs.ACCESS_TOKEN_SECRET_KEY;
    const refreshTokenSecret = appEnvConfigs.REFRESH_TOKEN_SECRET_KEY;

    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new ApiError(409, "Token signing keys are not properly configured");
    }

    const signToken = (key: string, expiresIn: string): string =>
      jwt.sign(
        {
          userId: registeredUser.id,
          email: registeredUser.email,
          role: registeredUser.role,
        },
        key as Secret,
        { expiresIn } as SignOptions
      );

    return {
      accessToken: signToken(accessTokenSecret, "4d"),
      refreshToken: signToken(refreshTokenSecret, "12d"),
    };
  };

  public static renewJwtTokens = async (
    oldRefreshToken: string
  ): Promise<{ newAccessToken: string; newRefreshToken: string }> => {
    try {
      const authenticatedUser = await db.token.findUnique({
        where: {
          refreshToken: oldRefreshToken,
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
              role: true,
            },
          },
        },
      });

      if (!authenticatedUser) {
        throw new ApiError(409, "Please login again");
      }

      const refreshTokenSecret = appEnvConfigs.REFRESH_TOKEN_SECRET_KEY;

      if (!refreshTokenSecret) {
        throw new ApiError(500, "Refresh token secret key is missing");
      }

      // Verify the old refresh token
      try {
        jwt.verify(oldRefreshToken, refreshTokenSecret);
      } catch (err) {
        throw new ApiError(409, "Invalid refresh token, please login again");
      }

      const { user } = authenticatedUser;

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Generate new tokens
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        AuthServices.generateTokens(user);

      // Update the refresh token in the database
      await db.token.update({
        where: { refreshToken: oldRefreshToken },
        data: { refreshToken: newRefreshToken },
      });

      return { newAccessToken, newRefreshToken };
    } catch (err: any) {
      throw new ApiError(500, err.message || "Unexpected error occurred");
    }
  };

  public static isEmailValid = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  public static hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    const hashpass = await bcrypt.hash(password, saltRounds);
    return hashpass;
  };

  public static verifyPassword = async (
    password: string,
    hashedPassword: string
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
  };

  public static isTokenExpired = (token: string | undefined): boolean => {
    if (!token) {
      return true;
    }

    const decodedToken = jwt.decode(token) as { exp?: number };

    if (!decodedToken || typeof decodedToken.exp !== "number") {
      return true;
    }

    const currentTime = Date.now() / 1000;

    return decodedToken.exp < currentTime;
  };
}

export default AuthServices;
