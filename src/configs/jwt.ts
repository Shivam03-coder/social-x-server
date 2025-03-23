import passport from "passport";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from "passport-jwt";
import { appEnvConfigs } from "@src/configs";
import { db } from "@src/db";
import { JwtPayload } from "@src/types/types";

const { ACCESS_TOKEN_SECRET_KEY } = appEnvConfigs;

if (!ACCESS_TOKEN_SECRET_KEY) {
  throw new Error(
    "ACCESS_TOKEN_SECRET_KEY is not defined in environment variables"
  );
}

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: ACCESS_TOKEN_SECRET_KEY,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload: JwtPayload, done) => {
    try {
      if (!jwtPayload || !jwtPayload.id) {
        return done(null, false, { message: "Invalid token payload" });
      }

      const user = await db.user.findUnique({
        where: { id: jwtPayload.id },
        select: {
          id: true,
          role: true,
          email: true,
        },
      });

      if (!user) {
        return done(null, false, { message: "User not found" });
      }

      return done(null, {
        id: user.id,
        role: user.role,
        email: user.email,
      });
    } catch (error) {
      console.error("Passport JWT Strategy Error:", error);
      return done(error as Error, false);
    }
  })
);

export { passport };
