const http = require("http");
const socketIo = require("socket.io");
const { getUserFromToken } = require("../middleware/checkauth");
const Message = require("../models/message");
class Messaging {
  constructor(app) {
    // this.server = http.createServer(app);
    // this.io = socketIo(this.server);
    this.io = socketIo(app, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "PUT", ""],
      },
      withCredentials: true,
    });

    // apply middlewares
    for (const middleware of this.middlewaresArray()) {
      this.io.use(middleware);
    }

    this.setupSocketHandlers();
  }

  middlewaresArray() {
    return [
      // Middleware for authentication
      async (socket, next) => {
        console.log("authenticating");
        const token =
          socket.handshake.auth.token || socket.handshake.headers.token;
        if (token) {
          const resp = await getUserFromToken(token);
          if (resp.error) {
            const err = new Error(resp.error.message);
            err.data = { statusCode: 401, message: resp.error.message };
            return next(err);
          } else {
            console.log("auth successful");
            socket.user = resp.user;
            next();
          }
        } else {
          const err = new Error("Authentication error");
          err.data = { statusCode: 401, message: err.message };
          return next(err);
        }
      },
    ];
  }

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("A user connected:", socket.user._id);

      // Join a room
      socket.on("join-group-chat", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
      });

      // Broadcast a message to a specific room when received
      socket.on(
        "send-message",
        async ({ room, msg: content, reply = null }) => {
          console.log(
            `received message in room ${room} from ${socket.user._id}: ${content}`
          );
          const msg = await Message.createMessage({
            content,
            sender: socket.user._id,
            group: room,
            reply,
          });
          this.io.to(room).emit("chat-message", { msg, user: socket.user });
        }
      );

      // get messages
      socket.on("get-messages", async ({ room, limit = 15, cursor = null }) => {
        const { messages, nextCursor } = await Message.getMessagesByGroup(
          room,
          limit,
          cursor
        );

        this.io.to(room).emit(`messages-${socket.user._id}`, {
          messages,
          nextCursor,
          user: socket.user,
        });
      });

      // Handle user disconnect
      socket.on("disconnect", () => {
        console.log("User disconnected");
      });
    });
  }
}

module.exports = Messaging;
