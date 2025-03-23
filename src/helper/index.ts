import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  const hashpass = await bcrypt.hash(password, saltRounds);
  return hashpass;
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const isTokenExpired = (token: string | undefined): boolean => {
  if (!token) {
    return true;
  }

  const decodedToken = JWT.decode(token) as { exp?: number };

  if (!decodedToken || typeof decodedToken.exp !== "number") {
    return true;
  }

  const currentTime = Date.now() / 1000;

  return decodedToken.exp < currentTime;
};

export const options = {
  httpOnly: true,
  secure: true,
};

export const generateOtp = () => {
  const letters = "123456789";
  let otp = "";
  for (let i = 0; i < 4; i++) {
    otp += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return otp.toString();
};
