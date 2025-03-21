import { appEnvConfigs } from "@src/configs";
import { Server as HTTPServer } from "http";
import { Server as SocketIoServer, Socket } from "socket.io";

let io: SocketIoServer;
export const initSocketIO = (server: HTTPServer) => {
  io = new SocketIoServer(server, {
    cors: {
      origin: appEnvConfigs.NEXT_APP_URI || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });

    socket.on("joinUserRoom", (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined personal room`);
    });
  });
};

export const NotifyUser = (userId: string, payload: any) => {
  io.to(userId).emit("notification", payload);
};
