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
    httpOnly: boolean = true,
    options?: Record<string, any>
  ): void => {
    res.cookie(name, value, {
      httpOnly,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      ...options,
    });
  };
  public static setMultipleCookies = (
    res: Response,
    cookies: {
      name: string;
      value: string;
      httpOnly?: boolean;
      options?: Record<string, any>;
    }[]
  ): void => {
    cookies.forEach(({ name, value, httpOnly = false, options }) => {
      GlobalUtils.setCookie(res, name, value, httpOnly, options);
    });
  };
  public static getImageUrl = async (req: Request): Promise<string | null> => {
    try {
      if (req.file?.path) {
        const uploadedImage = await CloudinaryService.uploadImages(
          req.file.path
        );

        if (!uploadedImage) {
          throw new ApiError(500, "Image upload failed");
        }

        return uploadedImage as string;
      }

      return null;
    } catch (error: any) {
      throw new ApiError(
        500,
        error.message || "An error occurred while uploading the image"
      );
    }
  };
  public static clearMultipleCookies = (res:Response, cookieNames:string[]) => {
    cookieNames.forEach((name) => res.clearCookie(name));
  };
}
