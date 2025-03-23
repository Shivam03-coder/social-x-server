import { ApiResponse } from "@src/utils/server-functions";
import { Request } from "express";
import { Router, RequestHandler } from "express";

namespace $Enums {
  export type Role = "Admin" | "Member" | "Client";
}

export type UserType = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
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
  notificationType:
    | "ADDED_TO_NEW_ORGANIZATION"
    | "ADDED_TO_NEW_EVENT"
    | "PUBLISHED_BY_ADMIN"
    | "NEW_EVENT_CREATED_BY_ADMIN"
    | "EVENT_CONFIRM_BY_CLIENT";
}
