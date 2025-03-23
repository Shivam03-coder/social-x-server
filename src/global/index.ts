import { Request, Response } from "express";
import { ApiError } from "@src/utils/server-functions";
import CloudinaryService from "@src/services/cloudinary";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";

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
    cookies.forEach(({ name, value, httpOnly = true, options }) => {
      GlobalUtils.setCookie(res, name, value, httpOnly, options);
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
