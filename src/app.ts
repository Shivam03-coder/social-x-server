import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Server } from "http";
import { clerkMiddleware } from "@clerk/express";
import { appEnvConfigs } from "./configs";
import { ApiError } from "./utils/server-functions";
import routes from "./routes/index.routes";
import { inngest, functions } from "./libs/inngest";

interface AppOptions {
  port?: number;
}

class App {
  private readonly app: Application;
  private server?: Server;
  private readonly port: number;

  constructor(options?: AppOptions) {
    this.app = express();
    this.port = options?.port || Number(appEnvConfigs.PORT) || 3000;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandler();
  }

  private initializeMiddlewares(): void {
    // Basic security and logging middlewares
    this.app.use(helmet());
    this.app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
    this.app.use(morgan("common"));
    this.app.enable("trust proxy");

    // Body parsing and cookie handling~
    this.app.use(express.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    // Clerk auth middleware
    this.app.use(clerkMiddleware());

    // CORS
    this.app.use(
      cors({
        origin: appEnvConfigs.NEXT_APP_URI || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    this.app.options("*", cors());
  }
  private initializeRoutes(): void {
    routes.forEach((route) => {
      const fullPath = `/api/v1/${route.path}`;
      this.app.use(fullPath, route.router);
      console.log(`✅ Route registered: ${fullPath}`);
    });
  }

  private initializeErrorHandler(): void {
    this.app.use((err: ApiError, _req: any, res: any, _next: NextFunction) => {
      if (err instanceof ApiError) {
        return res.json({
          code: err.code,
          status: "failed",
          message: err.message,
        });
      }
    });
  }

  public listen(): void {
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 Server running on http://localhost:${this.port}`);
    });
  }

  public getAppInstance(): Application {
    return this.app;
  }

  public getServerInstance(): Server | undefined {
    return this.server;
  }
}

export default App;
