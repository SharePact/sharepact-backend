const http = require("http");
const socketIo = require("socket.io");
const { getUserFromToken } = require("../middleware/checkauth");
const Message = require("../models/message");
const inAppNotificationService = require("../notification/inapp");
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
      // In your setupSocketHandlers function

      socket.on(
        "send-message",
        async ({ room, msg: content, reply = null }) => {
          console.log(
            `received message in room ${room} from ${socket.user._id}: ${content}`
          );

          // Create the message in the database
          let msg = await Message.createMessage({
            content,
            sender: socket.user._id,
            group: room,
            reply,
          });

          // Populate the sender details before emitting the message
          msg = await msg.populate("sender", "username email avatarUrl");

          try {
            const updatedDoc = await YourModel.findOneAndUpdate(
              { _id: room }, // Filter (find the document)
              { $set: { updatedAt: Date.now() } }, // Update only the updatedAt field
              { new: true } // Return the updated document
            );
          } catch (error) {
            console.log("error updating group");
          }

          // Emit the message with the populated sender details
          this.io.to(room).emit("chat-message", {
            messages: {
              _id: msg._id,
              content: msg.content,
              sender: msg.sender, // Fully populated sender object
              group: msg.group,
              sentAt: msg.sentAt,
            },
            user: msg.sender, // Fully populated sender details
          });
// Extract the sender details and ensure they are added to the exempt list
const exemptUsers = [msg.sender._id.toString()];


          await inAppNotificationService.sendNotification({
            medium: "group",
            exemptUsers: [msg.sender._id],
            topicTokenOrGroupId: room,
            name: "messageReceived",
            userId: msg.sender._id.toString(),
           groupId: room,
            chatMessageId: msg._id.toString(),
          });
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

