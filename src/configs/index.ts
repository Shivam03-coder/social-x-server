import { config } from "dotenv";
config();

export const appEnvConfigs = {
  PORT: process.env.PORT,
  AUTH_EMAIL: process.env.AUTH_EMAIL,
  AUTH_PASS: process.env.AUTH_PASS,
  NEXT_APP_URI: process.env.NEXT_APP_URI,
  SESSION_TOKEN_KEY: process.env.SESSION_TOKEN_KEY,
  ENCRYPTION_kEY: process.env.ENCRYPTION_kEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  AI_PUBLISHABLE_KEY: process.env.AI_PUBLISHABLE_KEY,
};
