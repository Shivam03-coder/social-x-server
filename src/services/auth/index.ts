import { appEnvConfigs } from "@src/configs";
import { db } from "@src/db";
import bcrypt from "bcryptjs";
import { UserType } from "@src/types/types";
import { ApiError } from "@src/utils/server-functions";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  role: "ADMIN" | "CLIENT" | "MEMBER";
}

class AuthServices {
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

  public static generateTokens = async (
    registeredUser: UserType
  ): Promise<{ sessionToken: string }> => {
    const sessionSecret = appEnvConfigs.SESSION_TOKEN_KEY;

    if (!sessionSecret) {
      throw new ApiError(409, "Session keys are not properly configured");
    }

    await db.session.deleteMany({
      where: {
        userId: registeredUser.id,
      },
    });

    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    console.log("🚀 ~ AuthServices ~ rawSessionToken:", rawSessionToken)

    await db.session.create({
      data: {
        sessionKey: rawSessionToken,
        userId: registeredUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    return {
      sessionToken: rawSessionToken,
    };
  };

  public static findSessionByToken = async (
    rawSessionToken: string
  ): Promise<SessionUser | null> => {
    if (!rawSessionToken) return null;

    const session = await db.session.findUnique({
      where: {
        sessionKey: rawSessionToken,
      },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session || !session.user) {
      return null;
    }

    const now = new Date();
    if (now > session.expiresAt) {
      return null;
    }

    return {
      id: session.user.id,
      role: session.user.role,
    };
  };
}

export default AuthServices;
