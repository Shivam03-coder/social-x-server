import { ApiResponse } from "@src/utils/server-functions";
import { Request } from "express";
import { Router, RequestHandler } from "express";

namespace $Enums {
  export type Role = "Admin" | "Member" | "Client";
}

export type UserType = {
  id: string;
  email: string;
  password: string;
};

export interface DecryptedRequest extends Request {
  decryptedData?: any;
}

export interface SendInviteEmailOptions {
  emails: string[];
  orgId?: string;
  eventId?: string;
  role?: RoleType;
  invitationType: "ORGANIZATION" | "EVENT";
}

export interface UserType  {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
}
