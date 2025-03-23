import { db } from "@src/db";
import { GlobalUtils } from "@src/global";
import AuthServices from "@src/services/auth";
import {
  ApiError,
  ApiResponse,
  AsyncHandler,
} from "@src/utils/server-functions";
import { Request, Response } from "express";

export class UserAuthController {
  // SIGN UP
  public static UserSignup = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { firstName, lastName, email, password, role } = req.body;

      if (!firstName || !lastName || !email || !password) {
        throw new ApiError(400, "All fields are required");
      }

      if (!AuthServices.isEmailValid(email)) {
        throw new ApiError(400, "Invalid email address");
      }

      if (AuthServices.isWeakpassword(password)) {
        throw new ApiError(400, "Password is too weak");
      }

      const isEmailAlreadyExist = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (isEmailAlreadyExist) {
        throw new ApiError(400, "Email already exists");
      }

      const hashedPassword = await AuthServices.hashPassword(password);

      const userProfileImage = await GlobalUtils.getImageUrl(req);

      const newUser = await db.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          imageUrl: userProfileImage,
          role: role || "ADMIN",
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          role: true,
        },
      });

      res
        .status(201)
        .json(new ApiResponse(201, "User created successfully", newUser));
    }
  );

  // SIGN IN
  public static UserLogin = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
      }

      const registeredUser = await db.user.findFirst({
        where: { email },
      });

      if (!registeredUser) {
        throw new ApiError(404, "User not found");
      }

      const isPasswordCorrect = await AuthServices.verifyPassword(
        password,
        registeredUser.password
      );

      if (!isPasswordCorrect) {
        throw new ApiError(401, "Incorrect password");
      }

      const { accessToken, refreshToken } =
        AuthServices.generateTokens(registeredUser);

      GlobalUtils.setMultipleCookies(res, [
        { name: "accessToken", value: accessToken, httpOnly: true },
        { name: "refreshToken", value: refreshToken, httpOnly: true },
        { name: "userRole", value: registeredUser.role, httpOnly: false },
      ]);

      res.status(200).json(new ApiResponse(200, "Login successful"));
    }
  );
}
