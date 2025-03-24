import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import AuthServices from "@src/services/auth";
import { getAuthUser } from "@src/utils/get-auth-user";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class UserAuthController {
  public static UserSignup = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { firstName, lastName, email, password } = req.body;
      if (!firstName || !lastName || !email || !password) {
        throw new ApiError(400, "All fields are required");
      }

      if (!AuthServices.isEmailValid(email)) {
        throw new ApiError(400, "Invalid email address");
      }

      const isEmailAlreadyExist = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (isEmailAlreadyExist) {
        throw new ApiError(400, "Email already exists");
      }

      const hashedPassword = await AuthServices.hashPassword(password);

      const newUser = await db.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      res
        .status(201)
        .json(new ApiResponse(201, "User created successfully", newUser));
    }
  );

  public static UserSignin = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
      }

      const user = await db.user.findFirst({
        where: { email },
        select: {
          id: true,
          role: true,
          password: true,
        },
      });

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const isPasswordCorrect = await AuthServices.verifyPassword(
        password,
        user.password
      );

      if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password");
      }

      const { sessionToken } = await AuthServices.generateTokens(user);

      GlobalUtils.setMultipleCookies(res, [
        { name: "sessionToken", value: sessionToken },
        { name: "UserRole", value: user.role },
        { name: "UserId", value: user.id },
      ]);

      res
        .status(200)
        .json(new ApiResponse(200, "UYou have beeb loged in  successfully"));
    }
  );

  public static ChangePassword = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, oldPassWord, newPassWord, role } = req.body;
      if (!email || !oldPassWord || !newPassWord) {
        throw new ApiError(400, "All fields are required");
      }

      const user = await db.user.findUnique({
        where: {
          email,
        },
      });
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const password = await AuthServices.verifyPassword(
        user.password,
        oldPassWord
      );
      if (!password) {
        throw new ApiError(401, "Incorrect password");
      }
      const hashedPassword = await AuthServices.hashPassword(newPassWord);
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json(new ApiResponse(200, "Password changed successfully"));
    }
  );

  public static GetUserInfo = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = getAuthUser(req);
      console.log("🚀 ~ UserAuthController ~ user:", user);
      res.json(new ApiResponse(200, "User info fetched successfully", user));
    }
  );
}
