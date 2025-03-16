import { Request, Response } from "express";
import { db } from "@src/db";
import { getAuth } from "@clerk/express";
import { ApiError } from "@src/utils/server-functions";

export class GlobalUtils {
  public static getDecryptedData = (decryptedData: any) => {
    if (!decryptedData) {
      throw new ApiError(400, "No decrypted data found");
    }
    return decryptedData;
  };

  public static checkUserId = async (req: Request) => {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  };

  public static setCookie = (
    res: Response,
    name: string,
    value: string,
    options?: {
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: boolean | "lax" | "strict" | "none";
      path?: string;
    }
  ) => {
    res.cookie(name, value, {
      httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
      sameSite: options?.sameSite || "strict",
      secure:
        options?.secure !== undefined
          ? options.secure
          : process.env.NODE_ENV === "production",
      path: options?.path || "/",
      maxAge:
        options?.maxAge !== undefined
          ? options.maxAge
          : 1000 * 60 * 60 * 24 * 45,
    });
  };

  public static setMultipleCookies = (
    res: Response,
    cookies: { name: string; value: string }[],
    options?: {
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: boolean | "lax" | "strict" | "none";
      path?: string;
    }
  ) => {
    cookies.forEach(({ name, value }) => {
      GlobalUtils.setCookie(res, name, value, options);
    });
  };
}
