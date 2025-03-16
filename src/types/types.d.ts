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
