import { Request } from "express";
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
}
