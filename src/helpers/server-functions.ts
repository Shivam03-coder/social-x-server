import { Request, Response, NextFunction } from "express";

//  AsyncHandler

export const AsyncHandler = (
  asyncFunction: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await asyncFunction(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

//API ERROR FUNCTION

export class ApiError extends Error {
  code: number;
  status: "failed" | "error";

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.status = code >= 400 && code < 500 ? "failed" : "error";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

//API RESPOSNE FUNCTION

export class ApiResponse<T = any> {
  code: number;
  status: "success" | "failed";
  message: string;
  result?: T;

  constructor(code: number, message: string, result?: T) {
    this.code = code;
    this.status = code >= 200 && code < 300 ? "success" : "failed";
    this.message = message;
    this.result = result;
  }
}
