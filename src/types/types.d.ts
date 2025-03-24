import { ApiResponse } from "@src/utils/server-functions";
import { Request } from "express";
import { Router, RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface User {
  id: string;
  role: "ADMIN" | "CLIENT" | "MEMBER";
}

export interface DecryptedRequest extends Request {
  decryptedData?: any;
}

export interface SendInviteEmailOptions {
  emails: string[];
  orgId?: string;
  eventId?: string;
  role?: "MEMBER" | "CLIENT";
  invitationType: "ORGANIZATION" | "EVENT";
}

export interface UserType {
  id: string;
  password: string;
  role: "ADMIN" | "CLIENT" | "MEMBER";
}

interface NotificationPayloadType {
  message: string;
}
