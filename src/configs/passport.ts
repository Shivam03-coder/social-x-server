import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import { appEnvConfigs } from "@src/configs";
import { db } from "@src/db";
import { JwtPayload } from "@src/types/types";

if (!appEnvConfigs.SESSION_TOKEN_KEY) {
  throw new Error("ACCESS_TOKEN_SECRET_KEY is not defined in environment");
}

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: appEnvConfigs.SESSION_TOKEN_KEY,
};

passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done) => {
    try {
      const user = await db.user.findUnique({
        where: { id: jwtPayload.userId },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        return done(null, false, { message: "User not found" });
      }

      return done(null, {
        userId: user.id,
        role: user.role,
      });
    } catch (error) {
      console.error("Error in Passport JWT Strategy:", error);
      return done(error, false);
    }
  })
);

export { passport };
