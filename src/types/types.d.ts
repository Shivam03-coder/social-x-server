import { ApiResponse } from "@src/utils/server-functions";
import { Request } from "express";
import { Router, RequestHandler } from "express";

// declare global {
//   namespace Express {
//     interface User extends JwtPayload {}
//   }
// }

export interface JwtPayload {
  userId: string;
  role: string;
  email?: string;
}

export type UserType = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "CLIENT" | "MEMBER";
};

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
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
}

interface NotificationPayloadType {
  message: string;
}
