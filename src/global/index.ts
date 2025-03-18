import { Request, Response } from "express";
import { ApiError } from "@src/utils/server-functions";
import CloudinaryService from "@src/services/cloudinary";

export class GlobalUtils {
  public static getDecryptedData = (decryptedData: any) => {
    if (!decryptedData) {
      throw new ApiError(400, "No decrypted data found");
    }
    return decryptedData;
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

  public static getImageUrl = async (req: Request) => {
    let imageUrl: string | null = null;
    if (req.file && req.file.path) {
      const uploadedImage = await CloudinaryService.uploadImages(req.file.path);
      if (!uploadedImage) {
        throw new ApiError(500, "Image upload failed");
      }
      return (imageUrl = uploadedImage as string);
    }
    return imageUrl;
  };
}
