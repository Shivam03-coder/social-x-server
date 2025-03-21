import { Server as HTTPServer } from "http";
import { Server as SocketIoServer, Socket } from "socket.io";

let io: SocketIoServer;

interface NotificationPayload {
  title: string;
  message: string;
}

class SocketServices {
  public static InitSocketIO = (server: HTTPServer) => {
    io = new SocketIoServer(server, {
      cors: {
        origin: "http://localhost:3000",
        credentials: true,
      },
      transports: ["websocket"],
    });

    io.on("connection", (socket) => {
      console.log(`✅ Socket connected: ${socket.id}`);
      socket.on("joinUserRoom", (userId) => {
        console.log(`User ${userId} joined their room`);
        socket.join(userId);
      });

      socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      });
    });
  };

  public static NotifyUser = (userId: string, payload: NotificationPayload) => {
    if (!io) {
      console.error("❌ Socket.io server not initialized!");
      return;
    }
    io.to(userId).emit("notification", payload);
  };
}

export default SocketServices;
