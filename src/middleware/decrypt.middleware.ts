import { ApiError, ApiResponse } from "@src/utils/server-functions";
import { NextFunction, Request, Response } from "express";
import CryptoJS from "crypto-js";
import { appEnvConfigs } from "@src/configs";
import { DecryptedRequest } from "@src/types/types";

const decryptPayload = (
  req: DecryptedRequest,
  res: Response,
  next: NextFunction
) => {
  const { payload } = req.body;
  if (!payload) throw new ApiError(400, `Missing encrypted payload`);
  try {
    const bytes = CryptoJS.AES.decrypt(
      payload,
      appEnvConfigs.ENCRYPTION_kEY as string
    );
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedData) throw new ApiError(400, "Failed to decrypt payload");

    req.decryptedData = JSON.parse(decryptedData);
    next();
  } catch (error) {
    throw new ApiError(400, "Invalid or corrupted payload");
  }
};

export default decryptPayload;
